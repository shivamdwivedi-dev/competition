--[[
  Atomic Bid Placement Script for Redis
  Team: 4-WARRIORS
  Author: Arya Vardhan

  KEYS[1]: auction:{auctionId}
  ARGV[1]: userId (string)
  ARGV[2]: newBidAmount (number string)
  ARGV[3]: currentTimestampMs (number string)
  ARGV[4]: bidId (string)

  Returns: JSON string with { status, reason, currentBid, highestBidder, timestamp }
--]]

local auction_key = KEYS[1]
local user_id = ARGV[1]
local new_bid = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local bid_id = ARGV[4] or ""

-- 1. Check if auction exists
if redis.call("EXISTS", auction_key) == 0 then
    return cjson.encode({
        status = "REJECTED",
        reason = "AUCTION_NOT_FOUND",
        currentBid = 0,
        highestBidder = nil
    })
end

-- 2. Read auction state
local data = redis.call("HMGET", auction_key, "highest_bid", "highest_bidder", "end_time", "starting_price")
local raw_highest_bid = data[1]
local highest_bidder = data[2]
local end_time = tonumber(data[3])
local starting_price = tonumber(data[4]) or 0
local highest_bid = tonumber(raw_highest_bid) or 0

-- 3. Validate new bid input
local MAX_ALLOWED_BID = 10000000000 -- 1000 Crores maximum system limit
if not new_bid or new_bid <= 0 or new_bid > MAX_ALLOWED_BID then
    return cjson.encode({
        status = "REJECTED",
        reason = (new_bid and new_bid > MAX_ALLOWED_BID) and "BID_EXCEEDS_MAX_LIMIT" or "INVALID_BID",
        currentBid = highest_bid > 0 and highest_bid or starting_price,
        highestBidder = (highest_bidder and highest_bidder ~= "") and highest_bidder or nil
    })
end

-- 4. Check if auction has expired
if end_time and end_time > 0 and now >= end_time then
    return cjson.encode({
        status = "REJECTED",
        reason = "AUCTION_ENDED",
        currentBid = highest_bid > 0 and highest_bid or starting_price,
        highestBidder = (highest_bidder and highest_bidder ~= "") and highest_bidder or nil,
        endTime = end_time
    })
end

-- 5. Compare bid amount
-- If no bids placed yet, new_bid must be >= starting_price
-- If a bid was placed, new_bid must be strictly > highest_bid
if highest_bid > 0 then
    if new_bid <= highest_bid then
        return cjson.encode({
            status = "REJECTED",
            reason = "BID_TOO_LOW",
            currentBid = highest_bid,
            highestBidder = (highest_bidder and highest_bidder ~= "") and highest_bidder or nil
        })
    end
else
    if new_bid < starting_price then
        return cjson.encode({
            status = "REJECTED",
            reason = "BID_TOO_LOW",
            currentBid = starting_price,
            highestBidder = nil
        })
    end
end

-- 6. Atomically update highest bid & bidder in Redis
redis.call("HSET", auction_key,
    "highest_bid", tostring(new_bid),
    "highest_bidder", tostring(user_id),
    "last_bid_time", tostring(now)
)

-- 7. Add to recent bids list for this auction (keep last 100 for fast UI load)
local bid_record = cjson.encode({
    id = bid_id,
    userId = user_id,
    amount = new_bid,
    timestamp = now
})
redis.call("LPUSH", auction_key .. ":bids", bid_record)
redis.call("LTRIM", auction_key .. ":bids", 0, 99)

-- 8. Return accepted status
return cjson.encode({
    status = "ACCEPTED",
    currentBid = new_bid,
    highestBidder = user_id,
    timestamp = now
})
