"use client";

import { useOfflineQueue } from "@/lib/useOfflineQueue";

export function OfflineBanner() {
  const { offline, pendingCount, syncing } = useOfflineQueue();

  if (!offline && pendingCount === 0 && !syncing) return null;

  let message: string;
  let bg: string;
  if (offline) {
    message =
      pendingCount > 0
        ? `⚠ オフライン中 — 保存は通信復帰時に自動実行されます（待機中 ${pendingCount} 件）`
        : "⚠ オフライン中 — 保存は通信復帰時に自動実行されます";
    bg = "bg-amber-500";
  } else if (syncing) {
    message = `⏳ 同期中（残り ${pendingCount} 件）`;
    bg = "bg-blue-500";
  } else {
    message = `⏳ 同期待機（${pendingCount} 件）`;
    bg = "bg-blue-500";
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] ${bg} text-white text-center text-[13px] py-1.5 shadow`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
