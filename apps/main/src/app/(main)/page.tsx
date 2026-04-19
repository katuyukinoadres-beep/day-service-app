"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { Card } from "@/components/ui/Card";
import type { Child, DailyRecord } from "@patto/shared/types";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [paperMode, setPaperMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = getToday();
  const recordedChildIds = new Set(records.map((r) => r.child_id));
  const unrecorded = children.filter((c) => !recordedChildIds.has(c.id));
  const recorded = children.filter((c) => recordedChildIds.has(c.id));
  const progress = children.length > 0
    ? `${recorded.length}/${children.length}`
    : "0/0";

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [childrenRes, recordsRes, userRes] = await Promise.all([
        supabase
          .from("children")
          .select("*")
          .eq("is_active", true)
          .order("name_kana", { ascending: true }),
        supabase
          .from("daily_records")
          .select("*")
          .eq("date", today),
        supabase.auth.getUser(),
      ]);

      setChildren((childrenRes.data as Child[]) ?? []);
      setRecords((recordsRes.data as DailyRecord[]) ?? []);

      const userId = userRes.data.user?.id;
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("facility_id")
          .eq("id", userId)
          .single();
        const profile = profileData as { facility_id: string } | null;
        if (profile) {
          const { data: facData } = await supabase
            .from("facilities")
            .select("paper_mode_enabled")
            .eq("id", profile.facility_id)
            .single();
          const fac = facData as { paper_mode_enabled: boolean } | null;
          setPaperMode(fac?.paper_mode_enabled ?? false);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [today]);

  return (
    <div>
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-foreground">
              きょうの記録
            </h1>
            <p className="text-[13px] text-sub">
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-primary">
              {progress} 完了
            </span>
          </div>
        </div>

        {/* プログレスバー */}
        {children.length > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${(recorded.length / children.length) * 100}%`,
              }}
            />
          </div>
        )}
      </header>

      {paperMode && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[13px] text-amber-900">
            <span className="font-semibold">紙併用モード 有効</span>
            <br />
            移行期のため、紙で記入しても問題ありません。余裕のあるタイミングでアプリ入力に慣れていってください。
          </p>
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : children.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sub text-[15px]">児童が登録されていません</p>
            <Link
              href="/children/new"
              className="mt-2 inline-block text-primary text-[14px] font-medium"
            >
              児童を登録する
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* 未記録の児童 */}
            {unrecorded.length > 0 && (
              <>
                <p className="text-[13px] font-medium text-sub">
                  未記録 ({unrecorded.length})
                </p>
                {unrecorded.map((child) => (
                  <Link key={child.id} href={`/record/${child.id}`}>
                    <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white text-[18px] font-bold shrink-0"
                        style={{ backgroundColor: child.icon_color }}
                      >
                        {child.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-medium text-foreground truncate">
                          {child.name}
                        </p>
                        <p className="text-[13px] text-sub truncate">
                          {[child.school, child.grade]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-accent-light px-3 py-1 text-[12px] font-medium text-accent">
                        未記録
                      </span>
                    </Card>
                  </Link>
                ))}
              </>
            )}

            {/* 記録済みの児童 */}
            {recorded.length > 0 && (
              <>
                <p className="mt-2 text-[13px] font-medium text-sub">
                  記録済み ({recorded.length})
                </p>
                {recorded.map((child) => {
                  const record = records.find(
                    (r) => r.child_id === child.id
                  );
                  const isPaperLogged = record?.paper_logged === true;
                  const moodEmoji =
                    record?.mood === "good"
                      ? "😊"
                      : record?.mood === "bad"
                        ? "😢"
                        : "😐";

                  return (
                    <Link key={child.id} href={`/record/${child.id}`}>
                      <Card className="flex items-center gap-3 opacity-70 active:bg-gray-50 transition-colors">
                        <div className="relative shrink-0">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full text-white text-[18px] font-bold"
                            style={{ backgroundColor: child.icon_color }}
                          >
                            {child.name.charAt(0)}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-foreground truncate">
                            {child.name}
                          </p>
                          {isPaperLogged ? (
                            <p className="text-[13px] text-sub truncate">
                              📝 紙で記入
                            </p>
                          ) : (
                            <p className="text-[13px] text-sub truncate">
                              {moodEmoji}{" "}
                              {record?.activities.slice(0, 3).join("・")}
                            </p>
                          )}
                        </div>
                        {isPaperLogged && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            紙
                          </span>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
