'use strict';
const Redis = require('ioredis');

const client = new Redis({
  host    : process.env.REDIS_HOST || 'localhost',
  port    : parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // Retry strategy — important under load test
  retryStrategy: (times) => {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 100, 2000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

client.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

client.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting…');
});

module.exports = client;
