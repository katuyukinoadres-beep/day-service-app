"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      const res = await fetch("/api/admin-data?type=users");
      if (res.ok) setUsers(await res.json());
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
      <h1 className="mb-6 text-xl font-bold text-foreground md:text-2xl">ユーザー管理</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="名前または施設名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-md"
        />
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-sub">ユーザーが見つかりません</p>
        ) : (
          filtered.map((user) => (
            <Link
              key={user.id}
              href={`/users/${user.id}`}
              className="rounded-lg bg-white p-4 shadow-sm border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary">{user.display_name}</span>
                <StatusBadge status={user.role} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-sub">
                <span>{user.facilities?.name ?? "—"}</span>
                {user.is_super_admin && <StatusBadge status="super_admin" />}
                <span>{new Date(user.created_at).toLocaleDateString("ja-JP")}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg bg-white shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">表示名</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">施設名</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">ロール</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">スーパー管理者</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sub">作成日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-sub">ユーザーが見つかりません</td></tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="whitespace-nowrap px-6 py-4"><Link href={`/users/${user.id}`} className="text-sm font-medium text-primary hover:underline">{user.display_name}</Link></td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">{user.facilities?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={user.role} /></td>
                    <td className="whitespace-nowrap px-6 py-4">{user.is_super_admin ? <StatusBadge status="super_admin" /> : <span className="text-sm text-sub">—</span>}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-sub">{new Date(user.created_at).toLocaleDateString("ja-JP")}</td>
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
