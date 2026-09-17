--[[
  4-WARRIORS | SYNORA Hackathon
  ATOMIC BID VALIDATION SCRIPT
  ─────────────────────────────────────────────────────────────────────────────
  This script runs ATOMICALLY inside Redis via EVAL.
  No other command can interleave between these operations.
  This is the ONLY correct way to handle concurrent bids.

  KEYS[1]  = auction hash key       e.g. "auction:42"
  ARGV[1]  = bid amount             (string, will be cast to number)
  ARGV[2]  = bidder id              (string)
  ARGV[3]  = current unix timestamp (milliseconds, from Node)

  Returns a table:  { status, message, highestBid, highestBidder }
    status: "ACCEPTED" | "REJECTED"
]]--

local auctionKey   = KEYS[1]
local bidAmount    = tonumber(ARGV[1])
local bidderId     = ARGV[2]
local nowMs        = tonumber(ARGV[3])

-- ── 1. Read current auction state ──────────────────────────────────────────
local endTime      = tonumber(redis.call('HGET', auctionKey, 'endTime'))
local startTime    = tonumber(redis.call('HGET', auctionKey, 'startTime'))
local highestBid   = tonumber(redis.call('HGET', auctionKey, 'highestBid'))   or 0
local highestBidder = redis.call('HGET', auctionKey, 'highestBidder') or ''
local status        = redis.call('HGET', auctionKey, 'status')

-- ── 2. Validate auction exists ─────────────────────────────────────────────
if not endTime or not startTime then
  return { 'REJECTED', 'Auction not found', tostring(highestBid), highestBidder }
end

-- ── 3. Validate auction is active ─────────────────────────────────────────
if status ~= 'active' then
  return { 'REJECTED', 'Auction is not active (status: ' .. (status or 'nil') .. ')', tostring(highestBid), highestBidder }
end

-- ── 4. Validate auction has started ───────────────────────────────────────
if nowMs < startTime then
  return { 'REJECTED', 'Auction has not started yet', tostring(highestBid), highestBidder }
end

-- ── 5. Validate auction has not ended ─────────────────────────────────────
if nowMs > endTime then
  -- Auto-close the auction
  redis.call('HSET', auctionKey, 'status', 'ended')
  return { 'REJECTED', 'Auction has ended', tostring(highestBid), highestBidder }
end

-- ── 6. Validate bid amount is positive ────────────────────────────────────
if not bidAmount or bidAmount <= 0 then
  return { 'REJECTED', 'Bid amount must be positive', tostring(highestBid), highestBidder }
end

-- ── 7. Validate bid beats current highest ─────────────────────────────────
local minBid = highestBid + 1   -- must beat by at least $1
if bidAmount < minBid then
  return {
    'REJECTED',
    'Bid too low — must be at least ' .. tostring(minBid),
    tostring(highestBid),
    highestBidder
  }
end

-- ── 8. ACCEPT — update state atomically ───────────────────────────────────
redis.call('HSET', auctionKey, 'highestBid',    tostring(bidAmount))
redis.call('HSET', auctionKey, 'highestBidder', bidderId)
redis.call('HINCRBY', auctionKey, 'bidCount', 1)

return { 'ACCEPTED', 'Bid accepted', tostring(bidAmount), bidderId }
