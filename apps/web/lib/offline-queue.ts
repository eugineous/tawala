export interface OfflineQueueEntry {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  created_at: number;
  type: "financial" | "journal" | "mood" | "other";
}

const DB_NAME = "tawala-offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

// Lazy-load idb only in the browser to avoid SSR crashes
async function getDB() {
  if (typeof window === "undefined") throw new Error("IndexedDB not available");
  const { openDB } = await import("idb");
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("created_at", "created_at");
      }
    },
  });
}

class OfflineQueue {
  async enqueue(entry: Omit<OfflineQueueEntry, "id" | "created_at">): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const db = await getDB();
      const record: OfflineQueueEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        created_at: Date.now(),
      };
      await db.put(STORE_NAME, record);
    } catch { /* silently fail */ }
  }

  async flush(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const db = await getDB();
      const all = await db.getAllFromIndex(STORE_NAME, "created_at");
      for (const entry of all) {
        try {
          if (entry.type === "financial") {
            const checkRes = await fetch(entry.url, { method: "GET" }).catch(() => null);
            if (checkRes?.ok) {
              const data = await checkRes.json().catch(() => null);
              if (data?.id) { await db.delete(STORE_NAME, entry.id); continue; }
            }
          }
          const res = await fetch(entry.url, { method: entry.method, headers: entry.headers, body: entry.body });
          if (res.ok) await db.delete(STORE_NAME, entry.id);
        } catch { /* leave in queue */ }
      }
    } catch { /* silently fail */ }
  }

  async getQueueLength(): Promise<number> {
    if (typeof window === "undefined") return 0;
    try {
      const db = await getDB();
      return db.count(STORE_NAME);
    } catch { return 0; }
  }
}

export const offlineQueue = new OfflineQueue();
