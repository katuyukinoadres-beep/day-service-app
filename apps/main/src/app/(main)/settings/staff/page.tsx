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

  if (profileLoading || loading) {
    return (
      <div>
        <Header title="スタッフ管理" showBack />
        <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
      </div>
    );
  }

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

      <div className="flex flex-col gap-3 px-4 py-4">
        {staffList.length === 0 ? (
          <p className="py-8 text-center text-sub text-[14px]">
            スタッフがいません
          </p>
        ) : (
          staffList.map((staff) => {
            const isSelf = staff.id === profile?.id;
            return (
              <Card key={staff.id} className="flex items-center gap-3">
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
                </div>
                {isSelf ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
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
                    disabled={updatingId === staff.id}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      staff.role === "admin"
                        ? "bg-primary-light text-primary hover:bg-primary/20"
                        : "bg-gray-100 text-sub hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {updatingId === staff.id
                      ? "変更中..."
                      : staff.role === "admin"
                        ? "管理者"
                        : "スタッフ"}
                  </button>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
