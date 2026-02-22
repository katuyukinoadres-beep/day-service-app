"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import type { Child, DailyRecord, Profile } from "@/types/database";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function moodText(mood: string | null): string {
  switch (mood) {
    case "good":
      return "良好";
    case "neutral":
      return "普通";
    case "bad":
      return "不調";
    default:
      return "—";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

export default function DailyLogPage() {
  const [date, setDate] = useState(getToday());
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      const [recordsRes, childrenRes, facilityRes, profilesRes] =
        await Promise.all([
          supabase
            .from("daily_records")
            .select("*")
            .eq("date", date)
            .order("created_at", { ascending: true }),
          supabase
            .from("children")
            .select("*")
            .order("name_kana", { ascending: true }),
          supabase.from("facilities").select("name").single(),
          supabase.from("profiles").select("*"),
        ]);

      setRecords((recordsRes.data as DailyRecord[]) ?? []);
      setChildren((childrenRes.data as Child[]) ?? []);
      setFacilityName(
        (facilityRes.data as { name: string } | null)?.name ?? ""
      );
      setProfiles((profilesRes.data as Profile[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, [date]);

  const childMap = new Map(children.map((c) => [c.id, c]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print">
        <Header title="業務日誌" showBack />
      </div>

      {/* Filter bar */}
      <div className="no-print sticky top-[53px] z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
          />
          <Button variant="primary" onClick={() => window.print()}>
            印刷 / PDF保存
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div className="px-4 py-4">
        {/* Print-only header */}
        <div className="print-only mb-4">
          <h1 className="text-center text-[20px] font-bold">業務日誌</h1>
          <div className="mt-2 flex justify-between text-[12px]">
            <span>施設名: {facilityName}</span>
            <span>日付: {formatDate(date)}</span>
          </div>
          <p className="mt-1 text-[12px]">出席人数: {records.length}名</p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">
            読み込み中...
          </p>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-sub text-[15px]">
            この日の記録はありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-border bg-gray-50">
                  <th className="px-2 py-2 text-left font-medium">児童名</th>
                  <th className="px-2 py-2 text-left font-medium">来所</th>
                  <th className="px-2 py-2 text-left font-medium">退所</th>
                  <th className="px-2 py-2 text-left font-medium">気分</th>
                  <th className="px-2 py-2 text-left font-medium">活動内容</th>
                  <th className="px-2 py-2 text-left font-medium">
                    記録フレーズ
                  </th>
                  <th className="px-2 py-2 text-left font-medium">メモ</th>
                  <th className="px-2 py-2 text-left font-medium">送迎</th>
                  <th className="px-2 py-2 text-left font-medium">記録者</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const child = childMap.get(r.child_id);
                  const recorder = r.recorded_by
                    ? profileMap.get(r.recorded_by)
                    : null;
                  return (
                    <tr key={r.id} className="border-b border-border">
                      <td className="px-2 py-2 whitespace-nowrap">
                        {child?.name ?? "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.arrival_time ?? "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.departure_time ?? "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {moodText(r.mood)}
                      </td>
                      <td className="px-2 py-2">
                        {r.activities.length > 0
                          ? r.activities.join("・")
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {r.phrases.length > 0 ? r.phrases.join("、") : "—"}
                      </td>
                      <td className="px-2 py-2">{r.memo || "—"}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.pickup_method || "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {recorder?.display_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Print-only signature area */}
        <div className="print-only mt-8">
          <div className="flex justify-end gap-8 text-[12px]">
            <div className="text-center">
              <p>管理者</p>
              <div className="mt-1 h-16 w-28 border border-black"></div>
            </div>
            <div className="text-center">
              <p>確認者</p>
              <div className="mt-1 h-16 w-28 border border-black"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
