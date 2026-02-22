"use client";

import { useEffect, useState } from "react";
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
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeFacilities, setActiveFacilities] = useState(0);
  const [facilityBreakdown, setFacilityBreakdown] = useState<FacilityRecordCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);

      const res = await fetch(`/api/admin-data?type=records&startDate=${startDate}&endDate=${endDate}`);
      const records: { id: string; child_id: string; facility_id: string }[] = res.ok ? await res.json() : [];

      setTotalRecords(records.length);
      const facilityIds = new Set(records.map((r) => r.facility_id));
      setActiveFacilities(facilityIds.size);

      const countByFacility = new Map<string, number>();
      records.forEach((r) => {
        countByFacility.set(r.facility_id, (countByFacility.get(r.facility_id) ?? 0) + 1);
      });

      const facilityIdsArr = Array.from(facilityIds);
      let nameMap = new Map<string, string>();
      if (facilityIdsArr.length > 0) {
        const namesRes = await fetch(`/api/admin-data?type=facilities-names&ids=${facilityIdsArr.join(",")}`);
        const names: { id: string; name: string }[] = namesRes.ok ? await namesRes.json() : [];
        names.forEach((f) => nameMap.set(f.id, f.name));
      }

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
      <h1 className="mb-6 text-xl font-bold text-foreground md:text-2xl">レポート</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <label htmlFor="start" className="mr-2 text-sm font-medium text-foreground">開始日:</label>
          <input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label htmlFor="end" className="mr-2 text-sm font-medium text-foreground">終了日:</label>
          <input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><p className="text-sub">読み込み中...</p></div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <StatsCard title="期間内の記録数" value={totalRecords} color="#1B6B4A"
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>} />
            <StatsCard title="稼働施設数" value={activeFacilities} color="#3B82F6"
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>} />
          </div>

          <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
            <div className="border-b border-border px-4 py-3 md:px-6 md:py-4">
              <h2 className="text-base font-semibold text-foreground md:text-lg">施設別記録数</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub md:px-6">施設名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub md:px-6">記録数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {facilityBreakdown.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-sub md:px-6">この期間の記録はありません</td></tr>
                  ) : (
                    facilityBreakdown.map((item) => (
                      <tr key={item.facility_id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground md:px-6">{item.facility_name}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-sub md:px-6">{item.record_count}</td>
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
