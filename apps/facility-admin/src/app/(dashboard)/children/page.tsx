"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { StatsCard } from "@/components/ui/StatsCard";

type ChildRow = {
  id: string;
  name: string;
  icon_color: string;
  goals: string[];
  school: string | null;
  grade: string | null;
};

type RecordRow = {
  id: string;
  child_id: string;
  date: string;
};

type ActivityUsage = {
  daily_record_id: string;
  activity_item_id: string;
};

type ActivityItem = {
  id: string;
  name: string;
};

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(isoDate: string): string {
  // Monday-starting week. Returns YYYY-MM-DD of that Monday.
  const d = new Date(isoDate + "T00:00:00");
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ChildrenAnalyticsPage() {
  const [fromDate, setFromDate] = useState(daysAgo(27));
  const [toDate, setToDate] = useState(getToday());
  const [selectedChildId, setSelectedChildId] = useState<string>("__all__");

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [activityUsages, setActivityUsages] = useState<ActivityUsage[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("ログイン情報が取得できません。");
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("facility_id")
        .eq("id", user.id)
        .maybeSingle();
      const profile = profileRow as { facility_id: string } | null;
      if (!profile) {
        setError("プロフィールが取得できません。");
        return;
      }

      const [childrenRes, recordsRes, activityItemsRes] = await Promise.all([
        supabase
          .from("children")
          .select("id, name, icon_color, goals, school, grade")
          .eq("facility_id", profile.facility_id)
          .eq("is_active", true)
          .order("name_kana", { ascending: true }),
        supabase
          .from("daily_records")
          .select("id, child_id, date")
          .eq("facility_id", profile.facility_id)
          .gte("date", fromDate)
          .lte("date", toDate),
        supabase
          .from("activity_items")
          .select("id, name")
          .eq("facility_id", profile.facility_id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      const fetchedRecords = (recordsRes.data as RecordRow[]) ?? [];
      setChildren((childrenRes.data as ChildRow[]) ?? []);
      setRecords(fetchedRecords);
      setActivityItems((activityItemsRes.data as ActivityItem[]) ?? []);

      // Second query: fetch activity join rows for the records in window
      if (fetchedRecords.length > 0) {
        const recordIds = fetchedRecords.map((r) => r.id);
        const { data: usageRaw } = await supabase
          .from("daily_record_activities")
          .select("daily_record_id, activity_item_id")
          .in("daily_record_id", recordIds);
        setActivityUsages((usageRaw as ActivityUsage[]) ?? []);
      } else {
        setActivityUsages([]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Derived aggregates
  const { recordsByChild, activityByChild, totalRecords, totalActivitySelections } =
    useMemo(() => {
      const byChild = new Map<string, RecordRow[]>();
      for (const r of records) {
        const arr = byChild.get(r.child_id) ?? [];
        arr.push(r);
        byChild.set(r.child_id, arr);
      }
      const recordIdToChild = new Map(records.map((r) => [r.id, r.child_id]));
      const activityTallyByChild = new Map<string, Map<string, number>>();
      for (const u of activityUsages) {
        const childId = recordIdToChild.get(u.daily_record_id);
        if (!childId) continue;
        const tally = activityTallyByChild.get(childId) ?? new Map<string, number>();
        tally.set(u.activity_item_id, (tally.get(u.activity_item_id) ?? 0) + 1);
        activityTallyByChild.set(childId, tally);
      }
      return {
        recordsByChild: byChild,
        activityByChild: activityTallyByChild,
        totalRecords: records.length,
        totalActivitySelections: activityUsages.length,
      };
    }, [records, activityUsages]);

  const activityNameById = useMemo(
    () => new Map(activityItems.map((a) => [a.id, a.name])),
    [activityItems]
  );

  const selectedChild = useMemo(
    () =>
      selectedChildId === "__all__"
        ? null
        : children.find((c) => c.id === selectedChildId) ?? null,
    [children, selectedChildId]
  );

  // For single-child view: weekly record counts + top activity breakdown
  const { weeklyTrend, topActivitiesForSelected } = useMemo(() => {
    if (!selectedChild) {
      return {
        weeklyTrend: [] as { weekStart: string; count: number }[],
        topActivitiesForSelected: [] as { name: string; count: number }[],
      };
    }
    const childRecs = recordsByChild.get(selectedChild.id) ?? [];
    const weekMap = new Map<string, number>();
    for (const r of childRecs) {
      const w = weekStart(r.date);
      weekMap.set(w, (weekMap.get(w) ?? 0) + 1);
    }
    const weeks: { weekStart: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const w = weekStart(daysAgo(i * 7));
      weeks.push({ weekStart: w, count: weekMap.get(w) ?? 0 });
    }
    const tally = activityByChild.get(selectedChild.id) ?? new Map<string, number>();
    const ranked = Array.from(tally.entries())
      .map(([id, count]) => ({
        name: activityNameById.get(id) ?? "(不明)",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { weeklyTrend: weeks, topActivitiesForSelected: ranked };
  }, [selectedChild, recordsByChild, activityByChild, activityNameById]);

  const maxWeeklyCount = Math.max(1, ...weeklyTrend.map((w) => w.count));
  const maxActivityCount = Math.max(
    1,
    ...topActivitiesForSelected.map((a) => a.count)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          児童分析
        </h1>
        <p className="mt-1 text-sm text-sub">
          期間内の児童別活動・記録状況を可視化します
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-[12px] font-medium text-sub">
            期間 開始
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 rounded-md border border-border px-2 py-1.5 text-[14px]"
            />
          </label>
          <label className="flex flex-col text-[12px] font-medium text-sub">
            期間 終了
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 rounded-md border border-border px-2 py-1.5 text-[14px]"
            />
          </label>
          <label className="flex flex-col text-[12px] font-medium text-sub">
            児童
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="mt-1 rounded-md border border-border px-2 py-1.5 text-[14px]"
            >
              <option value="__all__">すべて</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-sub">読み込み中...</p>
      ) : (
        <>
          {/* Facility-level KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatsCard
              title="アクティブ児童"
              value={children.length}
              hint="is_active = true"
              color="#1B6B4A"
              icon={<IconUsers />}
            />
            <StatsCard
              title="期間内 記録件数"
              value={totalRecords}
              hint={`${fromDate} 〜 ${toDate}`}
              color="#3B82F6"
              icon={<IconDoc />}
            />
            <StatsCard
              title="期間内 活動選択数"
              value={totalActivitySelections}
              hint="daily_record_activities 延べ数"
              color="#8B5CF6"
              icon={<IconSpark />}
            />
          </div>

          {selectedChild ? (
            <SingleChildPanel
              child={selectedChild}
              weeklyTrend={weeklyTrend}
              maxWeeklyCount={maxWeeklyCount}
              topActivities={topActivitiesForSelected}
              maxActivityCount={maxActivityCount}
              totalRecordsForChild={
                recordsByChild.get(selectedChild.id)?.length ?? 0
              }
            />
          ) : (
            <AllChildrenTable
              childrenList={children}
              recordsByChild={recordsByChild}
              activityByChild={activityByChild}
              activityNameById={activityNameById}
              onSelect={(id) => setSelectedChildId(id)}
            />
          )}
        </>
      )}
    </div>
  );
}

function AllChildrenTable({
  childrenList,
  recordsByChild,
  activityByChild,
  activityNameById,
  onSelect,
}: {
  childrenList: ChildRow[];
  recordsByChild: Map<string, RecordRow[]>;
  activityByChild: Map<string, Map<string, number>>;
  activityNameById: Map<string, string>;
  onSelect: (id: string) => void;
}) {
  if (childrenList.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-center text-[13px] text-sub">
        アクティブな児童がいません。
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-gray-50 text-[12px] text-sub">
          <tr>
            <th className="px-4 py-2 font-medium">児童</th>
            <th className="px-4 py-2 font-medium">記録数</th>
            <th className="px-4 py-2 font-medium">目標数</th>
            <th className="px-4 py-2 font-medium">上位活動（Top 3）</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {childrenList.map((child) => {
            const recs = recordsByChild.get(child.id) ?? [];
            const tally = activityByChild.get(child.id) ?? new Map<string, number>();
            const top3 = Array.from(tally.entries())
              .map(([id, count]) => ({
                name: activityNameById.get(id) ?? "(不明)",
                count,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            return (
              <tr
                key={child.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelect(child.id)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: child.icon_color }}
                    >
                      {child.name.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground">
                      {child.name}
                    </span>
                    {(child.school || child.grade) && (
                      <span className="text-[11px] text-sub">
                        {[child.school, child.grade].filter(Boolean).join(" / ")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{recs.length}</td>
                <td className="px-4 py-2.5 tabular-nums">{child.goals.length}</td>
                <td className="px-4 py-2.5">
                  {top3.length === 0 ? (
                    <span className="text-sub">-</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {top3.map((a) => (
                        <span
                          key={a.name}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800"
                        >
                          {a.name} × {a.count}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SingleChildPanel({
  child,
  weeklyTrend,
  maxWeeklyCount,
  topActivities,
  maxActivityCount,
  totalRecordsForChild,
}: {
  child: ChildRow;
  weeklyTrend: { weekStart: string; count: number }[];
  maxWeeklyCount: number;
  topActivities: { name: string; count: number }[];
  maxActivityCount: number;
  totalRecordsForChild: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-bold text-white"
            style={{ backgroundColor: child.icon_color }}
          >
            {child.name.charAt(0)}
          </div>
          <div>
            <p className="text-[16px] font-semibold text-foreground">
              {child.name}
            </p>
            <p className="text-[12px] text-sub">
              {[child.school, child.grade].filter(Boolean).join(" / ") ||
                "学校・学年未設定"}
              {" · 期間内記録 "}
              <span className="tabular-nums">{totalRecordsForChild}</span>
              {" 件"}
            </p>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="text-[14px] font-semibold text-foreground">個別目標</h2>
        {child.goals.length === 0 ? (
          <p className="mt-2 text-[12px] text-sub">
            目標が登録されていません。ぱっと記録の児童編集画面から追加できます。
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {child.goals.map((goal, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2 text-[13px] text-foreground"
              >
                <span className="mt-0.5 text-primary">•</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top activities bar chart */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="text-[14px] font-semibold text-foreground">
          活動頻度 Top 5
        </h2>
        {topActivities.length === 0 ? (
          <p className="mt-2 text-[12px] text-sub">
            期間内にこの児童の活動記録がありません。
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {topActivities.map((a) => {
              const pct = Math.round((a.count / maxActivityCount) * 100);
              return (
                <li key={a.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="font-medium text-foreground">{a.name}</span>
                    <span className="tabular-nums text-sub">{a.count} 回</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Weekly trend sparkline */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="text-[14px] font-semibold text-foreground">
          週次記録数トレンド（過去 4 週）
        </h2>
        {weeklyTrend.every((w) => w.count === 0) ? (
          <p className="mt-2 text-[12px] text-sub">
            過去 4 週にこの児童の記録はありません。
          </p>
        ) : (
          <WeeklyBars data={weeklyTrend} max={maxWeeklyCount} />
        )}
      </div>
    </div>
  );
}

function WeeklyBars({
  data,
  max,
}: {
  data: { weekStart: string; count: number }[];
  max: number;
}) {
  return (
    <div className="mt-3 flex items-end justify-between gap-3">
      {data.map((w) => {
        const pct = Math.round((w.count / max) * 100);
        return (
          <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-sub">{w.count}</span>
            <div className="flex h-28 w-full items-end rounded bg-gray-50">
              <div
                className="w-full rounded-t bg-primary transition-all"
                style={{ height: `${Math.max(pct, w.count > 0 ? 6 : 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-sub">
              {w.weekStart.slice(5).replace("-", "/")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Icons */
function IconUsers() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.25 11.25 1.5 1.5m0 0 3-3m-3 3h-6.75M6.75 7.5h1.5m-1.5 3h1.5m3 0h7.5M6.75 14.25h10.5M6.75 21a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6.75 3h10.125c.621 0 1.125.504 1.125 1.125v17.625a.75.75 0 0 1-.75.75H6.75Z"
      />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  );
}
