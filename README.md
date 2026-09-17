# SYNORA PULSE — High-Concurrency Real-Time Auction System
## Team: 4-WARRIORS | Pitstop 01 — 18 Hours Hackathon
**Role Lead (Frontend/UI-UX)**: Piyush  
**Branch**: `frontend`

---

## 🚀 Overview
**SYNORA PULSE** is a high-performance, real-time bidding dashboard built for extreme concurrency and millisecond latency. Designed with a cyber-industrial dark aesthetic, it features real-time bid streaming, sub-millisecond status indicators, Web Audio acoustic feedback, and stress-test simulation controls for hackathon evaluators.

---

## ⚡ Tech Stack & Architecture
- **Framework**: React 19 (TypeScript)
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **Real-Time Layer**: Socket.IO Client (WebSockets + Polling fallback)
- **Audio Engine**: Web Audio API (Synthesized procedural sound effects — zero external assets)
- **State Management**: React Hooks (`useAuction`) with optimistic updates and Redis synchronization

---

## 🔌 API & Socket Interface Contracts (For Backend Integration)

### REST Endpoints
- `GET /api/auctions/:id` — Retrieve auction metadata and current state
- `GET /api/auctions/:id/bids` — Retrieve recent bid audit log (last 50 bids)
- `POST /api/auctions/:id/bid` — Submit a bid `{ amount, bidderId, bidderName, timestamp }`
- `GET /api/telemetry` — System health metrics `{ bidsPerSecond, activeSockets, averageLatencyMs, redisThroughput }`

### Socket.IO Real-Time Events

#### Server -> Client Events (Listened by Frontend):
- `highestBidUpdated` — Emitted whenever a new highest bid is locked in Redis
  ```json
  {
    "auctionId": "auction-synora-01",
    "highestBid": 7500,
    "highestBidderId": "usr-123",
    "highestBidderName": "WarriorPiyush",
    "totalBids": 39,
    "timestamp": 1726588200000
  }
  ```
- `bidAccepted` — New valid bid record added to live audit trail
- `bidRejected` — Rejection details `{ reason, attemptedBid, currentHighest }`
- `auctionEnded` — Winner declaration `{ auctionId, winnerId, winnerName, winningBid }`
- `systemMetrics` — Telemetry stream `{ bidsPerSecond, activeSockets, averageLatencyMs, redisThroughput }`
- `pong_server` — Latency ping response

#### Client -> Server Events (Emitted by Frontend):
- `joinAuction` — Room subscription `(auctionId)`
- `placeBid` — High-speed atomic bid submission with callback acknowledgement
- `ping_server` — Telemetry ping `({ clientTime })`

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` (already templated in `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_DEFAULT_AUCTION_ID=auction-synora-01
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🎮 Hackathon Evaluator & Demo Features
- **1-Click Rapid Bidding**: Automatically bids minimum increment with one click.
- **Built-in Concurrency Simulator**: Toggle high-frequency automated bots (120+ ops/sec) directly from the UI toolbar to demo performance under load even before the backend server is running.
- **Anti-Sniping Countdown**: Dynamic countdown timer with auto-extension trigger (+2 Min).
- **Audio Feedback**: Procedural sound synthesis on bids, outbids, and gavel strike.
- **User Switching**: Test multi-client outbid scenarios from a single browser session.
