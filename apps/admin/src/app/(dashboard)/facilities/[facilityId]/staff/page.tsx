"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Profile } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function FacilityStaffPage() {
  const params = useParams();
  const facilityId = params.facilityId as string;
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false });

    if (data) setStaff(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const toggleRole = async (profile: Profile) => {
    const newRole = profile.role === "admin" ? "staff" : "admin";
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profile.id);

    if (!error) {
      setStaff((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role: newRole } : p))
      );
    }
  };

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
        <span className="text-sm text-foreground">スタッフ</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">スタッフ一覧</h1>

      {/* Sub-navigation tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.href === `/facilities/${facilityId}/staff`;
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

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  表示名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  ロール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  作成日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-sub">
                    スタッフが見つかりません
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {member.display_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={member.role} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {new Date(member.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => toggleRole(member)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-gray-50"
                      >
                        {member.role === "admin"
                          ? "スタッフに変更"
                          : "管理者に変更"}
                      </button>
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
