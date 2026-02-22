"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import type { Child } from "@/types/database";

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function getWeekday(yearMonth: string, day: number): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${year}年${month}月`;
}

export default function MonthlySummaryPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceSet, setAttendanceSet] = useState<Set<string>>(new Set());
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      const daysInMonth = getDaysInMonth(selectedMonth);
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;

      const [recordsRes, childrenRes, facilityRes] = await Promise.all([
        supabase
          .from("daily_records")
          .select("child_id, date")
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("children")
          .select("*")
          .eq("is_active", true)
          .order("name_kana", { ascending: true }),
        supabase.from("facilities").select("name").single(),
      ]);

      const records =
        (recordsRes.data as { child_id: string; date: string }[]) ?? [];
      const set = new Set(records.map((r) => `${r.child_id}_${r.date}`));

      setAttendanceSet(set);
      setChildren((childrenRes.data as Child[]) ?? []);
      setFacilityName(
        (facilityRes.data as { name: string } | null)?.name ?? ""
      );
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth]);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Compute attendance counts
  const { childTotals, dayTotals, grandTotal } = useMemo(() => {
    const ct: Record<string, number> = {};
    const dt: Record<number, number> = {};
    let gt = 0;

    for (const child of children) {
      ct[child.id] = 0;
      for (const day of days) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        const key = `${child.id}_${dateStr}`;
        if (attendanceSet.has(key)) {
          ct[child.id]++;
          dt[day] = (dt[day] ?? 0) + 1;
          gt++;
        }
      }
    }
    return { childTotals: ct, dayTotals: dt, grandTotal: gt };
  }, [children, daysInMonth, selectedMonth, attendanceSet]);

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } }`}</style>

      <div className="no-print">
        <Header title="月次出席サマリー" showBack />
      </div>

      {/* Filter bar */}
      <div className="no-print sticky top-[53px] z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
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
        <div className="print-only mb-3">
          <h1 className="text-center text-[16px] font-bold">
            月次出席サマリー — {formatMonth(selectedMonth)}
          </h1>
          <div className="mt-1 flex justify-between text-[10px]">
            <span>施設名: {facilityName}</span>
            <span>
              出力日:{" "}
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">
            読み込み中...
          </p>
        ) : children.length === 0 ? (
          <p className="py-12 text-center text-sub text-[15px]">
            登録児童がいません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px] print:text-[8pt]">
              <thead>
                {/* Weekday row */}
                <tr>
                  <th className="sticky left-0 z-10 bg-white border border-border px-1 py-1 text-left font-medium min-w-[80px]">
                    児童名
                  </th>
                  {days.map((day) => {
                    const wd = getWeekday(selectedMonth, day);
                    const isWeekend = wd === 0 || wd === 6;
                    return (
                      <th
                        key={`wd-${day}`}
                        className={`border border-border px-0.5 py-0.5 text-center font-normal min-w-[22px] ${
                          isWeekend ? "text-danger" : ""
                        }`}
                      >
                        {WEEKDAY_LABELS[wd]}
                      </th>
                    );
                  })}
                  <th className="border border-border px-1 py-1 text-center font-medium min-w-[32px]">
                    合計
                  </th>
                </tr>
                {/* Day number row */}
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border border-border px-1 py-1 text-left font-medium">
                    日付
                  </th>
                  {days.map((day) => {
                    const wd = getWeekday(selectedMonth, day);
                    const isWeekend = wd === 0 || wd === 6;
                    return (
                      <th
                        key={`d-${day}`}
                        className={`border border-border px-0.5 py-0.5 text-center font-medium bg-gray-50 ${
                          isWeekend ? "text-danger" : ""
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th className="border border-border px-1 py-1 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody>
                {children.map((child) => (
                  <tr key={child.id}>
                    <td className="sticky left-0 z-10 bg-white border border-border px-1 py-1 whitespace-nowrap font-medium">
                      {child.name}
                    </td>
                    {days.map((day) => {
                      const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                      const key = `${child.id}_${dateStr}`;
                      const present = attendanceSet.has(key);
                      return (
                        <td
                          key={day}
                          className="border border-border px-0.5 py-0.5 text-center"
                        >
                          {present ? "◯" : ""}
                        </td>
                      );
                    })}
                    <td className="border border-border px-1 py-1 text-center font-medium">
                      {childTotals[child.id] ?? 0}
                    </td>
                  </tr>
                ))}
                {/* Day totals row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="sticky left-0 z-10 bg-gray-50 border border-border px-1 py-1 whitespace-nowrap">
                    日計
                  </td>
                  {days.map((day) => (
                    <td
                      key={day}
                      className="border border-border px-0.5 py-0.5 text-center"
                    >
                      {dayTotals[day] ?? 0}
                    </td>
                  ))}
                  <td className="border border-border px-1 py-1 text-center">
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Print-only signature area */}
        <div className="print-only mt-6">
          <div className="flex justify-end gap-6 text-[10px]">
            <div className="text-center">
              <p>管理者</p>
              <div className="mt-1 h-14 w-24 border border-black"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
