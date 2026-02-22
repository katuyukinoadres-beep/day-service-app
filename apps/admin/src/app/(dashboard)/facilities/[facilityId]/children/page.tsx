"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Child } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function FacilityChildrenPage() {
  const params = useParams();
  const facilityId = params.facilityId as string;
  const [children, setChildren] = useState<Child[]>([]);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("facility_id", facilityId)
        .order("name");

      if (data) setChildren(data);
      setLoading(false);
    };

    fetchChildren();
  }, [facilityId]);

  const filtered = children.filter((c) => {
    if (filterActive === "active") return c.is_active;
    if (filterActive === "inactive") return !c.is_active;
    return true;
  });

  const tabs = [
    { label: "概要", href: `/facilities/${facilityId}` },
    { label: "児童", href: `/facilities/${facilityId}/children` },
    { label: "記録", href: `/facilities/${facilityId}/records` },
    { label: "スタッフ", href: `/facilities/${facilityId}/staff` },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Link href="/facilities" className="text-sm text-sub hover:text-foreground">
          施設管理
        </Link>
        <span className="text-sm text-sub">/</span>
        <Link href={`/facilities/${facilityId}`} className="text-sm text-sub hover:text-foreground">
          施設詳細
        </Link>
        <span className="text-sm text-sub">/</span>
        <span className="text-sm text-foreground">児童</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">児童一覧</h1>

      {/* Sub-navigation tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.href === `/facilities/${facilityId}/children`;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-sub hover:border-gray-300 hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(["all", "active", "inactive"] as const).map((value) => {
          const label = value === "all" ? "すべて" : value === "active" ? "有効" : "無効";
          return (
            <button
              key={value}
              onClick={() => setFilterActive(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filterActive === value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-sub hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  ふりがな
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  学校
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  学年
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  状態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-sub">
                    児童が見つかりません
                  </td>
                </tr>
              ) : (
                filtered.map((child) => (
                  <tr key={child.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {child.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {child.name_kana || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {child.school || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {child.grade || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={child.is_active ? "active" : "inactive"} />
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
