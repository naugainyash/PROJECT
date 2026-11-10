/**
 * Exponential backoff retry utility for Gnani API requests.
 * Specifically targets HTTP 429 (Rate Limit / Too Many Requests) responses
 * to ensure resilience before failing over or displaying error banners.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  onRetry?: (attempt: number, delayMs: number, responseOrError: any) => void;
  shouldRetry?: (error: any, response?: Response) => boolean;
}

export function defaultShouldRetry(error: any, response?: Response): boolean {
  if (response && response.status === 429) {
    return true;
  }
  if (error && (error.status === 429 || /429|rate\s*limit/i.test(error.message || ""))) {
    return true;
  }
  return false;
}

export async function fetchWithExponentialBackoff(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 5000,
    factor = 2,
    onRetry,
    shouldRetry = defaultShouldRetry,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(input, init);

      if (shouldRetry(null, response) && attempt < maxRetries) {
        attempt++;
        const backoff = initialDelayMs * Math.pow(factor, attempt - 1);
        const jitter = Math.random() * 150;
        const delayMs = Math.min(backoff + jitter, maxDelayMs);

        if (onRetry) {
          onRetry(attempt, delayMs, response);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return response;
    } catch (err: any) {
      if (shouldRetry(err) && attempt < maxRetries) {
        attempt++;
        const backoff = initialDelayMs * Math.pow(factor, attempt - 1);
        const jitter = Math.random() * 150;
        const delayMs = Math.min(backoff + jitter, maxDelayMs);

        if (onRetry) {
          onRetry(attempt, delayMs, err);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw err;
    }
  }
}
