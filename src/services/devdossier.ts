import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export interface TopRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
}

export interface TopLanguage {
  name: string;
  count: number;
}

export async function generateProfile(username: string): Promise<Profile> {
  const { data, error } = await supabase.functions.invoke("generate-profile", {
    body: { username },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.profile as Profile;
}

export async function getProfile(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("github_username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function incrementViews(username: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_view_count", {
    p_username: username,
  });
  if (error) {
    console.error("view counter error", error);
    return null;
  }
  return data;
}
