# 4-WARRIORS — SYNORA Auction Load & Concurrency Testing Suite
**Lead QA & Reliability Engineer:** Prince  
**Branch:** `ai-testing`  
**Problem:** Real-Time Bidding / Auction System Under Load  

---

## 1. Overview & Architecture

This testing framework is designed to verify the reliability, atomicity, and throughput of our real-time auction engine. It specifically stress-tests the **Redis Lua atomic bidding pipeline** under high concurrency to prove:
- **Zero race conditions** (no duplicate bids, no lost updates, no lower bids overwriting higher bids).
- **Zero invalid bids accepted** (negative, zero, lower, equal, expired, malformed).
- **Exact real throughput** (`completed requests / elapsed seconds`).
- **Sub-millisecond to low-millisecond response latency**.

> [!NOTE]
> **Benchmarking Disclaimer:**
> Any performance numbers measured against `mock-backend.js` are strictly for test-harness verification, pipeline validation, and race-detector demonstration. They do **not** represent the real performance of Arya's live Node.js + Express + Redis + PostgreSQL backend. Official performance numbers will be recorded only when the live backend is running.

---

## 2. Quick Start & Prerequisites

### Dependencies
- **Node.js (LTS v20+ or v24+)**: Zero external npm dependencies required! The entire test engine runs on pure Node.js (`http`, `perf_hooks`, `url`, `fs`).

### Testing Against the Mock Backend (Immediate Verification)
If the main Express/Redis backend is not running yet, you can test against the included atomic mock server:

1. **Terminal 1 — Start the Mock Server:**
   ```bash
   cd tester
   node mock-backend.js
   # Runs on http://localhost:4000
   ```

2. **Terminal 2 — Run any test:**
   ```bash
   cd tester
   node scenarios.js all
   ```

### Testing Against the Real Backend (Arya & Shivam's Server)
When the main server is running (default: `http://localhost:5000` or `http://localhost:3000`):
```bash
cd tester
node scenarios.js all --url http://localhost:5000/api/bids
```

---

## 3. Test Scenarios

| Scenario | Command | Reqs | Concurrency | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Test A — Normal Bidding** | `npm run test:normal` | 100 | 15 | Verify basic API connectivity, schema, and single-bidder flow. |
| **Test B — High Concurrency** | `npm run test:concurrency` | 1,000 | 100 | Stress-test connection pooling and rapid bid ingestion. |
| **Test C — 5,000 Stress Test** | `npm run test:stress` | 5,000 | 500 | Demonstrate the hackathon's peak load requirement. |
| **Test D — Race Condition** | `npm run test:race` | 1,000 | 200 | Interleaved bids on the *same* auction to prove Redis Lua atomicity. |
| **Test E — Invalid Bids** | `npm run test:invalid` | 200 | 20 | Injects negative, zero, lower, string, and missing-field bids. |
| **Test F — Auction Ended** | `npm run test:ended` | 100 | 20 | Injects bids on an expired auction to verify rejection. |
| **All Scenarios + Executive Summary** | `npm run test:all` | 7,400 | up to 500 | Runs the entire QA verification suite and outputs summary table. |

---

## 4. Custom Load Testing via CLI

You can run custom load tests with any combination of parameters:

```bash
node load-test.js \
  --url http://localhost:5000/api/bids \
  --auction auction-1 \
  --requests 5000 \
  --concurrency 500 \
  --starting-bid 100 \
  --bid-increment 10
```

### CLI Parameters
- `--url <url>`: Target bid endpoint (default: `http://localhost:4000/api/bids`)
- `--auction <id>`: Auction ID to target (default: `auction-1`)
- `--requests, -n <num>`: Total bids to send (default: `100`)
- `--concurrency, -c <num>`: Number of concurrent HTTP in-flight workers (default: `10`)
- `--starting-bid <num>`: Starting baseline bid amount (default: `100`)
- `--bid-increment <num>`: Increment per bid (default: `10`)
- `--user-prefix <str>`: Prefix for generated bidder IDs (default: `bidder`)
- `--scenario <name>`: `normal`, `high-concurrency`, `stress-5000`, `race-condition`, `invalid-bids`, `auction-ended`
- `--report-dir <path>`: Folder where JSON/TXT reports are stored (default: `./reports`)

---

## 5. How Metrics are Calculated

> [!IMPORTANT]
> **5,000 concurrent requests is NOT automatically 5,000 requests/sec.**
> Real throughput is strictly measured using high-resolution performance timers:
> $$\text{Throughput} = \frac{\text{Total Completed Requests}}{\text{Elapsed Seconds}}$$

- **Completed**: Total HTTP responses received (status code 200, 400, or 500).
- **Accepted**: Bids that beat the previous highest bid and were committed to Redis (`status: "ACCEPTED"`).
- **Rejected**: Bids safely rejected by business rules (`status: "REJECTED"`: bid too low, auction ended, invalid amount).
- **Errors**: Network connection drops, HTTP 500s, or request timeouts.
- **Latency**: Measured per request using `performance.now()` in milliseconds:
  - **Avg Latency**: Arithmetic mean of all request round-trips.
  - **P50 (Median)**: 50% of requests responded faster than this value.
  - **P95**: 95% of requests responded faster than this value (vital for SLAs).
  - **P99**: Tail latency representing worst-case performance under contention.

---

## 6. Race-Condition & Atomicity Verification

After each test run, the tester queries the backend state (`GET /api/bids/:auctionId`) and audits every response:
1. **Duplicate Check**: Verifies that no two bids were accepted for the exact same amount.
2. **Order Check**: Verifies that no accepted bid was ever lower than a previously accepted bid.
3. **State Desync Check**: Verifies that the backend's final highest bid in Redis matches the tester's highest accepted bid.

If any anomaly occurs, the tester logs:
`(! WARNING: RACE CONDITION DETECTED)` and prints the exact offending bid sequence.

### Demonstration Mode: Simulating the Race Condition Bug
To demonstrate to hackathon judges why Redis Lua is mandatory:
```bash
# Terminal 1 — Run mock server with non-atomic bug enabled:
node mock-backend.js --race-bug

# Terminal 2 — Run race condition test:
node scenarios.js d
```
You will see immediate race condition anomalies flagged, proving that without Redis Lua atomic scripts, concurrent bidding corrupts state!

---

## 7. Reports & Frontend Metrics Integration

Every test run automatically outputs three files in `tester/reports/`:
1. `load-test-<scenario>-<timestamp>.json`: Complete machine-readable results with latency percentiles and config.
2. `load-test-<scenario>-<timestamp>.txt`: Formatted ASCII summary table.
3. `latest-summary.json`: Latest aggregated metrics for **Piyush** to display in the frontend metrics dashboard:
   - `throughput`
   - `accepted` vs `rejected`
   - `avgLatency`
   - `finalHighestBid`
   - `raceConditionAnomaliesCount`
