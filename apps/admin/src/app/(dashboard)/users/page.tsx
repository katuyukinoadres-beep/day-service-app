"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Profile } from "@patto/shared/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ProfileWithFacility = Profile & {
  facilities: { name: string } | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<ProfileWithFacility[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*, facilities(name)")
        .order("created_at", { ascending: false });

      if (data) setUsers(data as ProfileWithFacility[]);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.facilities?.name ?? "").toLowerCase().includes(search.toLowerCase())
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
      <h1 className="mb-6 text-2xl font-bold text-foreground">ユーザー管理</h1>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="名前または施設名で検索..."
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
                  表示名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  施設名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  ロール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">
                  スーパー管理者
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
                    ユーザーが見つかりません
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/users/${user.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {user.display_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {user.facilities?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={user.role} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {user.is_super_admin ? (
                        <StatusBadge status="super_admin" />
                      ) : (
                        <span className="text-sm text-sub">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">
                      {new Date(user.created_at).toLocaleDateString("ja-JP")}
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
