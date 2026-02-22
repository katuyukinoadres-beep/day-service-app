"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface UseProfileResult {
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data as Profile | null);
      setLoading(false);
    };
    fetchProfile();
  }, []);

  return {
    profile,
    isAdmin: profile?.role === "admin",
    loading,
  };
}
