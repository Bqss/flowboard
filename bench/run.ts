// Tiny load driver: fixed total requests at a target concurrency.
// Reports throughput + latency percentiles. No deps.
export {};

const url = process.argv[2];
const TOTAL = Number(process.argv[3] ?? 20000);
const CONCURRENCY = Number(process.argv[4] ?? 50);

if (!url) {
  console.error('usage: bun run.ts <url> [total] [concurrency]');
  process.exit(1);
}

async function warmup(n = 500) {
  for (let i = 0; i < n; i++) await fetch(url);
}

async function bench() {
  const latencies = new Float64Array(TOTAL);
  let issued = 0;
  let done = 0;

  const start = performance.now();

  async function worker() {
    while (true) {
      const i = issued++;
      if (i >= TOTAL) return;
      const t0 = performance.now();
      const res = await fetch(url);
      await res.arrayBuffer(); // drain body
      latencies[i] = performance.now() - t0;
      done++;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const wall = performance.now() - start;

  const sorted = Array.from(latencies.subarray(0, done)).sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return {
    requests: done,
    wall_ms: wall,
    rps: (done / wall) * 1000,
    mean_ms: mean,
    p50_ms: pct(50),
    p90_ms: pct(90),
    p99_ms: pct(99),
    max_ms: sorted[sorted.length - 1]
  };
}

await warmup();
const r = await bench();
console.log(
  JSON.stringify(
    {
      url,
      requests: r.requests,
      rps: Math.round(r.rps),
      mean_ms: +r.mean_ms.toFixed(3),
      p50_ms: +r.p50_ms.toFixed(3),
      p90_ms: +r.p90_ms.toFixed(3),
      p99_ms: +r.p99_ms.toFixed(3),
      max_ms: +r.max_ms.toFixed(3)
    },
    null,
    2
  )
);
