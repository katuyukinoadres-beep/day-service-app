"use client";

import { createClient } from "@patto/shared/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForbiddenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-light">
          <svg
            className="h-8 w-8 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground">アクセス権限がありません</h1>
        <p className="mt-2 text-sm text-sub">
          このダッシュボードは管理者ロールのアカウントのみ利用できます。
          スタッフアカウントの方は「ぱっと記録」本体アプリをご利用ください。
        </p>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "処理中..." : "ログアウトして戻る"}
        </button>
      </div>
    </div>
  );
}
