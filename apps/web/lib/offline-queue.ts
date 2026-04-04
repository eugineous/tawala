// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { openDB, type IDBPDatabase } from "idb";

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

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("created_at", "created_at");
      }
    },
  });
}

class OfflineQueue {
  async enqueue(
    entry: Omit<OfflineQueueEntry, "id" | "created_at">
  ): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    const record: OfflineQueueEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: Date.now(),
    };
    await db.put(STORE_NAME, record);
  }

  async flush(): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, "created_at");

    for (const entry of all) {
      try {
        if (entry.type === "financial") {
          // Server-wins: check if server already has the record
          const checkRes = await fetch(entry.url, { method: "GET" }).catch(
            () => null
          );
          if (checkRes && checkRes.ok) {
            const data = await checkRes.json().catch(() => null);
            if (data && data.id) {
              // Server already has it — skip
              await db.delete(STORE_NAME, entry.id);
              continue;
            }
          }
        }

        // client-wins for journal/mood, and fallback for financial/other
        const res = await fetch(entry.url, {
          method: entry.method,
          headers: entry.headers,
          body: entry.body,
        });

        if (res.ok) {
          await db.delete(STORE_NAME, entry.id);
        }
      } catch {
        // Leave in queue to retry next time
      }
    }
  }

  async getQueueLength(): Promise<number> {
    if (typeof window === "undefined") return 0;
    const db = await getDB();
    return db.count(STORE_NAME);
  }
}

export const offlineQueue = new OfflineQueue();
