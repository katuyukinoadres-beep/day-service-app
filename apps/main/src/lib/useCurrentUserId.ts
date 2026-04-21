"use client";

import { useEffect, useState } from "react";
import { createClient } from "@patto/shared/supabase/client";

// Resolves the signed-in Supabase user id. Used as the cache ownerId so that
// a sign-out or account switch does not serve a previous user's cached data.
export function useCurrentUserId(): { userId: string | null; ready: boolean } {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user?.id ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}
