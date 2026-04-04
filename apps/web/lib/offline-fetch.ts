import { offlineQueue, type OfflineQueueEntry } from "./offline-queue";

// Register the online listener once on module load (client-side only)
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineQueue.flush();
  });
}

export async function offlineFetch(
  url: string,
  options: RequestInit = {},
  type: OfflineQueueEntry["type"] = "other"
): Promise<Response> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Offline — enqueue and return a mock success response
    const headers: Record<string, string> = {};
    if (options.headers) {
      const h = new Headers(options.headers);
      h.forEach((value, key) => {
        headers[key] = value;
      });
    }

    await offlineQueue.enqueue({
      url,
      method: options.method ?? "POST",
      body: typeof options.body === "string" ? options.body : JSON.stringify(options.body ?? {}),
      headers,
      type,
    });

    return new Response(
      JSON.stringify({ queued: true, message: "Request queued for when you're back online" }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return fetch(url, options);
}
