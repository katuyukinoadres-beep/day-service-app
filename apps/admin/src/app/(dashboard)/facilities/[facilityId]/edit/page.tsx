"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@patto/shared/supabase/client";
import type { Facility } from "@patto/shared/types";

export default function EditFacilityPage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params.facilityId as string;
  const [facility, setFacility] = useState<Facility | null>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFacility = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", facilityId)
        .single();

      if (data) {
        setFacility(data);
        setName(data.name);
        setPlan(data.plan ?? "free");
        setNotes(data.notes ?? "");
        setIsActive(data.is_active);
      }
      setLoading(false);
    };

    fetchFacility();
  }, [facilityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("facilities")
      .update({
        name: name.trim(),
        plan,
        notes: notes.trim() || null,
        is_active: isActive,
      })
      .eq("id", facilityId);

    if (updateError) {
      setError("更新に失敗しました: " + updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/facilities/${facilityId}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">読み込み中...</p>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sub">施設が見つかりません</p>
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
        <Link
          href={`/facilities/${facilityId}`}
          className="text-sm text-sub hover:text-foreground"
        >
          {facility.name}
        </Link>
        <span className="text-sm text-sub">/</span>
        <span className="text-sm text-foreground">編集</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">施設を編集</h1>

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
              required
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-sub/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">
              有効
            </label>
            <button
              id="is_active"
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-sub">
              {isActive ? "有効" : "無効"}
            </span>
          </div>

          {error && (
            <div className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/facilities/${facilityId}`)}
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
