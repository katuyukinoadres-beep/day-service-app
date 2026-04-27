export type AttendanceRow = {
  child_id: string;
  date: string;
  is_present: boolean;
};

export type DailyRecordRow = {
  id: string;
  child_id: string;
  date: string;
  activities: string[];
  memo: string | null;
  ai_text: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  pickup_method: string | null;
};

export type ChildRow = {
  id: string;
  name: string;
  icon_color: string;
};

export type ChildMonthlySummary = {
  childId: string;
  childName: string;
  iconColor: string;
  presentDays: number;
  recordedDays: number;
  warningCount: number;
};

export type MonthlyTotals = {
  totalServiceDays: number;
  activeChildren: number;
  totalWarnings: number;
};

export function monthRange(yyyymm: string): { from: string; to: string } {
  const [y, m] = yyyymm.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function defaultPreviousMonth(today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function aggregateChildMonthly(
  children: ChildRow[],
  attendances: AttendanceRow[],
  records: DailyRecordRow[],
  warningsByChild: Map<string, number>
): ChildMonthlySummary[] {
  const presentByChild = new Map<string, number>();
  for (const a of attendances) {
    if (!a.is_present) continue;
    presentByChild.set(a.child_id, (presentByChild.get(a.child_id) ?? 0) + 1);
  }

  const recordedByChild = new Map<string, number>();
  for (const r of records) {
    recordedByChild.set(r.child_id, (recordedByChild.get(r.child_id) ?? 0) + 1);
  }

  return children
    .map((c) => ({
      childId: c.id,
      childName: c.name,
      iconColor: c.icon_color,
      presentDays: presentByChild.get(c.id) ?? 0,
      recordedDays: recordedByChild.get(c.id) ?? 0,
      warningCount: warningsByChild.get(c.id) ?? 0,
    }))
    .filter((s) => s.presentDays > 0 || s.recordedDays > 0 || s.warningCount > 0)
    .sort((a, b) => b.presentDays - a.presentDays || a.childName.localeCompare(b.childName, "ja"));
}

export function summarizeTotals(
  childSummaries: ChildMonthlySummary[]
): MonthlyTotals {
  return {
    totalServiceDays: childSummaries.reduce((sum, c) => sum + c.presentDays, 0),
    activeChildren: childSummaries.filter((c) => c.presentDays > 0).length,
    totalWarnings: childSummaries.reduce((sum, c) => sum + c.warningCount, 0),
  };
}
