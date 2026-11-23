// Sliding-log rate limiter: keeps each client's recent attempt timestamps and
// allows a request only if fewer than maxAttempts fall inside the last windowMs.
//
// Expired entries are swept at most once per window, so clients that stop
// sending requests are eventually forgotten. Without the sweep, every IP that
// ever hit the limited routes would stay in memory for the life of the process.
export function createRateLimiter({ windowMs = 60_000, maxAttempts = 10, now = Date.now, message = "Too many requests" } = {}) {
  const attemptsByClient = new Map();
  let lastSweep = now();

  function sweepExpired(current) {
    for (const [client, timestamps] of attemptsByClient) {
      if (current - timestamps[timestamps.length - 1] >= windowMs) attemptsByClient.delete(client);
    }
    lastSweep = current;
  }

  function rateLimit(request, response, next) {
    const current = now();
    if (current - lastSweep >= windowMs) sweepExpired(current);

    const client = request.ip;
    const attempts = (attemptsByClient.get(client) ?? []).filter((timestamp) => current - timestamp < windowMs);
    if (attempts.length >= maxAttempts) {
      attemptsByClient.set(client, attempts);
      response.status(429).json({ error: message });
      return;
    }
    attempts.push(current);
    attemptsByClient.set(client, attempts);
    next();
  }

  rateLimit.trackedClientCount = () => attemptsByClient.size;
  return rateLimit;
}
