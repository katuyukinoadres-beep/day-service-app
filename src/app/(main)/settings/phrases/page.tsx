"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DOMAIN_TAGS } from "@/lib/constants";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import type { Phrase } from "@/types/database";

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhrases = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("phrase_bank")
        .select("*")
        .order("sort_order", { ascending: true });
      setPhrases((data as Phrase[]) ?? []);
      setLoading(false);
    };
    fetchPhrases();
  }, []);

  const phrasesByCategory = DOMAIN_TAGS.reduce<Record<string, Phrase[]>>(
    (acc, category) => {
      const catPhrases = phrases.filter((p) => p.category === category);
      if (catPhrases.length > 0) {
        acc[category] = catPhrases;
      }
      return acc;
    },
    {}
  );

  return (
    <div>
      <Header
        title="フレーズ管理"
        showBack
        right={
          <Link
            href="/settings/phrases/new"
            className="tap-target flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-[14px] font-medium text-white"
          >
            + 追加
          </Link>
        }
      />

      <div className="flex flex-col gap-5 px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sub text-[14px]">読み込み中...</p>
        ) : phrases.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sub text-[15px]">フレーズがありません</p>
            <Link
              href="/settings/phrases/new"
              className="mt-2 inline-block text-primary text-[14px] font-medium"
            >
              最初のフレーズを追加する
            </Link>
          </div>
        ) : (
          Object.entries(phrasesByCategory).map(([category, catPhrases]) => (
            <div key={category}>
              <p className="text-[13px] font-medium text-sub mb-2">
                {category}
              </p>
              <div className="flex flex-col gap-2">
                {catPhrases.map((phrase) =>
                  phrase.is_default ? (
                    <Card
                      key={phrase.id}
                      className="flex items-center gap-3 opacity-60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-foreground truncate">
                          {phrase.text}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-sub font-medium">
                        デフォルト
                      </span>
                    </Card>
                  ) : (
                    <Link
                      key={phrase.id}
                      href={`/settings/phrases/${phrase.id}`}
                    >
                      <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-foreground truncate">
                            {phrase.text}
                          </p>
                        </div>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6B7280"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </Card>
                    </Link>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
