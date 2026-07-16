/**
 * Exponential backoff: how long to wait before retrying a failed operation,
 * based on how many times it's already failed. Caps at 5 minutes so we don't
 * wait forever, and adds jitter to avoid many operations retrying at the exact
 * same moment (thundering herd).
 */
export function getBackoffDelayMs(retryCount: number): number {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 5 * 60 * 1000; // 5 minutes
  const exponential = baseDelay * Math.pow(2, retryCount);
  const capped = Math.min(exponential, maxDelay);
  const jitter = Math.random() * 0.3 * capped; // up to 30% jitter
  return Math.floor(capped + jitter);
}

export function isReadyForRetry(lastAttemptAt: string | null, retryCount: number): boolean {
  if (!lastAttemptAt) return true;
  const elapsed = Date.now() - new Date(lastAttemptAt).getTime();
  return elapsed >= getBackoffDelayMs(retryCount);
}