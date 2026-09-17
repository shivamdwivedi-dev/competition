'use strict';

/**
 * 4-WARRIORS | Asynchronous Audit Persistence Layer
 *
 * CRITICAL ARCHITECTURE RULE:
 * This logger MUST be completely non-blocking. Database latency or connection issues
 * must NEVER block or fail the atomic Redis Lua bid validation hot-path.
 */

const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Idle client error:', err.message);
  });
}

/**
 * Asynchronously persist bid record to PostgreSQL / Supabase audit table
 *
 * @param {Object} bidRecord
 * @param {string} bidRecord.auctionId
 * @param {string} bidRecord.bidderId
 * @param {number} bidRecord.amount
 * @param {string} bidRecord.status - 'ACCEPTED' | 'REJECTED'
 */
function recordBidAsync(bidRecord) {
  if (!pool) {
    // If DB is not configured yet (waiting on Arya), do not crash
    return;
  }

  const query = `
    INSERT INTO bids (auction_id, bidder_id, amount, status)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [
    bidRecord.auctionId,
    bidRecord.bidderId,
    bidRecord.amount,
    bidRecord.status,
  ];

  // Fire-and-forget: execute query without awaiting so HTTP response returns in sub-millisecond
  pool.query(query, values).catch((err) => {
    console.error('[PostgreSQL] Failed to persist audit bid:', err.message);
  });
}

module.exports = { recordBidAsync };
