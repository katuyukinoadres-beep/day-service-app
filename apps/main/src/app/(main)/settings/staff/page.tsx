"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import type { Profile } from "@patto/shared/types";

export default function StaffPage() {
  const router = useRouter();
  const { profile, isAdmin, loading: profileLoading } = useProfile();
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAdmin) {
      router.replace("/settings");
      return;
    }

    const fetchStaff = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true });
      setStaffList((data as Profile[]) ?? []);
      setLoading(false);
    };
    fetchStaff();
  }, [profileLoading, isAdmin, router]);

  const toggleRole = async (staffId: string, currentRole: string) => {
    setUpdatingId(staffId);
    const newRole = currentRole === "admin" ? "staff" : "admin";

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", staffId);

    if (!error) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === staffId ? { ...s, role: newRole as "admin" | "staff" } : s
        )
      );
    }
    setUpdatingId(null);
  };

  const deactivateStaff = async (staffId: string, staffName: string) => {
    if (
      !confirm(
        `${staffName}さんを退職処理しますか？\n\n・施設データへのアクセスが即時遮断されます\n・過去の記録は維持されます\n・必要な場合はこの画面から復帰できます`
      )
    ) {
      return;
    }
    setUpdatingId(staffId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", staffId);

    if (!error) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, is_active: false } : s))
      );
    }
    setUpdatingId(null);
  };

  const reactivateStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`${staffName}さんを復帰させますか？\n施設データへのアクセスが再度有効になります。`)) {
      return;
    }
    setUpdatingId(staffId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", staffId);

    if (!error) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, is_active: true } : s))
      );
    }
    setUpdatingId(null);
  };

  if (profileLoading || loading) {
    return (
      <div>
        <Header title="スタッフ管理" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

  const active = staffList.filter((s) => s.is_active);
  const inactive = staffList.filter((s) => !s.is_active);

  const renderStaffCard = (staff: Profile) => {
    const isSelf = staff.id === profile?.id;
    const isBusy = updatingId === staff.id;
    return (
      <Card
        key={staff.id}
        className={`flex items-center gap-3 ${!staff.is_active ? "opacity-60" : ""}`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white text-[16px] font-bold shrink-0">
          {staff.display_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-foreground truncate">
            {staff.display_name}
            {isSelf && (
              <span className="ml-1 text-[12px] text-sub font-normal">
                (自分)
              </span>
            )}
          </p>
          {!staff.is_active && (
            <p className="text-[12px] text-red-600 mt-0.5">退職処理済</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* ロールバッジ（自分は読み取り専用、他はタップで変更） */}
          {isSelf || !staff.is_active ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                staff.role === "admin"
                  ? "bg-primary-light text-primary"
                  : "bg-gray-100 text-sub"
              }`}
            >
              {staff.role === "admin" ? "管理者" : "スタッフ"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => toggleRole(staff.id, staff.role)}
              disabled={isBusy}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                staff.role === "admin"
                  ? "bg-primary-light text-primary hover:bg-primary/20"
                  : "bg-gray-100 text-sub hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {isBusy ? "..." : staff.role === "admin" ? "管理者" : "スタッフ"}
            </button>
          )}

          {/* 退職 / 復帰ボタン（自分以外のみ） */}
          {!isSelf &&
            (staff.is_active ? (
              <button
                type="button"
                onClick={() => deactivateStaff(staff.id, staff.display_name)}
                disabled={isBusy}
                className="rounded-full border border-red-300 bg-white px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                退職
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reactivateStaff(staff.id, staff.display_name)}
                disabled={isBusy}
                className="rounded-full border border-border bg-white px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-gray-50 disabled:opacity-50"
              >
                復帰
              </button>
            ))}
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Header
        title="スタッフ管理"
        showBack
        right={
          <Link
            href="/settings/staff/invite"
            className="tap-target flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-[14px] font-medium text-white"
          >
            + 招待
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        {staffList.length === 0 ? (
          <p className="py-8 text-center text-sub text-[14px]">
            スタッフがいません
          </p>
        ) : (
          <>
            <div>
              <p className="text-[13px] font-medium text-sub mb-2">
                有効なスタッフ（{active.length}人）
              </p>
              <div className="flex flex-col gap-3">
                {active.map(renderStaffCard)}
              </div>
            </div>

            {inactive.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-sub mb-2">
                  退職処理済（{inactive.length}人、過去記録の整合性のため残置）
                </p>
                <div className="flex flex-col gap-3">
                  {inactive.map(renderStaffCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
