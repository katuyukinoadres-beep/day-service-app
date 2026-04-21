import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "patto-offline-queue";
const DB_VERSION = 1;
const STORE = "pending_saves";

type DailyRecordPayload = {
  id: string;
  facility_id: string;
  child_id: string;
  date: string;
  mood: string | null;
  activities: string[];
  phrases: string[];
  topics: string | null;
  notes: string | null;
  memo: null;
  ai_text: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  pickup_method: string | null;
  recorded_by: string;
  submitted_at: string | null;
  paper_logged: boolean;
};

type ActivityRow = {
  daily_record_id: string;
  activity_item_id: string;
  detail: string | null;
};

export type PendingSave = {
  queueId: string;
  op: "upsert" | "insert";
  record: DailyRecordPayload;
  activities: ActivityRow[];
  createdAt: string;
  retries: number;
  lastError: string | null;
};

interface QueueDB extends DBSchema {
  [STORE]: {
    key: string;
    value: PendingSave;
  };
}

let _db: IDBPDatabase<QueueDB> | null = null;

async function db(): Promise<IDBPDatabase<QueueDB>> {
  if (_db) return _db;
  _db = await openDB<QueueDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "queueId" });
      }
    },
  });
  return _db;
}

export async function enqueueSave(
  entry: Omit<PendingSave, "queueId" | "createdAt" | "retries" | "lastError">
): Promise<string> {
  const queueId = crypto.randomUUID();
  const full: PendingSave = {
    queueId,
    createdAt: new Date().toISOString(),
    retries: 0,
    lastError: null,
    ...entry,
  };
  const database = await db();
  await database.put(STORE, full);
  return queueId;
}

export async function getPendingCount(): Promise<number> {
  try {
    const database = await db();
    return await database.count(STORE);
  } catch {
    return 0;
  }
}

export async function listPending(): Promise<PendingSave[]> {
  const database = await db();
  return database.getAll(STORE);
}

type SyncResult = {
  synced: number;
  failed: number;
  remaining: number;
};

// Replay queued saves. A network error keeps the entry for the next run.
// A Supabase-level error (4xx / schema / RLS) bumps retries and keeps the entry; we do not
// silently drop. Slice 3 will add a failed-queue viewer if retry counts grow.
export async function syncPending(supabase: SupabaseClient): Promise<SyncResult> {
  const database = await db();
  const entries = await database.getAll(STORE);
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    const writeRecord = async () => {
      if (entry.op === "upsert") {
        const { error } = await supabase
          .from("daily_records")
          .upsert(entry.record, { onConflict: "id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_records")
          .insert(entry.record);
        if (error) throw error;
      }
    };

    try {
      await writeRecord();
      const { error: delErr } = await supabase
        .from("daily_record_activities")
        .delete()
        .eq("daily_record_id", entry.record.id);
      if (delErr) throw delErr;
      if (entry.activities.length > 0) {
        const { error: insErr } = await supabase
          .from("daily_record_activities")
          .insert(entry.activities);
        if (insErr) throw insErr;
      }
      await database.delete(STORE, entry.queueId);
      synced += 1;
    } catch (err) {
      failed += 1;
      const updated: PendingSave = {
        ...entry,
        retries: entry.retries + 1,
        lastError: err instanceof Error ? err.message : String(err),
      };
      await database.put(STORE, updated);
    }
  }

  const remaining = await database.count(STORE);
  return { synced, failed, remaining };
}
