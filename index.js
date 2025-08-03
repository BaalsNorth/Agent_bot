import { Telegraf } from 'telegraf';
import OpenAI from 'openai';

const botToken = process.env.BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

export function createBot() {
  if (!botToken) throw new Error('BOT_TOKEN env variable is required');
  if (!openaiKey) throw new Error('OPENAI_API_KEY env variable is required');

  const bot = new Telegraf(botToken);
  const openai = new OpenAI({ apiKey: openaiKey });

  bot.start((ctx) => ctx.reply('Привет! Отправьте текст или голосовое сообщение, и я отвечу.'));
  bot.help((ctx) => ctx.reply('Доступные команды: /start, /help'));

  bot.on('voice', async (ctx) => {
    try {
      const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const response = await fetch(fileLink.href);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], 'voice.ogg');

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1'
      });

      const text = transcription.text;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: text }]
      });

      ctx.reply(completion.choices[0].message.content.trim());
    } catch (err) {
      console.error(err);
      ctx.reply('Не удалось распознать голосовое сообщение.');
    }
  });

  bot.on('text', async (ctx) => {
    try {
      const message = ctx.message.text;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }]
      });
      ctx.reply(completion.choices[0].message.content.trim());
    } catch (err) {
      console.error(err);
      ctx.reply('Произошла ошибка при обращении к OpenAI.');
    }
  });

  return bot;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!botToken || !openaiKey) {
    console.error('BOT_TOKEN and OPENAI_API_KEY environment variables must be set');
    process.exit(1);
  }
  const bot = createBot();
  bot.launch().then(() => console.log('Bot started'));
}
