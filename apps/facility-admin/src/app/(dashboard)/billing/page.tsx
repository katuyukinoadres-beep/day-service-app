"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { MonthSelector } from "./_components/MonthSelector";
import { SummaryCards } from "./_components/SummaryCards";
import { ChildSummaryTable } from "./_components/ChildSummaryTable";
import { EvidenceWarningPanel } from "./_components/EvidenceWarningPanel";
import {
  aggregateChildMonthly,
  defaultPreviousMonth,
  monthRange,
  summarizeTotals,
  type AttendanceRow,
  type ChildRow,
  type DailyRecordRow,
} from "./_lib/aggregateMonth";
import { countWarningsByChild, detectWarnings } from "./_lib/evidenceChecks";
import { exportAttendanceCsv, exportEvidenceWarningsCsv } from "./_lib/exportCsv";

export default function BillingPage() {
  const [yyyymm, setYyyymm] = useState(defaultPreviousMonth());
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRow[]>([]);
  const [records, setRecords] = useState<DailyRecordRow[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedChildId(null);
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
        .single();
      const facilityId = profileRow?.facility_id;
      if (!facilityId) {
        setError("施設情報が取得できません。");
        return;
      }

      const { from, to } = monthRange(yyyymm);

      const [childrenRes, attendancesRes, recordsRes] = await Promise.all([
        supabase
          .from("children")
          .select("id, name, icon_color")
          .eq("facility_id", facilityId)
          .order("name"),
        supabase
          .from("attendances")
          .select("child_id, date, is_present")
          .eq("facility_id", facilityId)
          .gte("date", from)
          .lte("date", to),
        supabase
          .from("daily_records")
          .select(
            "id, child_id, date, activities, memo, ai_text, arrival_time, departure_time, pickup_method"
          )
          .eq("facility_id", facilityId)
          .gte("date", from)
          .lte("date", to),
      ]);

      if (childrenRes.error) throw childrenRes.error;
      if (attendancesRes.error) throw attendancesRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setChildren((childrenRes.data ?? []) as ChildRow[]);
      setAttendances((attendancesRes.data ?? []) as AttendanceRow[]);
      setRecords((recordsRes.data ?? []) as DailyRecordRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "データ取得に失敗しました。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [yyyymm]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const warnings = useMemo(
    () => detectWarnings(children, attendances, records),
    [children, attendances, records]
  );
  const warningsByChild = useMemo(() => countWarningsByChild(warnings), [warnings]);
  const summaries = useMemo(
    () => aggregateChildMonthly(children, attendances, records, warningsByChild),
    [children, attendances, records, warningsByChild]
  );
  const totals = useMemo(() => summarizeTotals(summaries), [summaries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">請求準備</h1>
          <p className="mt-1 text-sm text-sub">
            月次サービス提供実績の集計とエビデンス整合性チェック
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector value={yyyymm} onChange={setYyyymm} disabled={loading} />
          <button
            type="button"
            onClick={() => exportAttendanceCsv(yyyymm, summaries)}
            disabled={loading || summaries.length === 0}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            出席日数 CSV
          </button>
          <button
            type="button"
            onClick={() => exportEvidenceWarningsCsv(yyyymm, warnings)}
            disabled={loading || warnings.length === 0}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            警告 CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-white p-12 text-center text-sm text-sub">
          集計中…
        </div>
      ) : (
        <>
          <SummaryCards totals={totals} />
          <ChildSummaryTable
            summaries={summaries}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
          />
          <EvidenceWarningPanel
            warnings={warnings}
            selectedChildId={selectedChildId}
          />
        </>
      )}
    </div>
  );
}
