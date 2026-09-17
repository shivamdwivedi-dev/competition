const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${REDIS_HOST}:${REDIS_PORT}`);
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

// Load the atomic Lua script for placing bids
const luaScriptPath = path.join(__dirname, '../scripts/place_bid.lua');
let placeBidScript = '';

try {
  placeBidScript = fs.readFileSync(luaScriptPath, 'utf8');
  redis.defineCommand('atomicPlaceBid', {
    numberOfKeys: 1,
    lua: placeBidScript,
  });
  console.log('[Redis] Atomic Lua script registered as "atomicPlaceBid"');
} catch (err) {
  console.error('[Redis] Failed to load place_bid.lua:', err.message);
}

module.exports = redis;
