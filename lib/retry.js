const config = require('../config');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries a function when the API says "busy" (503) or "slow down" (429),
// waiting longer after each failure. Any other error is thrown immediately.
async function withRetry(fn, maxAttempts = config.retryAttempts, delayMs = config.retryDelayMs) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.status === 503 || err.status === 429;
      if (!retryable || attempt === maxAttempts) throw err;
      console.log(`  (attempt ${attempt} failed with ${err.status}, retrying in ${delayMs}ms...)`);
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
}

module.exports = { withRetry, sleep };