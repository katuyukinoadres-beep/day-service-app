"use client";

import { useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import type { Child, DailyRecord, Profile } from "@patto/shared/types";
import {
  formatActivitySelections,
  type DailyRecordActivityJoin,
} from "@patto/shared";

type PeriodRecord = DailyRecord & {
  daily_record_activities: DailyRecordActivityJoin[] | null;
};

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getOneMonthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
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

function formatBirthDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// CSV 用: ダブルクォート・改行・カンマを含む値を安全にクォート
function csvCell(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCsv(
  child: Child,
  records: PeriodRecord[],
  recorderMap: Map<string, string>,
): string {
  const header = [
    "日付",
    "来所時刻",
    "退所時刻",
    "気分",
    "活動",
    "特記事項",
    "支援記録まとめ",
    "送迎方法",
    "記録者",
  ].join(",");
  const rows = records.map((r) => {
    const activities = formatActivitySelections(r.daily_record_activities).join("・");
    const notes = r.paper_logged
      ? "（紙のフォームで記入済み）"
      : (r.notes ?? r.memo ?? "");
    const aiText = r.paper_logged ? "" : (r.ai_text ?? "");
    const recorder = r.recorded_by ? (recorderMap.get(r.recorded_by) ?? "") : "";
    return [
      csvCell(r.date),
      csvCell(r.arrival_time ?? ""),
      csvCell(r.departure_time ?? ""),
      csvCell(r.paper_logged ? "—" : moodText(r.mood)),
      csvCell(r.paper_logged ? "" : activities),
      csvCell(notes),
      csvCell(aiText),
      csvCell(r.paper_logged ? "" : (r.pickup_method ?? "")),
      csvCell(recorder),
    ].join(",");
  });
  // UTF-8 BOM for Excel
  return "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n";
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ChildPeriodReportPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [fromDate, setFromDate] = useState(getOneMonthAgo());
  const [toDate, setToDate] = useState(getToday());
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [recorderMap, setRecorderMap] = useState<Map<string, string>>(new Map());
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingRecords, setFetchingRecords] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initial: children + facility + profiles
  useEffect(() => {
    const fetchInitial = async () => {
      const supabase = createClient();
      const [childrenRes, facilityRes, profilesRes] = await Promise.all([
        supabase
          .from("children")
          .select("*")
          .order("name_kana", { ascending: true }),
        supabase.from("facilities").select("name").single(),
        supabase.from("profiles").select("id, display_name"),
      ]);
      setChildren((childrenRes.data as Child[]) ?? []);
      setFacilityName(
        (facilityRes.data as { name: string } | null)?.name ?? "",
      );
      const profiles =
        (profilesRes.data as Pick<Profile, "id" | "display_name">[]) ?? [];
      setRecorderMap(new Map(profiles.map((p) => [p.id, p.display_name])));
      setLoading(false);
    };
    fetchInitial();
  }, []);

  const handleLoad = async () => {
    if (!selectedChildId || !fromDate || !toDate) return;
    if (fromDate > toDate) {
      alert("開始日は終了日より前の日付を指定してください。");
      return;
    }
    setFetchingRecords(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("daily_records")
      .select(
        "*, daily_record_activities(detail, activity_items(id, name, sort_order))",
      )
      .eq("child_id", selectedChildId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });
    setRecords((data as PeriodRecord[]) ?? []);
    setHasLoaded(true);
    setFetchingRecords(false);
  };

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const handleDownloadCsv = () => {
    if (!selectedChild) return;
    const csv = buildCsv(selectedChild, records, recorderMap);
    const safeName = selectedChild.name.replace(/[\\/:*?"<>|]/g, "_");
    downloadCsv(`${safeName}_${fromDate}_${toDate}.csv`, csv);
  };

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print">
        <Header title="児童×期間データ出力" showBack />
      </div>

      {/* Filter bar */}
      <div className="no-print sticky top-[53px] z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex flex-col gap-2">
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              setHasLoaded(false);
              setRecords([]);
            }}
            className="tap-target w-full rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
          >
            <option value="">児童を選択</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setHasLoaded(false);
              }}
              className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
            />
            <span className="text-sub text-[13px]">〜</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setHasLoaded(false);
              }}
              className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
            />
          </div>
          <Button
            variant="primary"
            fullWidth
            disabled={!selectedChildId || fetchingRecords}
            onClick={handleLoad}
          >
            {fetchingRecords ? "読み込み中..." : "期間を読み込む"}
          </Button>
          {hasLoaded && records.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.print()}
              >
                印刷 / PDF保存
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleDownloadCsv}
              >
                CSVダウンロード
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Report content */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : !selectedChildId ? (
          <p className="py-12 text-center text-sub text-[15px]">
            児童を選択して「期間を読み込む」をタップしてください
          </p>
        ) : !hasLoaded ? (
          <p className="py-12 text-center text-sub text-[15px]">
            「期間を読み込む」をタップしてください
          </p>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-sub text-[15px]">
            指定期間に記録はありません
          </p>
        ) : (
          <div>
            {/* Print-only header */}
            <div className="print-only mb-6">
              <h1 className="text-center text-[20px] font-bold">
                支援記録（期間指定）
              </h1>
              <div className="mt-2 flex justify-between text-[12px]">
                <span>施設名: {facilityName}</span>
                <span>
                  期間: {formatDate(fromDate)} 〜 {formatDate(toDate)}
                </span>
              </div>
            </div>

            {/* Child info */}
            {selectedChild && (
              <div className="mb-4">
                <h2 className="mb-2 text-[16px] font-bold text-foreground border-b-2 border-primary pb-1">
                  利用者情報
                </h2>
                <table className="w-full border-collapse text-[13px]">
                  <tbody>
                    <tr className="border-b border-border">
                      <th className="w-28 bg-gray-50 px-3 py-2 text-left font-medium">
                        氏名
                      </th>
                      <td className="px-3 py-2">{selectedChild.name}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                        生年月日
                      </th>
                      <td className="px-3 py-2">
                        {formatBirthDate(selectedChild.birth_date)}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                        学校・学年
                      </th>
                      <td className="px-3 py-2">
                        {[selectedChild.school, selectedChild.grade]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-[12px] text-sub">
                  件数: {records.length} 件
                </p>
              </div>
            )}

            {/* Records list */}
            <div className="flex flex-col gap-4">
              {records.map((r) => {
                const activities = formatActivitySelections(
                  r.daily_record_activities,
                ).join("・");
                const recorder = r.recorded_by
                  ? recorderMap.get(r.recorded_by) ?? ""
                  : "";
                return (
                  <div
                    key={r.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-gray-50 border-b border-border px-3 py-2">
                      <p className="text-[14px] font-medium">
                        {formatDate(r.date)}
                      </p>
                      {r.paper_logged && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          紙で記入
                        </span>
                      )}
                    </div>
                    {r.paper_logged ? (
                      <p className="px-3 py-3 text-[13px] text-amber-800">
                        📝 紙のフォームで記入済み（アプリには内容なし）
                      </p>
                    ) : (
                      <table className="w-full border-collapse text-[13px]">
                        <tbody>
                          <tr className="border-b border-border">
                            <th className="w-28 bg-gray-50 px-3 py-2 text-left font-medium">
                              来所・退所
                            </th>
                            <td className="px-3 py-2">
                              {r.arrival_time ?? "—"} 〜 {r.departure_time ?? "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              気分
                            </th>
                            <td className="px-3 py-2">{moodText(r.mood)}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              活動内容
                            </th>
                            <td className="px-3 py-2">
                              {activities.length > 0 ? activities : "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              特記事項
                            </th>
                            <td className="px-3 py-2 whitespace-pre-wrap">
                              {r.notes || r.memo || "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              支援記録まとめ
                            </th>
                            <td className="px-3 py-2 whitespace-pre-wrap">
                              {r.ai_text || "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              送迎方法
                            </th>
                            <td className="px-3 py-2">
                              {r.pickup_method || "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                              記録者
                            </th>
                            <td className="px-3 py-2">{recorder || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
