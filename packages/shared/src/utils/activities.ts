export type ActivityItemJoin = {
  id: string;
  name: string;
  sort_order: number;
};

export type DailyRecordActivityJoin = {
  detail: string | null;
  activity_items: ActivityItemJoin | null;
};

export function formatActivitySelections(
  selections: DailyRecordActivityJoin[] | null | undefined,
): string[] {
  if (!selections || selections.length === 0) return [];
  return selections
    .filter(
      (s): s is DailyRecordActivityJoin & { activity_items: ActivityItemJoin } =>
        s.activity_items !== null,
    )
    .sort(
      (a, b) => a.activity_items.sort_order - b.activity_items.sort_order,
    )
    .map((s) => {
      const name = s.activity_items.name;
      const detail = s.detail?.trim();
      return detail ? `${name}（${detail}）` : name;
    });
}
