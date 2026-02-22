"use client";

import { useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import type { Child, DailyRecord, Profile } from "@patto/shared/types";

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

function formatBirthDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ServiceRecordPage() {
  const [date, setDate] = useState(getToday());
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [recorder, setRecorder] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(false);

  // Initial load: children list + facility
  useEffect(() => {
    const fetchInitial = async () => {
      const supabase = createClient();
      const [childrenRes, facilityRes] = await Promise.all([
        supabase
          .from("children")
          .select("*")
          .eq("is_active", true)
          .order("name_kana", { ascending: true }),
        supabase.from("facilities").select("name").single(),
      ]);
      setChildren((childrenRes.data as Child[]) ?? []);
      setFacilityName(
        (facilityRes.data as { name: string } | null)?.name ?? ""
      );
      setLoading(false);
    };
    fetchInitial();
  }, []);

  // Fetch record when date + child changes
  useEffect(() => {
    if (!selectedChildId) {
      return;
    }
    const fetchRecord = async () => {
      setRecordLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_records")
        .select("*")
        .eq("date", date)
        .eq("child_id", selectedChildId)
        .maybeSingle();

      const rec = data as DailyRecord | null;
      setRecord(rec);

      if (rec?.recorded_by) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", rec.recorded_by)
          .single();
        setRecorder(profileData as Profile | null);
      } else {
        setRecorder(null);
      }
      setRecordLoading(false);
    };
    fetchRecord();
  }, [date, selectedChildId]);

  // Reset record when child is deselected
  const currentRecord = selectedChildId ? record : null;
  const currentRecorder = selectedChildId ? recorder : null;

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print">
        <Header title="サービス提供記録" showBack />
      </div>

      {/* Filter bar */}
      <div className="no-print sticky top-[53px] z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
            />
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
            >
              <option value="">児童を選択</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {selectedChildId && currentRecord && (
            <Button
              variant="primary"
              onClick={() => window.print()}
              fullWidth
            >
              印刷 / PDF保存
            </Button>
          )}
        </div>
      </div>

      {/* Report content */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">
            読み込み中...
          </p>
        ) : !selectedChildId ? (
          <p className="py-12 text-center text-sub text-[15px]">
            児童を選択してください
          </p>
        ) : recordLoading ? (
          <p className="py-8 text-center text-sub text-[14px]">
            読み込み中...
          </p>
        ) : !currentRecord ? (
          <p className="py-12 text-center text-sub text-[15px]">
            この日の記録はありません
          </p>
        ) : (
          <div>
            {/* Print-only header */}
            <div className="print-only mb-6">
              <h1 className="text-center text-[20px] font-bold">
                サービス提供記録
              </h1>
              <div className="mt-2 flex justify-between text-[12px]">
                <span>施設名: {facilityName}</span>
                <span>記録日: {formatDate(date)}</span>
              </div>
            </div>

            {/* Section 1: Child info */}
            {selectedChild && (
              <div className="mb-6">
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
                    <tr className="border-b border-border">
                      <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                        支援領域
                      </th>
                      <td className="px-3 py-2">
                        {selectedChild.domain_tags.length > 0
                          ? selectedChild.domain_tags.join("、")
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                        個別目標
                      </th>
                      <td className="px-3 py-2">
                        {selectedChild.goals.length > 0 ? (
                          <ul className="list-disc ml-4">
                            {selectedChild.goals.map((g, i) => (
                              <li key={i}>{g}</li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Section 2: Support record */}
            <div className="mb-6">
              <h2 className="mb-2 text-[16px] font-bold text-foreground border-b-2 border-primary pb-1">
                支援記録
              </h2>
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  <tr className="border-b border-border">
                    <th className="w-28 bg-gray-50 px-3 py-2 text-left font-medium">
                      来所時刻
                    </th>
                    <td className="px-3 py-2">
                      {currentRecord.arrival_time ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      退所時刻
                    </th>
                    <td className="px-3 py-2">
                      {currentRecord.departure_time ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      気分
                    </th>
                    <td className="px-3 py-2">{moodText(currentRecord.mood)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      活動内容
                    </th>
                    <td className="px-3 py-2">
                      {currentRecord.activities.length > 0
                        ? currentRecord.activities.join("・")
                        : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      記録フレーズ
                    </th>
                    <td className="px-3 py-2">
                      {currentRecord.phrases.length > 0 ? (
                        <ul className="list-disc ml-4">
                          {currentRecord.phrases.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      メモ
                    </th>
                    <td className="px-3 py-2">{currentRecord.memo || "—"}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      支援記録まとめ
                    </th>
                    <td className="px-3 py-2 whitespace-pre-wrap">{currentRecord.ai_text || "—"}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      送迎方法
                    </th>
                    <td className="px-3 py-2">
                      {currentRecord.pickup_method || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium">
                      記録者
                    </th>
                    <td className="px-3 py-2">
                      {currentRecorder?.display_name ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print-only signature area */}
            <div className="print-only mt-8">
              <div className="flex justify-end gap-6 text-[12px]">
                <div className="text-center">
                  <p>保護者確認</p>
                  <div className="mt-1 h-16 w-28 border border-black"></div>
                </div>
                <div className="text-center">
                  <p>管理者確認</p>
                  <div className="mt-1 h-16 w-28 border border-black"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
