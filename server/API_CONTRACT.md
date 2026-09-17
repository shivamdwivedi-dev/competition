# 4-WARRIORS — Auction System API & Event Contract

This contract defines the interfaces for **Piyush (Frontend)**, **Arya (Backend/DB)**, and **Prince (QA/Testing)**.

---

## 1. REST Endpoints (Base URL: `http://localhost:3001`)

### Health Check
- **`GET /health`**
- **Response**: `200 OK`
  ```json
  { "status": "ok", "ts": 1789646506175 }
  ```

---

### Seed Auction (For Testing / Dev / Demo)
- **`POST /api/bids/seed`**
- **Payload**:
  ```json
  {
    "auctionId": "demo-1",
    "title": "Vintage Rolex Submariner",
    "durationMs": 3600000
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Auction seeded",
    "auction": {
      "id": "demo-1",
      "title": "Vintage Rolex Submariner",
      "status": "active",
      "highestBid": 0,
      "highestBidder": "",
      "bidCount": 0,
      "startTime": 1789646521820,
      "endTime": 1789650121817
    }
  }
  ```

---

### Get Auction State
- **`GET /api/bids/:auctionId`**
- **Response**: `200 OK`
  ```json
  {
    "id": "demo-1",
    "title": "Vintage Rolex Submariner",
    "status": "active",
    "highestBid": 750,
    "highestBidder": "arya",
    "bidCount": 3,
    "startTime": 1789646521820,
    "endTime": 1789650121817
  }
  ```
- **Errors**: `404 Not Found` if auction does not exist.

---

### Submit a Bid (Atomic Hot-Path)
- **`POST /api/bids`**
- **Payload**:
  ```json
  {
    "auctionId": "demo-1",
    "bidderId": "piyush",
    "amount": 800
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "status": "ACCEPTED",
    "message": "Bid accepted",
    "highestBid": 800,
    "highestBidder": "piyush",
    "auctionId": "demo-1",
    "bidderId": "piyush",
    "amount": 800,
    "ts": 1789646555740
  }
  ```
- **Rejected Response**: `400 Bad Request`
  ```json
  {
    "status": "REJECTED",
    "message": "Bid too low — must be at least 801",
    "highestBid": 800,
    "highestBidder": "piyush",
    "auctionId": "demo-1",
    "bidderId": "piyush",
    "amount": 750,
    "ts": 1789646555800
  }
  ```

---

## 2. Real-Time WebSocket Events (Socket.IO)

**Connecting to Socket.IO:**
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");
```

### Client -> Server: Join Auction Room
```javascript
socket.emit("auction:join", { auctionId: "demo-1" });
```

### Server -> Client: Initial State On Join
- **Event**: `"auction:state"`
- **Payload**: The complete auction object.

### Server -> Client: Real-Time Bid Broadcast (When Accepted)
- **Event**: `"bid:accepted"`
- **Payload**:
  ```json
  {
    "auctionId": "demo-1",
    "bidderId": "piyush",
    "amount": 800,
    "highestBid": 800,
    "highestBidder": "piyush",
    "ts": 1789646555740
  }
  ```

---

## 3. Persistent Audit Logging (Arya's PostgreSQL Table Contract)

```sql
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id VARCHAR(64) NOT NULL,
    bidder_id VARCHAR(64) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'ACCEPTED' or 'REJECTED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id, created_at DESC);
```
