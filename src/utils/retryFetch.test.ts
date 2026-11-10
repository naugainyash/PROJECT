import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithExponentialBackoff, defaultShouldRetry } from "./retryFetch";

test("defaultShouldRetry identifies HTTP 429 correctly", () => {
  const res429 = new Response("Too Many Requests", { status: 429 });
  assert.equal(defaultShouldRetry(null, res429), true);

  const res200 = new Response("OK", { status: 200 });
  assert.equal(defaultShouldRetry(null, res200), false);

  const res500 = new Response("Server Error", { status: 500 });
  assert.equal(defaultShouldRetry(null, res500), false);

  const err429 = new Error("Rate limit reached (429)");
  assert.equal(defaultShouldRetry(err429), true);
});

test("fetchWithExponentialBackoff returns 200 immediately without retries", async () => {
  let callCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount++;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as any;

  try {
    const res = await fetchWithExponentialBackoff("http://test/api/voice", undefined, {
      maxRetries: 3,
      initialDelayMs: 10,
    });
    assert.equal(res.status, 200);
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchWithExponentialBackoff retries on HTTP 429 and succeeds on subsequent attempt", async () => {
  let callCount = 0;
  const retriesLog: number[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    callCount++;
    if (callCount < 3) {
      return new Response("Too Many Requests", { status: 429 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as any;

  try {
    const res = await fetchWithExponentialBackoff("http://test/api/voice", undefined, {
      maxRetries: 3,
      initialDelayMs: 20,
      factor: 2,
      onRetry: (attempt) => {
        retriesLog.push(attempt);
      },
    });

    assert.equal(res.status, 200);
    assert.equal(callCount, 3);
    assert.deepEqual(retriesLog, [1, 2]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchWithExponentialBackoff stops after maxRetries and returns final 429 response", async () => {
  let callCount = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    callCount++;
    return new Response("Rate limit exceeded", { status: 429 });
  }) as any;

  try {
    const res = await fetchWithExponentialBackoff("http://test/api/voice", undefined, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    assert.equal(res.status, 429);
    // Initial call (1) + 2 retries = 3 calls total
    assert.equal(callCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
