// EAT timezone offset (UTC+3)
export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getTodayEAT(): string {
  const now = new Date(Date.now() + EAT_OFFSET_MS);
  return now.toISOString().split("T")[0];
}

export function getISOWeekEAT(): string {
  const now = new Date(Date.now() + EAT_OFFSET_MS);
  const year = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86400000
  );
  const week = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-${String(week).padStart(2, "0")}`;
}

export function validateSignedUrlExpiry(requestedExpiry: number): number {
  const MAX_EXPIRY = 3600; // 1 hour
  return Math.min(requestedExpiry, MAX_EXPIRY);
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}
