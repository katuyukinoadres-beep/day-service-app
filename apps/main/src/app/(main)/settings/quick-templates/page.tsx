"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import type { QuickTemplate } from "@patto/shared/types";

const FIELD_LABELS: Record<"topics" | "notes", string> = {
  topics: "活動中のトピックス",
  notes: "特記事項",
};

export default function QuickTemplatesPage() {
  const [items, setItems] = useState<QuickTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("quick_templates")
        .select("*")
        .order("field_type", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setItems((data as QuickTemplate[]) ?? []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const topics = items.filter((i) => i.field_type === "topics" && i.is_active);
  const notes = items.filter((i) => i.field_type === "notes" && i.is_active);
  const archived = items.filter((i) => !i.is_active);

  const renderSection = (
    title: string,
    list: QuickTemplate[],
    type: "topics" | "notes"
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-medium text-sub">
          {title}（{list.length}件）
        </p>
        <Link
          href={`/settings/quick-templates/new?type=${type}`}
          className="tap-target flex items-center justify-center rounded-lg bg-primary px-3 py-1 text-[13px] font-medium text-white"
        >
          + 追加
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white px-3 py-4 text-center text-[13px] text-sub">
          {title}のテンプレートはまだありません
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((item) => (
            <Link key={item.id} href={`/settings/quick-templates/${item.id}`}>
              <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-foreground">{item.text}</p>
                  <p className="text-[12px] text-sub mt-0.5">
                    表示順: {item.sort_order}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Header title="クイック入力テンプレート" showBack />

      <div className="flex flex-col gap-6 px-4 py-4">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-[13px] text-foreground">
            記録入力画面で使うクイック入力ボタンを登録できます。
            ボタンをタップすると、対応するフリー記述欄に内容が追記されます。
            <br />
            <span className="text-sub">
              ※ テンプレートはあなたの個人設定です（他の先生からは見えません）
            </span>
          </p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : (
          <>
            {renderSection("活動中のトピックス", topics, "topics")}
            {renderSection("特記事項", notes, "notes")}

            {archived.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-sub mb-2">
                  廃止済み（{archived.length}件）
                </p>
                <div className="flex flex-col gap-2">
                  {archived.map((item) => (
                    <Link
                      key={item.id}
                      href={`/settings/quick-templates/${item.id}`}
                    >
                      <Card className="flex items-center gap-3 opacity-60 active:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-foreground">
                            {item.text}
                          </p>
                          <p className="text-[12px] text-sub mt-0.5">
                            {FIELD_LABELS[item.field_type]}（廃止）
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
