"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { DailyRecord } from "@patto/shared/types";

type RecordWithChild = DailyRecord & {
  children: { name: string } | null;
};

export default function FacilityRecordsPage() {
  const params = useParams();
  const facilityId = params.facilityId as string;
  const [records, setRecords] = useState<RecordWithChild[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_records")
        .select("*, children(name)")
        .eq("facility_id", facilityId)
        .eq("date", date)
        .order("created_at", { ascending: false });

      if (data) setRecords(data as RecordWithChild[]);
      setLoading(false);
    };

    fetchRecords();
  }, [facilityId, date]);

  const moodLabel = (mood: string | null) => {
    switch (mood) {
      case "good":
        return "良い";
      case "neutral":
        return "普通";
      case "bad":
        return "悪い";
      default:
        return "—";
    }
  };

  const tabs = [
    { label: "概要", href: `/facilities/${facilityId}` },
    { label: "児童", href: `/facilities/${facilityId}/children` },
    { label: "記録", href: `/facilities/${facilityId}/records` },
    { label: "スタッフ", href: `/facilities/${facilityId}/staff` },
  ];

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Link href="/facilities" className="text-sm text-sub hover:text-foreground">
          施設管理
        </Link>
        <span className="text-sm text-sub">/</span>
        <Link href={`/facilities/${facilityId}`} className="text-sm text-sub hover:text-foreground">
          施設詳細
        </Link>
        <span className="text-sm text-sub">/</span>
        <span className="text-sm text-foreground">記録</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">記録一覧</h1>

      {/* Sub-navigation tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.href === `/facilities/${facilityId}/records`;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-sub hover:border-gray-300 hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Date filter */}
      <div className="mb-4">
        <label htmlFor="date" className="mr-2 text-sm font-medium text-foreground">
          日付:
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
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
                  来所
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  退所
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  送迎
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-sub">
                    読み込み中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-sub">
                    この日付の記録はありません
                  </td>
                </tr>
              ) : (
                records.map((record) => (
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
                      {record.arrival_time || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {record.departure_time || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {record.pickup_method || "—"}
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
