/**
 * 4-WARRIORS | SYNORA 10-Hour Hackathon
 * Test Scenario Orchestrator
 * QA / Reliability Engineer: Prince
 * 
 * Runs preset scenarios:
 * - Scenario A: Normal Bidding (100 reqs, 15 concurrency)
 * - Scenario B: High Concurrency (1,000 reqs, 100 concurrency)
 * - Scenario C: 5,000 Request Stress Test (5,000 reqs, 500 concurrency)
 * - Scenario D: Same Auction Race Condition Verification
 * - Scenario E: Invalid & Malformed Bids Injection
 * - Scenario F: Expired / Ended Auction Bidding
 * - Scenario All: Complete Automated QA Suite with Executive Summary
 */

'use strict';

const { runLoadTest } = require('./load-test');
const path = require('path');
const fs = require('fs');

const SCENARIO_DEFS = {
  a: {
    name: 'normal',
    title: 'TEST A — NORMAL BIDDING',
    description: 'Verify basic API correctness with 100 requests & 15 concurrency',
    requests: 100,
    concurrency: 15,
    scenario: 'normal',
    auctionId: 'auction-normal',
    startingBid: 100,
  },
  b: {
    name: 'concurrency',
    title: 'TEST B — HIGH CONCURRENCY',
    description: 'Stress concurrency handling with 1,000 requests & 100 concurrency',
    requests: 1000,
    concurrency: 100,
    scenario: 'high-concurrency',
    auctionId: 'auction-concurrent',
    startingBid: 100,
  },
  c: {
    name: 'stress',
    title: 'TEST C — 5000 REQUEST STRESS TEST',
    description: 'Demonstrate hackathon high-load requirement with 5,000 requests & 500 concurrency',
    requests: 5000,
    concurrency: 500,
    scenario: 'stress-5000',
    auctionId: 'auction-stress-5000',
    startingBid: 500,
  },
  d: {
    name: 'race',
    title: 'TEST D — SAME AUCTION / RACE CONDITION',
    description: 'Rapid interleaved bursts against the same auction to verify atomic Lua serialization',
    requests: 1000,
    concurrency: 200,
    scenario: 'race-condition',
    auctionId: 'auction-race-test',
    startingBid: 1000,
  },
  e: {
    name: 'invalid',
    title: 'TEST E — INVALID & MALFORMED BIDS',
    description: 'Inject zero, negative, lower, string, and missing-field bids to verify rejection',
    requests: 200,
    concurrency: 20,
    scenario: 'invalid-bids',
    auctionId: 'auction-invalid-test',
    startingBid: 200,
  },
  f: {
    name: 'ended',
    title: 'TEST F — AUCTION ENDED',
    description: 'Send bids against an expired auction to verify immediate rejection',
    requests: 100,
    concurrency: 20,
    scenario: 'auction-ended',
    auctionId: 'auction-ended',
    startingBid: 100,
  },
};

async function seedAuctionIfSupported(targetUrl, auctionId, overrides = {}) {
  try {
    const parsed = new URL(targetUrl);
    const seedUrl = `${parsed.protocol}//${parsed.host}/api/bids/seed`;
    const res = await fetch(seedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auctionId,
        title: `Test ${auctionId}`,
        highestBid: overrides.highestBid || 100,
        status: overrides.status || 'active',
        durationMs: overrides.durationMs || 3600000,
      }),
    });
    if (res.ok) {
      console.log(`[Suite Seed] Successfully initialized ${auctionId}`);
    }
  } catch (e) {
    // Seed endpoint optional if backend auto-seeds
  }
}

async function runScenario(scenarioKey, targetUrl, overrides = {}) {
  const def = SCENARIO_DEFS[scenarioKey];
  if (!def) {
    console.error(`Unknown scenario key: ${scenarioKey}`);
    process.exit(1);
  }

  console.log(`\n>>> STARTING: ${def.title} <<<`);
  console.log(`Purpose: ${def.description}`);

  // Seed auction before running
  await seedAuctionIfSupported(targetUrl, def.auctionId, {
    highestBid: def.startingBid,
    status: def.scenario === 'auction-ended' ? 'ended' : 'active',
  });

  const options = {
    url: targetUrl,
    auctionId: overrides.auctionId || def.auctionId,
    requests: overrides.requests || def.requests,
    concurrency: overrides.concurrency || def.concurrency,
    startingBid: overrides.startingBid || def.startingBid,
    bidIncrement: overrides.bidIncrement || 10,
    scenario: def.scenario,
    userPrefix: 'warrior',
    reportDir: overrides.reportDir || path.join(__dirname, 'reports'),
    quiet: overrides.quiet || false,
  };

  return await runLoadTest(options);
}

async function runAll(targetUrl, overrides = {}) {
  console.log(`\n======================================================`);
  console.log(`SYNORA COMPLETE QA & CONCURRENCY SUITE — 4-WARRIORS`);
  console.log(`Target: ${targetUrl}`);
  console.log(`======================================================\n`);

  const summary = [];
  const startAll = Date.now();

  for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const report = await runScenario(key, targetUrl, overrides);
    summary.push({
      scenarioKey: key.toUpperCase(),
      title: SCENARIO_DEFS[key].title,
      requests: report.counts.totalRequests,
      concurrency: report.config.concurrency,
      accepted: report.counts.accepted,
      rejected: report.counts.rejected,
      errors: report.counts.errors,
      throughput: report.performance.actualThroughputReqPerSec,
      avgLatency: report.performance.avgLatencyMs,
      p95Latency: report.performance.p95LatencyMs,
      anomalies: report.verification.raceConditionAnomaliesCount,
      status: report.verification.raceConditionAnomaliesCount === 0 && report.counts.errors === 0 ? 'PASS' : 'WARN',
    });
    // Brief pause between scenarios
    await new Promise((r) => setTimeout(r, 1000));
  }

  const totalTime = ((Date.now() - startAll) / 1000).toFixed(2);

  // Print Executive Summary Table
  console.log(`\n========================================================================================`);
  console.log(`SYNORA QA SUITE EXECUTIVE SUMMARY (Elapsed: ${totalTime}s)`);
  console.log(`========================================================================================`);
  console.log(`ID | SCENARIO                       | REQS | CONC | ACCEPT | REJECT | ERR | REQ/SEC  | P95(ms) | ANOMALIES | STATUS`);
  console.log(`---+--------------------------------+------+------+--------+--------+-----+----------+---------+-----------+-------`);
  
  for (const row of summary) {
    const id = row.scenarioKey.padEnd(2);
    const title = row.title.padEnd(30).slice(0, 30);
    const reqs = String(row.requests).padStart(4);
    const conc = String(row.concurrency).padStart(4);
    const acc = String(row.accepted).padStart(6);
    const rej = String(row.rejected).padStart(6);
    const err = String(row.errors).padStart(3);
    const tput = `${row.throughput}`.padStart(8);
    const p95 = `${row.p95Latency}`.padStart(7);
    const anom = String(row.anomalies).padStart(9);
    const status = row.status.padStart(6);
    console.log(`${id} | ${title} | ${reqs} | ${conc} | ${acc} | ${rej} | ${err} | ${tput} | ${p95} | ${anom} | ${status}`);
  }
  console.log(`========================================================================================\n`);

  // Write summary file
  const summaryFile = path.join(__dirname, 'reports', 'suite-executive-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({ totalTimeSec: totalTime, summary }, null, 2));
  console.log(`[Executive Summary Saved] ${summaryFile}\n`);
}

// ── CLI Dispatcher ──────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetUrl = args.find((a, i) => args[i - 1] === '--url') || 'http://localhost:4000/api/bids';
  const scenarioArg = args.find((a, i) => args[i - 1] === '--scenario') || args[0] || 'all';

  if (scenarioArg === 'all') {
    runAll(targetUrl)
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  } else {
    const key = scenarioArg.toLowerCase();
    const foundKey = Object.keys(SCENARIO_DEFS).find(
      (k) => k === key || SCENARIO_DEFS[k].name === key || SCENARIO_DEFS[k].scenario === key
    );
    if (!foundKey) {
      console.error(`Unknown scenario: ${scenarioArg}`);
      console.log(`Available: a, b, c, d, e, f, all (or normal, concurrency, stress, race, invalid, ended)`);
      process.exit(1);
    }
    runScenario(foundKey, targetUrl)
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  }
}

module.exports = { runScenario, runAll, SCENARIO_DEFS };
