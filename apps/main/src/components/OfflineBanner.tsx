"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center text-[13px] py-1.5 shadow"
      role="status"
      aria-live="polite"
    >
      ⚠ オフライン中 — 通信が戻るまで保存・同期は行えません
    </div>
  );
}
