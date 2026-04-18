"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import type { ActivityItem } from "@patto/shared/types";

export default function ActivitiesPage() {
  const router = useRouter();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;
    if (!isAdmin) {
      router.replace("/settings");
      return;
    }
    const fetchItems = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setItems((data as ActivityItem[]) ?? []);
      setLoading(false);
    };
    fetchItems();
  }, [isAdmin, profileLoading, router]);

  const active = items.filter((i) => i.is_active);
  const archived = items.filter((i) => !i.is_active);

  return (
    <div>
      <Header
        title="活動マスタ管理"
        showBack
        right={
          <Link
            href="/settings/activities/new"
            className="tap-target flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-[14px] font-medium text-white"
          >
            + 追加
          </Link>
        }
      />

      <div className="flex flex-col gap-5 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sub text-[15px]">
              活動項目がまだ登録されていません
            </p>
            <p className="mt-1 text-sub text-[13px]">
              紙フォームの項目（例: 眼球運動・宿題・漢字トレーニング）を
              <br />
              最初に登録してください
            </p>
            <Link
              href="/settings/activities/new"
              className="mt-3 inline-block text-primary text-[14px] font-medium"
            >
              最初の活動項目を追加する
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-sub mb-2">
                  有効な活動項目（{active.length}件）
                </p>
                <div className="flex flex-col gap-2">
                  {active.map((item) => (
                    <Link key={item.id} href={`/settings/activities/${item.id}`}>
                      <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-[12px] text-sub mt-0.5">
                            表示順: {item.sort_order}
                            {item.has_detail_field && " ・ 詳細記入欄あり"}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {archived.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-sub mb-2">
                  廃止済み（{archived.length}件、過去記録との整合性のため残置）
                </p>
                <div className="flex flex-col gap-2">
                  {archived.map((item) => (
                    <Link key={item.id} href={`/settings/activities/${item.id}`}>
                      <Card className="flex items-center gap-3 opacity-60 active:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-foreground">
                            {item.name}（廃止）
                          </p>
                          <p className="text-[12px] text-sub mt-0.5">
                            表示順: {item.sort_order}
                            {item.has_detail_field && " ・ 詳細記入欄あり"}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
