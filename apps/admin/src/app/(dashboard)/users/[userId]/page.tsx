"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Profile } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ProfileWithFacility = Profile & {
  facilities: { name: string } | null;
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [user, setUser] = useState<ProfileWithFacility | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*, facilities(name)")
      .eq("id", userId)
      .single();

    if (data) setUser(data as ProfileWithFacility);
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleRole = async () => {
    if (!user) return;
    const newRole = user.role === "admin" ? "staff" : "admin";
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);

    if (!error) {
      setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
    }
  };

  const toggleSuperAdmin = async () => {
    if (!user) return;
    const newValue = !user.is_super_admin;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_super_admin: newValue })
      .eq("id", user.id);

    if (!error) {
      setUser((prev) =>
        prev ? { ...prev, is_super_admin: newValue } : prev
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">ユーザーが見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Link href="/users" className="text-sm text-sub hover:text-foreground">
          ユーザー管理
        </Link>
        <span className="text-sm text-sub">/</span>
        <span className="text-sm text-foreground">{user.display_name}</span>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {user.display_name}
        </h1>
        <button
          onClick={() => router.push("/users")}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
        >
          戻る
        </button>
      </div>

      <div className="max-w-2xl rounded-lg bg-white shadow-sm border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          プロフィール情報
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-sub">表示名</dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.display_name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">施設名</dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.facilities?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">ロール</dt>
            <dd className="mt-1 flex items-center gap-3">
              <StatusBadge status={user.role} />
              <button
                onClick={toggleRole}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-gray-50"
              >
                {user.role === "admin"
                  ? "スタッフに変更"
                  : "管理者に変更"}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">スーパー管理者</dt>
            <dd className="mt-1 flex items-center gap-3">
              {user.is_super_admin ? (
                <StatusBadge status="super_admin" />
              ) : (
                <span className="text-sm text-sub">いいえ</span>
              )}
              <button
                onClick={toggleSuperAdmin}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-gray-50"
              >
                {user.is_super_admin ? "権限を外す" : "権限を付与"}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">作成日</dt>
            <dd className="mt-1 text-sm text-foreground">
              {new Date(user.created_at).toLocaleDateString("ja-JP")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-sub">ユーザーID</dt>
            <dd className="mt-1 text-xs text-sub font-mono">{user.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
