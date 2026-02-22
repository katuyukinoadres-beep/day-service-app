"use client";

import { useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import type { AdminStats, DailyRecord } from "@patto/shared/types";
import { StatsCard } from "@/components/ui/StatsCard";

type RecentRecord = DailyRecord & {
  children: { name: string } | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch admin stats
      const { data: statsData } = await supabase.rpc("get_admin_stats");
      if (statsData) {
        setStats(statsData as unknown as AdminStats);
      }

      // Fetch recent records
      const { data: records } = await supabase
        .from("daily_records")
        .select("*, children(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (records) {
        setRecentRecords(records as RecentRecord[]);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  const moodLabel = (mood: string | null) => {
    switch (mood) {
      case "good":
        return "😊 良い";
      case "neutral":
        return "😐 普通";
      case "bad":
        return "😞 悪い";
      default:
        return "—";
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">ダッシュボード</h1>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-3 gap-4 xl:grid-cols-6">
        <StatsCard
          title="施設数"
          value={stats?.total_facilities ?? 0}
          color="#1B6B4A"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          }
        />
        <StatsCard
          title="ユーザー数"
          value={stats?.total_users ?? 0}
          color="#3B82F6"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
        <StatsCard
          title="児童数"
          value={stats?.total_children ?? 0}
          color="#8B5CF6"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          }
        />
        <StatsCard
          title="総記録数"
          value={stats?.total_records ?? 0}
          color="#F59E0B"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
        />
        <StatsCard
          title="本日の記録"
          value={stats?.records_today ?? 0}
          color="#EF4444"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
        <StatsCard
          title="本日稼働施設"
          value={stats?.facilities_with_activity_today ?? 0}
          color="#10B981"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      {/* Recent Records */}
      <div className="rounded-lg bg-white shadow-sm border border-border">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">最近の記録</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  児童名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  日付
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  気分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  活動
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  作成日時
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-sub">
                    記録がありません
                  </td>
                </tr>
              ) : (
                recentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {record.children?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {record.date}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {moodLabel(record.mood)}
                    </td>
                    <td className="px-6 py-4 text-sm text-sub">
                      {record.activities.length > 0
                        ? record.activities.join(", ")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {new Date(record.created_at).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
