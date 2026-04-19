"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { StatsCard } from "@/components/ui/StatsCard";

type TodayStatus = {
  date: string;
  childrenActiveCount: number;
  recordedCount: number;
  paperLoggedCount: number;
  aiMissingCount: number;
  activeStaffCount: number;
  unrecorded: { id: string; name: string; iconColor: string }[];
  paperLogged: { id: string; name: string; iconColor: string }[];
  aiMissing: { id: string; name: string; iconColor: string }[];
  facilityName: string;
  displayName: string;
};

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardHomePage() {
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("ログイン情報が取得できません。");
          setLoading(false);
          return;
        }

        const today = getToday();

        const { data: profileRow } = await supabase
          .from("profiles")
          .select("facility_id, display_name")
          .eq("id", user.id)
          .maybeSingle();
        const profile = profileRow as
          | { facility_id: string; display_name: string }
          | null;
        if (!profile) {
          setError("プロフィールが取得できません。");
          setLoading(false);
          return;
        }

        const [facilityRes, childrenRes, recordsRes] = await Promise.all([
          supabase
            .from("facilities")
            .select("name")
            .eq("id", profile.facility_id)
            .maybeSingle(),
          supabase
            .from("children")
            .select("id, name, icon_color")
            .eq("facility_id", profile.facility_id)
            .eq("is_active", true)
            .order("name_kana", { ascending: true }),
          supabase
            .from("daily_records")
            .select("child_id, paper_logged, ai_text, recorded_by")
            .eq("facility_id", profile.facility_id)
            .eq("date", today),
        ]);

        const facility =
          (facilityRes.data as { name: string } | null) ?? null;
        const children =
          (childrenRes.data as {
            id: string;
            name: string;
            icon_color: string;
          }[]) ?? [];
        const records =
          (recordsRes.data as {
            child_id: string;
            paper_logged: boolean;
            ai_text: string | null;
            recorded_by: string | null;
          }[]) ?? [];

        const recordByChild = new Map(records.map((r) => [r.child_id, r]));
        const unrecorded = children.filter((c) => !recordByChild.has(c.id));
        const paperLogged = children.filter(
          (c) => recordByChild.get(c.id)?.paper_logged === true,
        );
        const aiMissing = children.filter((c) => {
          const r = recordByChild.get(c.id);
          if (!r) return false;
          if (r.paper_logged) return false;
          return !r.ai_text;
        });
        const activeStaff = new Set(
          records.map((r) => r.recorded_by).filter((id): id is string => !!id),
        );

        setStatus({
          date: today,
          childrenActiveCount: children.length,
          recordedCount: records.length,
          paperLoggedCount: paperLogged.length,
          aiMissingCount: aiMissing.length,
          activeStaffCount: activeStaff.size,
          unrecorded: unrecorded.map((c) => ({
            id: c.id,
            name: c.name,
            iconColor: c.icon_color,
          })),
          paperLogged: paperLogged.map((c) => ({
            id: c.id,
            name: c.name,
            iconColor: c.icon_color,
          })),
          aiMissing: aiMissing.map((c) => ({
            id: c.id,
            name: c.name,
            iconColor: c.icon_color,
          })),
          facilityName: facility?.name ?? "",
          displayName: profile.display_name,
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-danger">{error ?? "データを取得できません。"}</p>
      </div>
    );
  }

  const progressRate =
    status.childrenActiveCount > 0
      ? Math.round((status.recordedCount / status.childrenActiveCount) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          リアルタイム業務状況
        </h1>
        <p className="mt-1 text-sm text-sub">
          {status.facilityName} / {status.displayName} さん ·{" "}
          {new Date(status.date).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <StatsCard
          title="記録済 / 在籍"
          value={`${status.recordedCount}/${status.childrenActiveCount}`}
          hint={`${progressRate}% 完了`}
          color="#1B6B4A"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          }
        />
        <StatsCard
          title="未記録"
          value={status.unrecorded.length}
          hint="本日まだ記録のない児童"
          color="#DC2626"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          }
        />
        <StatsCard
          title="紙記入"
          value={status.paperLoggedCount}
          hint="本日紙のフォームで対応"
          color="#F59E0B"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487 18.549 2.799a2.1 2.1 0 1 1 2.97 2.97L9.42 18.107l-4.474 1.125 1.125-4.474L16.862 4.487Zm0 0L19.5 7.125"
              />
            </svg>
          }
        />
        <StatsCard
          title="AI未生成"
          value={status.aiMissingCount}
          hint="支援記録まとめ未入力の記録"
          color="#8B5CF6"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
          }
        />
        <StatsCard
          title="稼働スタッフ"
          value={status.activeStaffCount}
          hint="本日記録登録したスタッフ数"
          color="#3B82F6"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          }
        />
      </div>

      {/* Progress bar */}
      {status.childrenActiveCount > 0 && (
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">記録進捗</p>
            <p className="text-sm text-sub">
              {status.recordedCount}/{status.childrenActiveCount} ({progressRate}%)
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChildList
          title="未記録"
          color="#DC2626"
          items={status.unrecorded}
          emptyLabel="全員の記録が揃っています"
        />
        <ChildList
          title="紙記入"
          color="#F59E0B"
          items={status.paperLogged}
          emptyLabel="紙で記入された児童はいません"
        />
        <ChildList
          title="AI未生成"
          color="#8B5CF6"
          items={status.aiMissing}
          emptyLabel="支援記録まとめ未入力はありません"
        />
      </div>

      {/* Link to main app */}
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-sm font-medium text-foreground">各種入力・帳票</p>
        <p className="mt-1 text-xs text-sub">
          記録入力・履歴・帳票は「ぱっと記録」本体アプリから
        </p>
        <Link
          href="https://day-service-app.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          「ぱっと記録」を開く
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function ChildList({
  title,
  color,
  items,
  emptyLabel,
}: {
  title: string;
  color: string;
  items: { id: string; name: string; iconColor: string }[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white">
      <div
        className="flex items-center justify-between border-b border-border px-4 py-3"
        style={{ borderTopWidth: 3, borderTopColor: color }}
      >
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-sub">{items.length} 名</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-sub">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: c.iconColor }}
              >
                {c.name.charAt(0)}
              </div>
              <p className="text-sm text-foreground">{c.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
