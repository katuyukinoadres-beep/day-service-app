"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Facility } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";

export default function FacilityDetailPage() {
  const params = useParams();
  const facilityId = params.facilityId as string;
  const [facility, setFacility] = useState<Facility | null>(null);
  const [staffCount, setStaffCount] = useState(0);
  const [recordsCount, setRecordsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [
        { data: facilityData },
        { count: sc },
        { count: rc },
      ] = await Promise.all([
        supabase.from("facilities").select("*").eq("id", facilityId).single(),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityId),
        supabase
          .from("daily_records")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityId),
      ]);

      if (facilityData) setFacility(facilityData);
      setStaffCount(sc ?? 0);
      setRecordsCount(rc ?? 0);
      setLoading(false);
    };

    fetchData();
  }, [facilityId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">施設が見つかりません</p>
      </div>
    );
  }

  const tabs = [
    { label: "概要", href: `/facilities/${facilityId}` },
    { label: "記録", href: `/facilities/${facilityId}/records` },
    { label: "スタッフ", href: `/facilities/${facilityId}/staff` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/facilities"
              className="text-sm text-sub hover:text-foreground"
            >
              施設管理
            </Link>
            <span className="text-sm text-sub">/</span>
            <span className="text-sm text-foreground">{facility.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{facility.name}</h1>
        </div>
        <Link
          href={`/facilities/${facilityId}/edit`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
        >
          編集
        </Link>
      </div>

      {/* Sub-navigation tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.href === `/facilities/${facilityId}`;
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

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <StatsCard
          title="スタッフ数"
          value={staffCount}
          color="#3B82F6"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
        <StatsCard
          title="記録数"
          value={recordsCount}
          color="#F59E0B"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
        />
      </div>

      {/* Facility Info */}
      <div className="rounded-lg bg-white shadow-sm border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">施設情報</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-sub">施設名</dt>
            <dd className="mt-1 text-sm text-foreground">{facility.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">ステータス</dt>
            <dd className="mt-1">
              <StatusBadge status={facility.is_active ? "active" : "inactive"} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">プラン</dt>
            <dd className="mt-1 text-sm text-foreground capitalize">
              {facility.plan ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">作成日</dt>
            <dd className="mt-1 text-sm text-foreground">
              {new Date(facility.created_at).toLocaleDateString("ja-JP")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm font-medium text-sub">備考</dt>
            <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">
              {facility.notes || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
