/**
 * 4-WARRIORS | SYNORA 10-Hour Hackathon
 * High-Performance Bid Load Tester & Concurrency Verification Engine
 * QA / Reliability Engineer: Prince
 * 
 * Features:
 * - High-speed HTTP connection pooling (keep-alive)
 * - Worker-pool concurrency control
 * - Microsecond precision latency metrics (Min, Max, Avg, P50, P95, P99)
 * - Real throughput calculation: total_completed / elapsed_seconds
 * - Strict race-condition & atomicity verification
 * - JSON and ASCII report generation
 * - Zero external npm dependencies (pure Node.js)
 */

'use strict';

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// ── Parse CLI Arguments ──────────────────────────────────────────────────────
function parseArgs(args) {
  const options = {
    url: 'http://localhost:4000/api/bids',
    auctionId: 'auction-1',
    requests: 100,
    concurrency: 10,
    startingBid: 100,
    bidIncrement: 10,
    userPrefix: 'bidder',
    scenario: 'normal',
    reportDir: path.join(__dirname, 'reports'),
    quiet: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) options.url = args[++i];
    else if ((arg === '--auction' || arg === '--auctionId') && args[i + 1]) options.auctionId = args[++i];
    else if ((arg === '--requests' || arg === '-n') && args[i + 1]) options.requests = parseInt(args[++i], 10);
    else if ((arg === '--concurrency' || arg === '-c') && args[i + 1]) options.concurrency = parseInt(args[++i], 10);
    else if (arg === '--starting-bid' && args[i + 1]) options.startingBid = parseFloat(args[++i]);
    else if (arg === '--bid-increment' && args[i + 1]) options.bidIncrement = parseFloat(args[++i]);
    else if (arg === '--user-prefix' && args[i + 1]) options.userPrefix = args[++i];
    else if (arg === '--scenario' && args[i + 1]) options.scenario = args[++i];
    else if (arg === '--report-dir' && args[i + 1]) options.reportDir = args[++i];
    else if (arg === '--quiet') options.quiet = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Safety caps
  if (options.concurrency > options.requests) {
    options.concurrency = options.requests;
  }
  if (options.concurrency < 1) options.concurrency = 1;

  return options;
}

function printHelp() {
  console.log(`
SYNORA Auction Load Tester — 4-WARRIORS
Usage: node load-test.js [options]

Options:
  --url <url>             Target bid endpoint (default: http://localhost:4000/api/bids)
  --auction <id>          Target auction ID (default: auction-1)
  --requests, -n <num>    Total number of requests to generate (default: 100)
  --concurrency, -c <num> Number of concurrent workers (default: 10)
  --starting-bid <num>    Starting bid baseline (default: 100)
  --bid-increment <num>   Bid increment step (default: 10)
  --user-prefix <str>     Bidder username prefix (default: bidder)
  --scenario <name>       Preset scenario: normal, high-concurrency, stress-5000,
                          race-condition, invalid-bids, auction-ended (default: normal)
  --report-dir <path>     Directory to save reports (default: ./reports)
  --quiet                 Suppress per-batch progress logging
  -h, --help              Show this help message
`);
}

// ── Percentile Calculation Helper ───────────────────────────────────────────
function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;

  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    p50: parseFloat(p50.toFixed(2)),
    p95: parseFloat(p95.toFixed(2)),
    p99: parseFloat(p99.toFixed(2)),
  };
}

// ── HTTP Dispatcher with Connection Pooling ─────────────────────────────────
function createDispatcher(targetUrl, concurrency) {
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const clientLib = isHttps ? https : http;

  const agent = new clientLib.Agent({
    keepAlive: true,
    maxSockets: concurrency * 2,
    maxFreeSockets: concurrency,
    timeout: 30000,
  });

  function sendBid(payload) {
    return new Promise((resolve) => {
      const dataString = JSON.stringify(payload);
      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        agent: agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
          'Connection': 'keep-alive',
        },
      };

      const start = performance.now();
      const req = clientLib.request(reqOptions, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          const latency = performance.now() - start;
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(responseBody);
          } catch (e) {
            parsedBody = { raw: responseBody };
          }

          let outcome = 'UNKNOWN';
          if (parsedBody && parsedBody.status === 'ACCEPTED') {
            outcome = 'ACCEPTED';
          } else if (parsedBody && parsedBody.status === 'REJECTED') {
            outcome = 'REJECTED';
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            outcome = 'ACCEPTED';
          } else if (res.statusCode === 400) {
            outcome = 'REJECTED';
          } else {
            outcome = 'ERROR';
          }

          resolve({
            statusCode: res.statusCode,
            outcome,
            latency,
            data: parsedBody,
            sentPayload: payload,
            error: null,
          });
        });
      });

      req.on('error', (err) => {
        const latency = performance.now() - start;
        resolve({
          statusCode: 0,
          outcome: 'ERROR',
          latency,
          data: null,
          sentPayload: payload,
          error: err.message,
        });
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error('Request timeout'));
      });

      req.write(dataString);
      req.end();
    });
  }

  function fetchState(auctionId) {
    return new Promise((resolve) => {
      // Constructs GET /api/bids/:auctionId
      const basePath = parsed.pathname.replace(/\/+$/, '');
      const statePath = `${basePath}/${auctionId}`;
      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: statePath,
        method: 'GET',
        agent: agent,
        headers: { 'Connection': 'keep-alive' },
      };

      const req = clientLib.request(reqOptions, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  }

  return { sendBid, fetchState, agent };
}

// ── Generator for Payload Sequences based on Scenario ───────────────────────
function generatePayloads(options) {
  const { scenario, requests, auctionId, startingBid, bidIncrement, userPrefix } = options;
  const payloads = [];

  switch (scenario) {
    case 'race-condition': {
      // Generates bids designed to trigger race conditions:
      // High volume of ascending, duplicate, and slightly interleaved amounts
      for (let i = 0; i < requests; i++) {
        // Interleave small and medium increments
        const amount = startingBid + (i % 2 === 0 ? i + 1 : i);
        payloads.push({
          auctionId,
          bidderId: `${userPrefix}-${(i % 10) + 1}`,
          amount,
        });
      }
      break;
    }

    case 'invalid-bids': {
      // Systematically inject invalid and out-of-order bids
      for (let i = 0; i < requests; i++) {
        const type = i % 7;
        if (type === 0) {
          // Negative bid
          payloads.push({ auctionId, bidderId: `${userPrefix}-${i}`, amount: -50 });
        } else if (type === 1) {
          // Zero bid
          payloads.push({ auctionId, bidderId: `${userPrefix}-${i}`, amount: 0 });
        } else if (type === 2) {
          // Lower than starting
          payloads.push({ auctionId, bidderId: `${userPrefix}-${i}`, amount: startingBid - 20 });
        } else if (type === 3) {
          // Missing auctionId
          payloads.push({ bidderId: `${userPrefix}-${i}`, amount: startingBid + 50 });
        } else if (type === 4) {
          // Missing bidderId
          payloads.push({ auctionId, amount: startingBid + 50 });
        } else if (type === 5) {
          // Malformed amount (string)
          payloads.push({ auctionId, bidderId: `${userPrefix}-${i}`, amount: 'invalid-number' });
        } else {
          // Legitimate bid
          payloads.push({ auctionId, bidderId: `${userPrefix}-${i}`, amount: startingBid + i * bidIncrement });
        }
      }
      break;
    }

    case 'auction-ended': {
      // All bids targeted to an ended auction
      for (let i = 0; i < requests; i++) {
        payloads.push({
          auctionId: options.auctionId || 'auction-ended',
          bidderId: `${userPrefix}-${i}`,
          amount: startingBid + (i + 1) * bidIncrement,
        });
      }
      break;
    }

    case 'stress-5000':
    case 'high-concurrency':
    case 'normal':
    default: {
      // Ascending competitive bidding
      for (let i = 0; i < requests; i++) {
        const amount = startingBid + (i + 1) * bidIncrement;
        payloads.push({
          auctionId,
          bidderId: `${userPrefix}-${(i % 50) + 1}`,
          amount,
        });
      }
      break;
    }
  }

  return payloads;
}

// ── Main Load Test Runner ────────────────────────────────────────────────────
async function runLoadTest(options) {
  const { url: targetUrl, auctionId, requests, concurrency, scenario } = options;

  console.log(`\n========================================`);
  console.log(`SYNORA AUCTION LOAD TEST — 4-WARRIORS`);
  console.log(`========================================`);
  console.log(`Scenario:       ${scenario.toUpperCase()}`);
  console.log(`Target URL:     ${targetUrl}`);
  console.log(`Auction ID:     ${auctionId}`);
  console.log(`Total Requests: ${requests}`);
  console.log(`Concurrency:    ${concurrency}`);
  console.log(`Start Time:     ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  const dispatcher = createDispatcher(targetUrl, concurrency);

  // Pre-test state capture
  const preState = await dispatcher.fetchState(auctionId);
  if (preState) {
    console.log(`[Baseline] Current highest bid: ₹${preState.highestBid || 0} by ${preState.highestBidder || 'none'}`);
  }

  const payloads = generatePayloads(options);
  const results = [];
  const latencies = [];

  let completedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let errorCount = 0;

  const startTime = performance.now();

  // Concurrency Worker Pool
  let currentIndex = 0;

  async function worker(workerId) {
    while (true) {
      const index = currentIndex++;
      if (index >= payloads.length) break;

      const payload = payloads[index];
      const result = await dispatcher.sendBid(payload);
      results.push(result);
      latencies.push(result.latency);

      completedCount++;
      if (result.outcome === 'ACCEPTED') acceptedCount++;
      else if (result.outcome === 'REJECTED') rejectedCount++;
      else errorCount++;

      // Progress reporting every 10%
      if (!options.quiet && (completedCount % Math.max(1, Math.floor(requests / 10)) === 0 || completedCount === requests)) {
        const progress = ((completedCount / requests) * 100).toFixed(0);
        const curElapsed = (performance.now() - startTime) / 1000;
        const curThroughput = (completedCount / curElapsed).toFixed(0);
        process.stdout.write(`\rProgress: ${progress}% (${completedCount}/${requests}) | Rate: ~${curThroughput} req/s | Acc: ${acceptedCount} | Rej: ${rejectedCount} | Err: ${errorCount}`);
      }
    }
  }

  // Launch workers
  const workers = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(worker(w));
  }

  await Promise.all(workers);
  if (!options.quiet) process.stdout.write('\n');

  const endTime = performance.now();
  const elapsedMs = endTime - startTime;
  const elapsedSec = elapsedMs / 1000;

  // STRICT HACKATHON RULE:
  // throughput = total completed requests / elapsed seconds
  const actualThroughput = completedCount > 0 && elapsedSec > 0
    ? parseFloat((completedCount / elapsedSec).toFixed(2))
    : 0;

  const stats = calculatePercentiles(latencies);

  // Post-test state capture & anomaly inspection
  const postState = await dispatcher.fetchState(auctionId);
  dispatcher.agent.destroy();

  // ── Atomicity & Race Condition Anomaly Analysis ──────────────────────────
  const anomalies = [];
  let highestAcceptedBid = 0;
  let highestAcceptedBidder = '';
  const acceptedBidAmounts = new Set();

  // Filter and sort accepted bids by server timestamp to account for client network arrival jitter
  const acceptedBids = results
    .filter((r) => r.outcome === 'ACCEPTED' && r.data)
    .map((r) => ({
      amount: parseFloat(r.data.highestBid || r.sentPayload.amount),
      bidder: r.data.highestBidder || r.sentPayload.bidderId,
      ts: r.data.ts || 0,
    }))
    .sort((a, b) => (a.ts === b.ts ? a.amount - b.amount : a.ts - b.ts));

  let currentServerHighest = 0;
  for (const bid of acceptedBids) {
    // Check 1: Did we accept duplicate amounts?
    if (acceptedBidAmounts.has(bid.amount)) {
      anomalies.push(`DUPLICATE_ACCEPTED_BID: Bid ₹${bid.amount} accepted multiple times`);
    }
    acceptedBidAmounts.add(bid.amount);

    // Check 2: Did the server-accepted bid decrease over time? (Monotonicity violation)
    if (bid.amount < currentServerHighest) {
      anomalies.push(`OUT_OF_ORDER_ACCEPTANCE: Server accepted ₹${bid.amount} after reaching ₹${currentServerHighest}`);
    }

    if (bid.amount > highestAcceptedBid) {
      highestAcceptedBid = bid.amount;
      highestAcceptedBidder = bid.bidder;
    }
    currentServerHighest = Math.max(currentServerHighest, bid.amount);
  }

  // Check 3: Does the final backend state match the highest accepted bid?
  if (postState && postState.highestBid !== undefined) {
    if (acceptedCount > 0 && postState.highestBid !== highestAcceptedBid) {
      anomalies.push(`STATE_DESYNC: Backend final highest is ₹${postState.highestBid}, but tester recorded ₹${highestAcceptedBid}`);
    }
  }

  const successRate = completedCount > 0 ? parseFloat(((acceptedCount / completedCount) * 100).toFixed(2)) : 0;
  const rejectionRate = completedCount > 0 ? parseFloat(((rejectedCount / completedCount) * 100).toFixed(2)) : 0;
  const errorRate = completedCount > 0 ? parseFloat(((errorCount / completedCount) * 100).toFixed(2)) : 0;

  // ── Construct Structured Report ──────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    scenario,
    config: {
      url: targetUrl,
      auctionId,
      totalRequests: requests,
      concurrency,
    },
    counts: {
      totalRequests: requests,
      completed: completedCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      errors: errorCount,
    },
    performance: {
      elapsedSeconds: parseFloat(elapsedSec.toFixed(3)),
      elapsedMs: parseFloat(elapsedMs.toFixed(2)),
      actualThroughputReqPerSec: actualThroughput,
      avgLatencyMs: stats.avg,
      minLatencyMs: stats.min,
      maxLatencyMs: stats.max,
      p50LatencyMs: stats.p50,
      p95LatencyMs: stats.p95,
      p99LatencyMs: stats.p99,
      successRatePct: successRate,
      rejectionRatePct: rejectionRate,
      errorRatePct: errorRate,
    },
    verification: {
      finalHighestBid: postState ? postState.highestBid : highestAcceptedBid,
      finalHighestBidder: postState ? postState.highestBidder : highestAcceptedBidder,
      totalAcceptedUniqueBids: acceptedBidAmounts.size,
      raceConditionAnomaliesCount: anomalies.length,
      anomalies,
      atomicityStatus: anomalies.length === 0 ? 'PASSED_ATOMIC' : 'FAILED_RACE_DETECTED',
    },
  };

  // ── Format ASCII Terminal Output ─────────────────────────────────────────
  const formattedText = `
========================================
SYNORA AUCTION LOAD TEST RESULTS
========================================
Scenario:       ${scenario.toUpperCase()}
Requests:       ${report.counts.totalRequests}
Concurrency:    ${report.config.concurrency}
Completed:      ${report.counts.completed}

Accepted:       ${report.counts.accepted} (${report.performance.successRatePct}%)
Rejected:       ${report.counts.rejected} (${report.performance.rejectionRatePct}%)
Errors:         ${report.counts.errors} (${report.performance.errorRatePct}%)

Elapsed:        ${report.performance.elapsedSeconds} sec (${report.performance.elapsedMs} ms)
THROUGHPUT:     ${report.performance.actualThroughputReqPerSec} req/sec

Avg latency:    ${report.performance.avgLatencyMs} ms
Min latency:    ${report.performance.minLatencyMs} ms
Max latency:    ${report.performance.maxLatencyMs} ms
P50 latency:    ${report.performance.p50LatencyMs} ms
P95 latency:    ${report.performance.p95LatencyMs} ms
P99 latency:    ${report.performance.p99LatencyMs} ms

Final highest bid:
₹${report.verification.finalHighestBid} (Bidder: ${report.verification.finalHighestBidder})

Race-condition anomalies:
${report.verification.raceConditionAnomaliesCount} ${report.verification.raceConditionAnomaliesCount === 0 ? '(VERIFIED ATOMIC - ZERO ANOMALIES)' : '(! WARNING: RACE CONDITION DETECTED)'}
========================================
`;

  console.log(formattedText);

  if (anomalies.length > 0) {
    console.log('ANOMALY BREAKDOWN:');
    anomalies.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log('========================================\n');
  }

  // ── Write Reports to Disk ────────────────────────────────────────────────
  try {
    if (!fs.existsSync(options.reportDir)) {
      fs.mkdirSync(options.reportDir, { recursive: true });
    }

    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(options.reportDir, `load-test-${scenario}-${safeTimestamp}.json`);
    const txtPath = path.join(options.reportDir, `load-test-${scenario}-${safeTimestamp}.txt`);
    const latestPath = path.join(options.reportDir, 'latest-summary.json');

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(txtPath, formattedText);
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    console.log(`[Reports Saved]`);
    console.log(`JSON Report: ${jsonPath}`);
    console.log(`Text Report: ${txtPath}`);
    console.log(`Latest Dash: ${latestPath}\n`);
  } catch (err) {
    console.error(`[Report Error] Could not save reports: ${err.message}`);
  }

  return report;
}

// ── Direct Execution ────────────────────────────────────────────────────────
if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  runLoadTest(options)
    .then((report) => {
      const exitCode = report.verification.raceConditionAnomaliesCount > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('[Fatal Error]', err);
      process.exit(1);
    });
}

module.exports = { runLoadTest, parseArgs, calculatePercentiles };
