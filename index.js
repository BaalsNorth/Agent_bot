import { Telegraf } from 'telegraf';
import OpenAI from 'openai';

// Performance optimizations
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window

// In-memory cache for responses (in production, use Redis)
const responseCache = new Map();
const rateLimitMap = new Map();

// Performance monitoring
const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  rateLimitHits: 0,
  errors: 0,
  averageResponseTime: 0,
  responseTimeHistory: []
};

const botToken = process.env.BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

// Helper functions for performance optimization
function getCacheKey(type, content) {
  return `${type}:${Buffer.from(content).toString('base64').slice(0, 50)}`;
}

function isRateLimited(userId) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Clean old requests
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    metrics.rateLimitHits++;
    return true;
  }
  
  validRequests.push(now);
  rateLimitMap.set(userId, validRequests);
  return false;
}

function updateMetrics(responseTime) {
  metrics.totalRequests++;
  metrics.responseTimeHistory.push(responseTime);
  
  // Keep only last 100 response times for average calculation
  if (metrics.responseTimeHistory.length > 100) {
    metrics.responseTimeHistory.shift();
  }
  
  metrics.averageResponseTime = metrics.responseTimeHistory.reduce((a, b) => a + b, 0) / metrics.responseTimeHistory.length;
}

function logPerformanceMetrics() {
  console.log('Performance Metrics:', {
    totalRequests: metrics.totalRequests,
    cacheHitRate: `${((metrics.cacheHits / metrics.totalRequests) * 100).toFixed(2)}%`,
    rateLimitHits: metrics.rateLimitHits,
    errors: metrics.errors,
    averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
    memoryUsage: process.memoryUsage()
  });
}

// Optimized voice processing with streaming and memory management
async function processVoiceMessage(ctx, openai) {
  const startTime = Date.now();
  
  try {
    const fileId = ctx.message.voice.file_id;
    const fileSize = ctx.message.voice.file_size;
    
    // Check file size limit
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error('Voice message too large');
    }
    
    // Check cache first
    const cacheKey = getCacheKey('voice', fileId);
    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        metrics.cacheHits++;
        updateMetrics(Date.now() - startTime);
        return cached.response;
      }
      responseCache.delete(cacheKey);
    }
    
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    
    if (!response.ok) {
      throw new Error(`Failed to download voice file: ${response.status}`);
    }
    
    // Stream processing to reduce memory usage
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], 'voice.ogg', { type: 'audio/ogg' });
    
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1'
    });
    
    const text = transcription.text;
    if (!text.trim()) {
      throw new Error('Empty transcription');
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: text }],
      max_tokens: 1000, // Limit response length for performance
      temperature: 0.7
    });
    
    const result = completion.choices[0].message.content.trim();
    
    // Cache the result
    responseCache.set(cacheKey, {
      response: result,
      timestamp: Date.now()
    });
    
    updateMetrics(Date.now() - startTime);
    return result;
    
  } catch (error) {
    metrics.errors++;
    updateMetrics(Date.now() - startTime);
    console.error('Voice processing error:', error);
    throw error;
  }
}

// Optimized text processing with caching
async function processTextMessage(message, openai) {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = getCacheKey('text', message);
    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        metrics.cacheHits++;
        updateMetrics(Date.now() - startTime);
        return cached.response;
      }
      responseCache.delete(cacheKey);
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }],
      max_tokens: 1000, // Limit response length for performance
      temperature: 0.7
    });
    
    const result = completion.choices[0].message.content.trim();
    
    // Cache the result
    responseCache.set(cacheKey, {
      response: result,
      timestamp: Date.now()
    });
    
    updateMetrics(Date.now() - startTime);
    return result;
    
  } catch (error) {
    metrics.errors++;
    updateMetrics(Date.now() - startTime);
    console.error('Text processing error:', error);
    throw error;
  }
}

export function createBot() {
  if (!botToken) throw new Error('BOT_TOKEN env variable is required');
  if (!openaiKey) throw new Error('OPENAI_API_KEY env variable is required');

  const bot = new Telegraf(botToken);
  const openai = new OpenAI({ 
    apiKey: openaiKey,
    timeout: 30000, // 30 second timeout
    maxRetries: 2 // Retry failed requests
  });

  // Performance monitoring middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    
    // Rate limiting
    if (userId && isRateLimited(userId)) {
      return ctx.reply('Пожалуйста, подождите немного перед следующим запросом.');
    }
    
    await next();
  });

  bot.start((ctx) => ctx.reply('Привет! Отправьте текст или голосовое сообщение, и я отвечу.'));
  bot.help((ctx) => ctx.reply('Доступные команды: /start, /help, /stats'));
  
  // Performance stats command
  bot.command('stats', (ctx) => {
    if (ctx.from?.id?.toString() === process.env.ADMIN_USER_ID) {
      const stats = {
        totalRequests: metrics.totalRequests,
        cacheHitRate: `${((metrics.cacheHits / Math.max(metrics.totalRequests, 1)) * 100).toFixed(2)}%`,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        uptime: `${(process.uptime() / 60).toFixed(2)} minutes`
      };
      ctx.reply(`Performance Stats:\n${JSON.stringify(stats, null, 2)}`);
    }
  });

  bot.on('voice', async (ctx) => {
    try {
      const result = await processVoiceMessage(ctx, openai);
      await ctx.reply(result);
    } catch (err) {
      console.error('Voice handler error:', err);
      if (err.message.includes('too large')) {
        ctx.reply('Голосовое сообщение слишком большое. Максимальный размер: 20MB.');
      } else if (err.message.includes('Empty transcription')) {
        ctx.reply('Не удалось распознать речь в голосовом сообщении.');
      } else {
        ctx.reply('Не удалось обработать голосовое сообщение. Попробуйте позже.');
      }
    }
  });

  bot.on('text', async (ctx) => {
    try {
      const message = ctx.message.text;
      
      // Skip if message is too long
      if (message.length > 4000) {
        return ctx.reply('Сообщение слишком длинное. Максимальная длина: 4000 символов.');
      }
      
      const result = await processTextMessage(message, openai);
      await ctx.reply(result);
    } catch (err) {
      console.error('Text handler error:', err);
      ctx.reply('Произошла ошибка при обращении к OpenAI. Попробуйте позже.');
    }
  });

  return bot;
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
  
  // Log metrics every 5 minutes
  logPerformanceMetrics();
}, 5 * 60 * 1000);

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!botToken || !openaiKey) {
    console.error('BOT_TOKEN and OPENAI_API_KEY environment variables must be set');
    process.exit(1);
  }
  
  const bot = createBot();
  
  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    logPerformanceMetrics();
    bot.stop('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down bot...');
    logPerformanceMetrics();
    bot.stop('SIGTERM');
    process.exit(0);
  });
  
  bot.launch().then(() => {
    console.log('Bot started with performance optimizations');
    logPerformanceMetrics();
  }).catch(err => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });
}
