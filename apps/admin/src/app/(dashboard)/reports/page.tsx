"use client";

import { useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";
import { StatsCard } from "@/components/ui/StatsCard";

type FacilityRecordCount = {
  facility_id: string;
  facility_name: string;
  record_count: number;
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [totalRecords, setTotalRecords] = useState(0);
  const [uniqueChildren, setUniqueChildren] = useState(0);
  const [activeFacilities, setActiveFacilities] = useState(0);
  const [facilityBreakdown, setFacilityBreakdown] = useState<
    FacilityRecordCount[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const supabase = createClient();

      // Fetch records in date range
      const { data: records } = await supabase
        .from("daily_records")
        .select("id, child_id, facility_id")
        .gte("date", startDate)
        .lte("date", endDate);

      if (!records) {
        setLoading(false);
        return;
      }

      // Total records
      setTotalRecords(records.length);

      // Unique children
      const childIds = new Set(records.map((r) => r.child_id));
      setUniqueChildren(childIds.size);

      // Active facilities (facilities with records in this range)
      const facilityIds = new Set(records.map((r) => r.facility_id));
      setActiveFacilities(facilityIds.size);

      // Records per facility
      const countByFacility = new Map<string, number>();
      records.forEach((r) => {
        countByFacility.set(
          r.facility_id,
          (countByFacility.get(r.facility_id) ?? 0) + 1
        );
      });

      // Fetch facility names
      const facilityIdsArr = Array.from(facilityIds);
      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, name")
        .in("id", facilityIdsArr);

      const nameMap = new Map<string, string>();
      facilities?.forEach((f) => nameMap.set(f.id, f.name));

      const breakdown: FacilityRecordCount[] = facilityIdsArr
        .map((id) => ({
          facility_id: id,
          facility_name: nameMap.get(id) ?? "不明",
          record_count: countByFacility.get(id) ?? 0,
        }))
        .sort((a, b) => b.record_count - a.record_count);

      setFacilityBreakdown(breakdown);
      setLoading(false);
    };

    fetchReport();
  }, [startDate, endDate]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">レポート</h1>

      {/* Date range filter */}
      <div className="mb-6 flex items-center gap-4">
        <div>
          <label
            htmlFor="start"
            className="mr-2 text-sm font-medium text-foreground"
          >
            開始日:
          </label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label
            htmlFor="end"
            className="mr-2 text-sm font-medium text-foreground"
          >
            終了日:
          </label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sub">読み込み中...</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <StatsCard
              title="期間内の記録数"
              value={totalRecords}
              color="#1B6B4A"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              }
            />
            <StatsCard
              title="記録対象児童数"
              value={uniqueChildren}
              color="#8B5CF6"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
                  />
                </svg>
              }
            />
            <StatsCard
              title="稼働施設数"
              value={activeFacilities}
              color="#3B82F6"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                  />
                </svg>
              }
            />
          </div>

          {/* Facility breakdown table */}
          <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                施設別記録数
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                      施設名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                      記録数
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {facilityBreakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-6 py-8 text-center text-sm text-sub"
                      >
                        この期間の記録はありません
                      </td>
                    </tr>
                  ) : (
                    facilityBreakdown.map((item) => (
                      <tr
                        key={item.facility_id}
                        className="hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                          {item.facility_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                          {item.record_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
