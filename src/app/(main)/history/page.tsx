"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Child, DailyRecord } from "@/types/database";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<(DailyRecord & { child?: Child })[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [date, setDate] = useState(getToday());
  const [childFilter, setChildFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("daily_records")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (childFilter) {
      query = query.eq("child_id", childFilter);
    }

    const [recordsRes, childrenRes] = await Promise.all([
      query,
      supabase
        .from("children")
        .select("*")
        .order("name_kana", { ascending: true }),
    ]);

    const childrenData = (childrenRes.data as Child[]) ?? [];
    const recordsData = (recordsRes.data as DailyRecord[]) ?? [];
    const childMap = new Map(
      childrenData.map((c) => [c.id, c])
    );

    setChildren(childrenData);
    setRecords(
      recordsData.map((r) => ({
        ...r,
        child: childMap.get(r.child_id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, childFilter]);

  const handleDelete = async (recordId: string) => {
    if (!confirm("この記録を削除しますか？")) return;

    const supabase = createClient();
    await supabase.from("daily_records").delete().eq("id", recordId);
    fetchRecords();
  };

  const moodLabel = (mood: string | null) => {
    switch (mood) {
      case "good": return "😊 良好";
      case "neutral": return "😐 普通";
      case "bad": return "😢 不調";
      default: return "—";
    }
  };

  return (
    <div>
      <Header title="記録履歴" />

      {/* フィルター */}
      <div className="sticky top-[53px] z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
          />
          <select
            value={childFilter}
            onChange={(e) => setChildFilter(e.target.value)}
            className="tap-target flex-1 rounded-xl border border-border bg-white px-3 py-2 text-[14px]"
          >
            <option value="">全児童</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-sub text-[15px]">
            記録がありません
          </p>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="flex flex-col gap-2">
              {/* 児童情報 */}
              <div className="flex items-center gap-2">
                {record.child && (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[12px] font-bold shrink-0"
                    style={{ backgroundColor: record.child.icon_color }}
                  >
                    {record.child.name.charAt(0)}
                  </div>
                )}
                <p className="text-[15px] font-medium text-foreground flex-1">
                  {record.child?.name ?? "不明"}
                </p>
                <p className="text-[13px] text-sub">
                  {record.arrival_time && `${record.arrival_time}`}
                  {record.arrival_time && record.departure_time && " - "}
                  {record.departure_time && `${record.departure_time}`}
                </p>
              </div>

              {/* 内容 */}
              <div className="flex flex-col gap-1 text-[13px]">
                <p>
                  <span className="text-sub">気分: </span>
                  {moodLabel(record.mood)}
                </p>
                {record.activities.length > 0 && (
                  <p>
                    <span className="text-sub">活動: </span>
                    {record.activities.join("・")}
                  </p>
                )}
                {record.phrases.length > 0 && (
                  <div>
                    <span className="text-sub">フレーズ: </span>
                    <ul className="ml-4 mt-0.5 list-disc">
                      {record.phrases.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {record.memo && (
                  <p>
                    <span className="text-sub">メモ: </span>
                    {record.memo}
                  </p>
                )}
                {record.pickup_method && (
                  <p>
                    <span className="text-sub">送迎: </span>
                    {record.pickup_method}
                  </p>
                )}
              </div>

              {/* アクション */}
              <div className="flex gap-2 pt-1 border-t border-border mt-1">
                <Button
                  variant="ghost"
                  className="flex-1 text-[13px] py-1.5"
                  onClick={() =>
                    window.location.assign(`/record/${record.child_id}`)
                  }
                >
                  編集
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-[13px] py-1.5 text-danger"
                  onClick={() => handleDelete(record.id)}
                >
                  削除
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
