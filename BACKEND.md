# Real-Time Bidding / Auction System — Backend Documentation

**Team:** 4-WARRIORS  
**Backend Engineer:** Arya Vardhan  
**Lead / Architect:** Shivam  
**Frontend:** Piyush  
**QA / Load Testing:** Prince  
**Branch:** `backend`

---

## 1. System Architecture

```
[ Frontend: React + Socket.IO Client ]
           │                    ▲
           │ REST APIs          │ Socket.IO ('bid:update')
           ▼                    │
 [ Node.js + Express Server ] ──┘
           │
           ├─── (HOT PATH: Atomic Concurrency) ──► [ Redis + Lua Script ]
           │
           └─── (COLD PATH: Async Audit Log)  ──► [ PostgreSQL / Supabase ]
```

- **Live State (Source of Truth):** Redis Hash `auction:{auctionId}`.
- **Concurrency Control:** Atomic Redis Lua script (`src/scripts/place_bid.lua`). Eliminates read-compare-write race conditions inside Redis single-threaded execution.
- **Audit / Cold Storage:** PostgreSQL tables `auctions` and `bids_audit`.
- **Reliability Trade-Off:** Redis commits the bid first. Database persistence runs asynchronously in the background. A database slow-query or network glitch does **not** block or roll back an accepted live bid.

---

## 2. REST API Endpoints

### 2.1. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "uptime": 12.4,
  "timestamp": 1773900000000
}
```

### 2.2. Create / Host Auction
`POST /api/auctions`

Accepts either `application/json` or `multipart/form-data` (with file upload under field `image`).

**Request Body (JSON example):**
```json
{
  "name": "Vintage Mechanical Watch",
  "startingPrice": 500,
  "duration": 300,
  "description": "Mint condition 1982 mechanical watch",
  "imageUrl": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  "userId": "user_host_shivam"
}
```
*(Also supports `title`, `durationSeconds`, or file upload with `FormData`)*

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "7b686d0b-2e92-48df-ba09-53e7d6929a59",
    "title": "Vintage Mechanical Watch",
    "name": "Vintage Mechanical Watch",
    "startingPrice": 500,
    "highestBid": 500,
    "highestBidder": null,
    "endTime": 1773900300000,
    "createdAt": 1773900000000,
    "timeRemainingMs": 300000,
    "isEnded": false,
    "imageUrl": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    "description": "Mint condition 1982 mechanical watch",
    "createdBy": "user_host_shivam"
  }
}
```

### 2.2.1. Standalone Image Upload (Optional)
`POST /api/auctions/upload`
- `multipart/form-data` with field `image`
- Response: `{ "success": true, "imageUrl": "/uploads/item-12345.jpg" }`

### 2.3. Get Auction Details & Live State
`GET /api/auctions/:id`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "7b686d0b-2e92-48df-ba09-53e7d6929a59",
    "title": "Vintage Mechanical Watch",
    "startingPrice": 500,
    "highestBid": 1200,
    "highestBidder": "user_shivam",
    "endTime": 1773900300000,
    "timeRemainingMs": 240000,
    "isEnded": false,
    "recentBids": [
      {
        "id": "...",
        "userId": "user_shivam",
        "amount": 1200,
        "timestamp": 1773900060000
      }
    ]
  }
}
```

### 2.4. List Active Auctions
`GET /api/auctions`

**Response (`200 OK`):**
```json
{
  "success": true,
  "count": 1,
  "data": [ ... ]
}
```

### 2.5. Place a Bid (Atomic Hot Path)
`POST /api/bids`

**Request Body:**
```json
{
  "auctionId": "7b686d0b-2e92-48df-ba09-53e7d6929a59",
  "userId": "user_piyush",
  "amount": 1500
}
```

**Response on Success (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "status": "ACCEPTED",
  "auctionId": "7b686d0b-2e92-48df-ba09-53e7d6929a59",
  "highestBid": 1500,
  "highestBidder": "user_piyush",
  "timestamp": 1773900100000
}
```

**Response on Rejection (`400 Bad Request` or `409 Conflict`):**
```json
{
  "success": false,
  "statusCode": 409,
  "status": "REJECTED",
  "reason": "BID_TOO_LOW",
  "currentBid": 1500,
  "highestBidder": "user_piyush",
  "timestamp": 1773900105000
}
```

**Possible Rejection Reasons:**
- `AUCTION_NOT_FOUND`: Auction ID does not exist in Redis.
- `AUCTION_ENDED`: Current timestamp >= `end_time`.
- `BID_TOO_LOW`: Submitted amount is less than or equal to current `highestBid` (or lower than `startingPrice`).
- `INVALID_BID`: Missing or non-positive bid amount.

---

## 3. Socket.IO Real-Time Feed (For Piyush & Frontend)

### Connecting
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");
```

### Joining an Auction Room
```javascript
socket.emit("join:auction", auctionId);
```

### Listening for Live Bid Updates
When any bidder's bid is accepted, the server immediately broadcasts:
```javascript
socket.on("bid:update", (data) => {
  console.log("New highest bid:", data);
  // data: { auctionId, highestBid, highestBidder, timestamp }
});
```

---

## 4. PostgreSQL / Supabase Schema

```sql
CREATE TABLE auctions (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  starting_price NUMERIC NOT NULL,
  current_highest_bid NUMERIC,
  highest_bidder VARCHAR(128),
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bids_audit (
  id VARCHAR(64) PRIMARY KEY,
  auction_id VARCHAR(64) REFERENCES auctions(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  amount NUMERIC NOT NULL,
  status VARCHAR(32) NOT NULL, -- e.g. 'ACCEPTED', 'REJECTED_BID_TOO_LOW'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_audit_auction_id ON bids_audit(auction_id);
```

---

## 5. Instructions for Prince (Load Testing)

- **Target Endpoint:** `POST /api/bids`
- **Concurrency Test Scenario:**
  1. Create an auction via `POST /api/auctions` with starting price 100.
  2. Spawn 100 concurrent workers sending bids between 101 and 1000 simultaneously.
  3. Verify that zero race conditions occur: only strictly monotonically increasing bids are accepted.
  4. Verify response latency on the hot path remains minimal.
