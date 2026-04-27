import type { AttendanceRow, DailyRecordRow, ChildRow } from "./aggregateMonth";

export type WarningRule =
  | "present_no_record"
  | "record_no_present"
  | "empty_record"
  | "missing_times"
  | "missing_pickup";

export const WARNING_LABELS: Record<WarningRule, string> = {
  present_no_record: "出席あり・記録なし",
  record_no_present: "記録あり・出席なし",
  empty_record: "記録空欄",
  missing_times: "来所/退所時刻欠落",
  missing_pickup: "送迎手段欠落",
};

export const WARNING_SEVERITY: Record<WarningRule, "high" | "medium" | "low"> = {
  present_no_record: "high",
  record_no_present: "medium",
  empty_record: "high",
  missing_times: "medium",
  missing_pickup: "low",
};

export type EvidenceWarning = {
  rule: WarningRule;
  childId: string;
  childName: string;
  date: string;
};

function key(childId: string, date: string): string {
  return `${childId}__${date}`;
}

export function detectWarnings(
  children: ChildRow[],
  attendances: AttendanceRow[],
  records: DailyRecordRow[]
): EvidenceWarning[] {
  const childById = new Map(children.map((c) => [c.id, c.name]));
  const presentSet = new Set(
    attendances.filter((a) => a.is_present).map((a) => key(a.child_id, a.date))
  );
  const recordByKey = new Map(records.map((r) => [key(r.child_id, r.date), r]));

  const warnings: EvidenceWarning[] = [];

  for (const k of presentSet) {
    if (!recordByKey.has(k)) {
      const [childId, date] = k.split("__");
      warnings.push({
        rule: "present_no_record",
        childId,
        childName: childById.get(childId) ?? "(不明)",
        date,
      });
    }
  }

  for (const r of records) {
    const k = key(r.child_id, r.date);
    if (!presentSet.has(k)) {
      warnings.push({
        rule: "record_no_present",
        childId: r.child_id,
        childName: childById.get(r.child_id) ?? "(不明)",
        date: r.date,
      });
    }

    const isEmpty =
      (!r.activities || r.activities.length === 0) &&
      (r.memo === null || r.memo.trim() === "") &&
      (r.ai_text === null || r.ai_text.trim() === "");
    if (isEmpty) {
      warnings.push({
        rule: "empty_record",
        childId: r.child_id,
        childName: childById.get(r.child_id) ?? "(不明)",
        date: r.date,
      });
    }

    if (!r.arrival_time || !r.departure_time) {
      warnings.push({
        rule: "missing_times",
        childId: r.child_id,
        childName: childById.get(r.child_id) ?? "(不明)",
        date: r.date,
      });
    }

    if (r.arrival_time && !r.pickup_method) {
      warnings.push({
        rule: "missing_pickup",
        childId: r.child_id,
        childName: childById.get(r.child_id) ?? "(不明)",
        date: r.date,
      });
    }
  }

  return warnings.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.childName.localeCompare(b.childName, "ja") ||
      a.rule.localeCompare(b.rule)
  );
}

export function countWarningsByChild(warnings: EvidenceWarning[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of warnings) {
    map.set(w.childId, (map.get(w.childId) ?? 0) + 1);
  }
  return map;
}

export function countWarningsByRule(
  warnings: EvidenceWarning[]
): Record<WarningRule, number> {
  const counts: Record<WarningRule, number> = {
    present_no_record: 0,
    record_no_present: 0,
    empty_record: 0,
    missing_times: 0,
    missing_pickup: 0,
  };
  for (const w of warnings) {
    counts[w.rule]++;
  }
  return counts;
}
