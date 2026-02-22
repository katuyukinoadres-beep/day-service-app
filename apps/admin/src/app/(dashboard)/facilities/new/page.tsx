"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@patto/shared/supabase/client";

export default function NewFacilityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("facilities").insert({
      name: name.trim(),
      plan,
      notes: notes.trim() || null,
    });

    if (insertError) {
      setError("施設の作成に失敗しました: " + insertError.message);
      setLoading(false);
      return;
    }

    router.push("/facilities");
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">施設を新規作成</h1>

      <div className="max-w-2xl rounded-lg bg-white shadow-sm border border-border p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              施設名 <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="○○放課後デイサービス"
              required
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="plan"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              プラン
            </label>
            <select
              id="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              備考
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="メモを入力..."
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "作成中..." : "作成する"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/facilities")}
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
