import { openDB, type IDBPDatabase, type DBSchema } from "idb";

const DB_NAME = "patto-read-cache";
const DB_VERSION = 1;
const STORE = "entries";

type CacheEntry<T = unknown> = {
  key: string;
  ownerId: string | null;
  data: T;
  fetchedAt: number;
  ttlMs: number;
};

interface CacheDB extends DBSchema {
  [STORE]: {
    key: string;
    value: CacheEntry;
  };
}

let _db: IDBPDatabase<CacheDB> | null = null;

async function db(): Promise<IDBPDatabase<CacheDB>> {
  if (_db) return _db;
  _db = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "key" });
      }
    },
  });
  return _db;
}

export type ReadCacheResult<T> = {
  data: T;
  fresh: boolean; // true if within TTL
};

export async function readCache<T>(
  key: string,
  ownerId: string | null
): Promise<ReadCacheResult<T> | null> {
  try {
    const database = await db();
    const entry = (await database.get(STORE, key)) as CacheEntry<T> | undefined;
    if (!entry) return null;
    // Ownership check: if cached for a different signed-in user, treat as miss.
    if (entry.ownerId !== ownerId) return null;
    const fresh = Date.now() - entry.fetchedAt < entry.ttlMs;
    return { data: entry.data, fresh };
  } catch {
    return null;
  }
}

export async function writeCache<T>(
  key: string,
  ownerId: string | null,
  data: T,
  ttlMs: number
): Promise<void> {
  try {
    const database = await db();
    const entry: CacheEntry<T> = {
      key,
      ownerId,
      data,
      fetchedAt: Date.now(),
      ttlMs,
    };
    await database.put(STORE, entry as CacheEntry);
  } catch {
    // Swallow: cache write failures must never break the UI
  }
}

export async function invalidate(key: string): Promise<void> {
  try {
    const database = await db();
    await database.delete(STORE, key);
  } catch {
    // ignore
  }
}

export async function invalidateByPrefix(prefix: string): Promise<void> {
  try {
    const database = await db();
    const allKeys = await database.getAllKeys(STORE);
    const matches = allKeys.filter((k) => String(k).startsWith(prefix));
    await Promise.all(matches.map((k) => database.delete(STORE, k)));
  } catch {
    // ignore
  }
}

export async function clearReadCache(): Promise<void> {
  try {
    const database = await db();
    await database.clear(STORE);
  } catch {
    // ignore
  }
}

// Common TTLs — callsites can override by passing ttlMs to useCachedQuery.
export const TTL = {
  fiveMinutes: 5 * 60 * 1000,
  oneHour: 60 * 60 * 1000,
  oneDay: 24 * 60 * 60 * 1000,
  oneWeek: 7 * 24 * 60 * 60 * 1000,
} as const;
