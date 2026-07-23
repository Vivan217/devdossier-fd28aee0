import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export interface QuotaStatus {
  plan: "free" | "pro";
  used_today: number;
  daily_limit: number; // -1 means unlimited
  remaining: number; // Infinity for pro
}

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
  const { data, error } = await supabase.functions.invoke("increment-views", {
    body: { username },
  });
  if (error) {
    console.error("view counter error", error);
    return null;
  }
  return (data as { view_count?: number } | null)?.view_count ?? null;
}

export async function getQuotaStatus(userId: string): Promise<QuotaStatus | null> {
  const { data, error } = await supabase.rpc("get_quota_status", { p_user_id: userId });
  if (error) {
    console.error("quota status error", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const plan = row.plan as "free" | "pro";
  const used = row.used_today as number;
  const limit = row.daily_limit as number;
  return {
    plan,
    used_today: used,
    daily_limit: limit,
    remaining: limit < 0 ? Infinity : Math.max(0, limit - used),
  };
}

export type ProfileTheme = "default" | "aurora" | "terminal" | "minimal";

export interface FeaturedRepo {
  name: string;
  blurb: string;
}

export const MAX_FEATURED_REPOS = 3;
export const MAX_FEATURED_BLURB = 100;

export function getFeaturedRepos(profile: Profile): FeaturedRepo[] {
  const raw = (profile as unknown as { featured_repos?: unknown }).featured_repos;
  if (!Array.isArray(raw)) return [];
  const out: FeaturedRepo[] = [];
  for (const entry of raw) {
    if (out.length >= MAX_FEATURED_REPOS) break;
    const e = entry as { name?: unknown; blurb?: unknown } | null;
    if (!e || typeof e.name !== "string" || !e.name.trim()) continue;
    out.push({
      name: e.name,
      blurb: typeof e.blurb === "string" ? e.blurb : "",
    });
  }
  return out;
}

export function sortReposByFeatured(
  repos: TopRepo[],
  featured: FeaturedRepo[],
): TopRepo[] {
  const order = new Map(featured.map((f, i) => [f.name, i]));
  return [...repos].sort((a, b) => {
    const ai = order.has(a.name) ? (order.get(a.name) as number) : Infinity;
    const bi = order.has(b.name) ? (order.get(b.name) as number) : Infinity;
    return ai - bi;
  });
}

export async function setFeaturedRepos(
  username: string,
  featured: FeaturedRepo[],
): Promise<FeaturedRepo[]> {
  const { data, error } = await supabase.functions.invoke("set-featured-repos", {
    body: { username, featured },
  });
  if (error) throw new Error(error.message);
  return ((data as { featured?: FeaturedRepo[] })?.featured) ?? featured;
}

export async function setProfileTheme(
  username: string,
  theme: ProfileTheme,
): Promise<ProfileTheme> {
  const { data, error } = await supabase.functions.invoke("set-profile-theme", {
    body: { username, theme },
  });
  if (error) throw new Error(error.message);
  return ((data as { theme?: ProfileTheme })?.theme as ProfileTheme) ?? theme;
}

export async function userOwnsProfile(
  userId: string,
  username: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("generation_log")
    .select("id")
    .eq("user_id", userId)
    .eq("github_username", username)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
