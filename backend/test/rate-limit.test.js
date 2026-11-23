import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "../src/rate-limit.js";

function call(limiter, ip) {
  const result = { status: 200, nextCalled: false };
  const response = {
    status(code) { result.status = code; return this; },
    json() {}
  };
  limiter({ ip }, response, () => { result.nextCalled = true; });
  return result;
}

test("rate limiter blocks a client after maxAttempts within the window", () => {
  let clock = 0;
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 2, now: () => clock });

  assert.ok(call(limiter, "1.1.1.1").nextCalled);
  assert.ok(call(limiter, "1.1.1.1").nextCalled);
  assert.equal(call(limiter, "1.1.1.1").status, 429);

  clock = 1000;
  assert.ok(call(limiter, "1.1.1.1").nextCalled, "allowed again once the window has passed");
});

test("rate limiter forgets clients that have gone idle", () => {
  let clock = 0;
  const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 5, now: () => clock });

  for (let i = 0; i < 100; i += 1) call(limiter, `10.0.0.${i}`);
  assert.equal(limiter.trackedClientCount(), 100);

  clock = 1000;
  call(limiter, "192.168.0.1");
  assert.equal(limiter.trackedClientCount(), 1, "idle clients are swept instead of kept forever");
});
