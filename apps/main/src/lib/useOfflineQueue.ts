"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { getPendingCount, syncPending } from "./offlineQueue";

export type OfflineQueueState = {
  offline: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
  refreshCount: () => Promise<void>;
};

export function useOfflineQueue(): OfflineQueueState {
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    if (syncing) return;
    const count = await getPendingCount();
    if (count === 0) {
      setPendingCount(0);
      return;
    }
    setSyncing(true);
    try {
      const supabase = createClient();
      await syncPending(supabase);
      setLastSyncAt(new Date().toISOString());
    } finally {
      setSyncing(false);
      setPendingCount(await getPendingCount());
    }
  }, [syncing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setOffline(!navigator.onLine);
    update();
    refreshCount();

    const onOnline = () => {
      update();
      void syncNow();
    };
    const onOffline = () => update();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Also poll count every 5s while mounted — covers the case where another tab enqueues.
    const interval = window.setInterval(() => {
      void refreshCount();
    }, 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, [refreshCount, syncNow]);

  return { offline, pendingCount, syncing, lastSyncAt, syncNow, refreshCount };
}
