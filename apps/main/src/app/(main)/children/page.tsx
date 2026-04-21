"use client";

import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import type { Child } from "@patto/shared/types";
import { useCachedQuery } from "@/lib/useCachedQuery";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { TTL } from "@/lib/readCache";

export default function ChildrenPage() {
  const { userId, ready } = useCurrentUserId();
  const { data, loading: fetching } = useCachedQuery<Child[]>(
    "children:active",
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("is_active", true)
        .order("name_kana", { ascending: true });
      if (error) throw error;
      return (data as Child[]) ?? [];
    },
    { ttlMs: TTL.oneDay, ownerId: userId, enabled: ready }
  );
  const children = data ?? [];
  const loading = !ready || (fetching && children.length === 0);

  return (
    <div>
      <Header
        title="児童一覧"
        right={
          <Link
            href="/children/new"
            className="tap-target flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-[14px] font-medium text-white"
          >
            + 追加
          </Link>
        }
      />

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : children.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sub text-[15px]">児童が登録されていません</p>
            <Link
              href="/children/new"
              className="mt-2 inline-block text-primary text-[14px] font-medium"
            >
              最初の児童を登録する
            </Link>
          </div>
        ) : (
          children.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white text-[16px] font-bold shrink-0"
                  style={{ backgroundColor: child.icon_color }}
                >
                  {child.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground truncate">
                    {child.name}
                  </p>
                  <p className="text-[13px] text-sub truncate">
                    {[child.school, child.grade].filter(Boolean).join(" / ") || "未設定"}
                  </p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
