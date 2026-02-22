"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Facility } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

type FacilityWithCounts = Facility & {
  staffCount: number;
  childrenCount: number;
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityWithCounts[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      const supabase = createClient();

      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (!facilitiesData) {
        setLoading(false);
        return;
      }

      // Get counts for each facility
      const withCounts = await Promise.all(
        facilitiesData.map(async (facility) => {
          const [{ count: staffCount }, { count: childrenCount }] =
            await Promise.all([
              supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("facility_id", facility.id),
              supabase
                .from("children")
                .select("*", { count: "exact", head: true })
                .eq("facility_id", facility.id),
            ]);

          return {
            ...facility,
            staffCount: staffCount ?? 0,
            childrenCount: childrenCount ?? 0,
          };
        })
      );

      setFacilities(withCounts);
      setLoading(false);
    };

    fetchFacilities();
  }, []);

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">施設管理</h1>
        <Link
          href="/facilities/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          新規作成
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="施設名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  施設名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  スタッフ数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  児童数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  作成日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-sub">
                    施設が見つかりません
                  </td>
                </tr>
              ) : (
                filtered.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/facilities/${facility.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {facility.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {facility.staffCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {facility.childrenCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge
                        status={facility.is_active ? "active" : "inactive"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {new Date(facility.created_at).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
