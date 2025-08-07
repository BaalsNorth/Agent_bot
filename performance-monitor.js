#!/usr/bin/env node

/**
 * Performance monitoring script for the Telegram bot
 * Run with: node performance-monitor.js
 */

import { performance } from 'perf_hooks';
import { createBot } from './index.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: [],
      memorySnapshots: [],
      errors: [],
      cacheStats: { hits: 0, misses: 0 }
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Memory monitoring every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memorySnapshots.push({
        timestamp: Date.now(),
        ...memUsage
      });
      
      // Keep only last 100 snapshots
      if (this.metrics.memorySnapshots.length > 100) {
        this.metrics.memorySnapshots.shift();
      }
    }, 30000);

    // Performance report every 5 minutes
    setInterval(() => {
      this.generateReport();
    }, 5 * 60 * 1000);

    // GC monitoring
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const start = performance.now();
        originalGC();
        const duration = performance.now() - start;
        console.log(`GC completed in ${duration.toFixed(2)}ms`);
      };
    }
  }

  logRequest(type, duration, cached = false) {
    this.metrics.requests.push({
      timestamp: Date.now(),
      type,
      duration,
      cached
    });

    if (cached) {
      this.metrics.cacheStats.hits++;
    } else {
      this.metrics.cacheStats.misses++;
    }

    // Keep only last 1000 requests
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests.shift();
    }
  }

  logError(error, context) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      error: error.message,
      context
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  generateReport() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const recentRequests = this.metrics.requests.filter(r => now - r.timestamp < 5 * 60 * 1000);
    const recentMemory = this.metrics.memorySnapshots.slice(-10);

    const report = {
      uptime: `${(uptime / 1000 / 60).toFixed(2)} minutes`,
      totalRequests: this.metrics.requests.length,
      recentRequests: recentRequests.length,
      averageResponseTime: recentRequests.length > 0 
        ? `${(recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length).toFixed(2)}ms`
        : 'N/A',
      cacheHitRate: this.metrics.cacheStats.hits + this.metrics.cacheStats.misses > 0
        ? `${((this.metrics.cacheStats.hits / (this.metrics.cacheStats.hits + this.metrics.cacheStats.misses)) * 100).toFixed(2)}%`
        : 'N/A',
      memoryUsage: {
        current: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        average: recentMemory.length > 0 
          ? `${(recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length / 1024 / 1024).toFixed(2)} MB`
          : 'N/A'
      },
      recentErrors: this.metrics.errors.filter(e => now - e.timestamp < 5 * 60 * 1000).length,
      requestTypes: this.getRequestTypeStats(recentRequests)
    };

    console.log('\n=== PERFORMANCE REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('========================\n');

    return report;
  }

  getRequestTypeStats(requests) {
    const stats = {};
    requests.forEach(req => {
      if (!stats[req.type]) {
        stats[req.type] = { count: 0, totalTime: 0, cached: 0 };
      }
      stats[req.type].count++;
      stats[req.type].totalTime += req.duration;
      if (req.cached) stats[req.type].cached++;
    });

    Object.keys(stats).forEach(type => {
      stats[type].averageTime = `${(stats[type].totalTime / stats[type].count).toFixed(2)}ms`;
      stats[type].cacheRate = `${((stats[type].cached / stats[type].count) * 100).toFixed(2)}%`;
    });

    return stats;
  }

  // Method to be called from the main bot
  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
}

// Export for use in main application
export { PerformanceMonitor };

// Run standalone monitoring if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting performance monitoring...');
  const monitor = new PerformanceMonitor();
  
  // Keep the process alive
  setInterval(() => {
    // Just keep alive, monitoring runs in background
  }, 60000);
  
  process.on('SIGINT', () => {
    console.log('\nGenerating final performance report...');
    monitor.generateReport();
    process.exit(0);
  });
}