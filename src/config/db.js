const { Pool } = require('pg');

let pool = null;
let isConnected = false;

// In-memory fallback if PostgreSQL / Supabase is not yet configured locally
const inMemoryStore = {
  auctions: new Map(),
  bidsAudit: [],
};

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', err.message);
  });
} else {
  console.warn('[PostgreSQL] DATABASE_URL not set in environment. Running in in-memory audit fallback mode.');
}

async function initDb() {
  if (!pool) return;

  try {
    const client = await pool.connect();
    isConnected = true;
    console.log('[PostgreSQL] Connected to persistent database.');

    // Create tables if they do not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        starting_price NUMERIC NOT NULL,
        current_highest_bid NUMERIC,
        highest_bidder VARCHAR(128),
        end_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bids_audit (
        id VARCHAR(64) PRIMARY KEY,
        auction_id VARCHAR(64) REFERENCES auctions(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bids_audit_auction_id ON bids_audit(auction_id);
    `);

    client.release();
    console.log('[PostgreSQL] Schema initialized (auctions, bids_audit tables ready).');
  } catch (err) {
    console.error('[PostgreSQL] Failed to initialize database schema:', err.message);
    console.warn('[PostgreSQL] Falling back to in-memory audit tracking until database is reachable.');
    isConnected = false;
  }
}

// Persist auction creation
async function persistAuction(auction) {
  inMemoryStore.auctions.set(auction.id, auction);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO auctions (id, title, starting_price, current_highest_bid, highest_bidder, end_time, created_at)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0))
         ON CONFLICT (id) DO UPDATE SET
           current_highest_bid = EXCLUDED.current_highest_bid,
           highest_bidder = EXCLUDED.highest_bidder;`,
        [
          auction.id,
          auction.title,
          auction.startingPrice,
          auction.startingPrice,
          null,
          auction.endTime,
          auction.createdAt || Date.now(),
        ]
      );
    } catch (err) {
      console.error(`[PostgreSQL] Async persistAuction error for ${auction.id}:`, err.message);
    }
  }
}

// Asynchronously record bid audit
async function persistBidAudit(bidRecord) {
  inMemoryStore.bidsAudit.push(bidRecord);

  if (pool && isConnected) {
    try {
      await pool.query(
        `INSERT INTO bids_audit (id, auction_id, user_id, amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))`,
        [
          bidRecord.id,
          bidRecord.auctionId,
          bidRecord.userId,
          bidRecord.amount,
          bidRecord.status,
          bidRecord.timestamp,
        ]
      );
    } catch (err) {
      console.error(`[PostgreSQL] Async persistBidAudit error for bid ${bidRecord.id}:`, err.message);
    }
  }
}

// Query audit records for an auction
async function getAuditBids(auctionId) {
  if (pool && isConnected) {
    try {
      const res = await pool.query(
        `SELECT id, auction_id, user_id, amount, status, created_at
         FROM bids_audit
         WHERE auction_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [auctionId]
      );
      return res.rows;
    } catch (err) {
      console.error(`[PostgreSQL] Failed to query audit bids for ${auctionId}:`, err.message);
    }
  }

  // Fallback to in-memory records
  return inMemoryStore.bidsAudit
    .filter((b) => b.auctionId === auctionId)
    .reverse()
    .slice(0, 100);
}

module.exports = {
  pool,
  initDb,
  persistAuction,
  persistBidAudit,
  getAuditBids,
  inMemoryStore,
};
