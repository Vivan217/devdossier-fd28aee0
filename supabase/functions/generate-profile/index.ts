import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GhRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth: require valid JWT ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = claimsData.claims.sub as string;

    // ---- Service-role client for DB operations ----
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Quota check ----
    const { data: canGen, error: canGenErr } = await supabase.rpc("can_generate", {
      p_user_id: userId,
    });
    if (canGenErr) {
      console.error("can_generate error:", canGenErr);
      return new Response(
        JSON.stringify({ error: "Failed to check quota" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!canGen) {
      return new Response(
        JSON.stringify({
          error: "Daily limit reached. Free plan allows 3 dossiers per day. Upgrade to Pro for unlimited.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { username } = await req.json();
    if (!username || typeof username !== "string" || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUser = username.trim();

    // 1) Fetch GitHub user
    const userRes = await fetch(`https://api.github.com/users/${cleanUser}`, {
      headers: { "User-Agent": "DevDossier" },
    });
    if (userRes.status === 404) {
      return new Response(
        JSON.stringify({ error: `GitHub user "${cleanUser}" not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!userRes.ok) {
      const t = await userRes.text();
      console.error("GitHub user error:", userRes.status, t);
      return new Response(
        JSON.stringify({ error: "Failed to fetch GitHub user (rate limit?)" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const user = await userRes.json();

    // 2) Fetch repos (top 100 by updated)
    const reposRes = await fetch(
      `https://api.github.com/users/${cleanUser}/repos?per_page=100&sort=updated`,
      { headers: { "User-Agent": "DevDossier" } },
    );
    const allRepos: GhRepo[] = reposRes.ok ? await reposRes.json() : [];
    const repos = allRepos.filter((r) => !r.fork);

    // Aggregate stats
    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const langCount: Record<string, number> = {};
    for (const r of repos) {
      if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topRepos = [...repos]
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 3)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
      }));

    // 3) AI summary via Lovable AI
    let aiSummary = "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const prompt = `Write a 2-3 sentence professional developer narrative for a recruiter, in confident but humble tone. No emojis. No headings. Plain prose.

Developer: ${user.name || cleanUser} (@${cleanUser})
Bio: ${user.bio || "—"}
Public repos: ${user.public_repos}
Followers: ${user.followers}
Total stars across non-fork repos: ${totalStars}
Top languages: ${topLanguages.map((l) => l.name).join(", ") || "—"}
Notable projects: ${topRepos.map((r) => `${r.name} (${r.stars}★)${r.description ? " - " + r.description : ""}`).join(" | ") || "—"}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You write concise, professional developer profile summaries for recruiters." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (aiRes.status === 429) {
        aiSummary = "AI summary temporarily unavailable due to rate limits. Try again shortly.";
      } else if (aiRes.status === 402) {
        aiSummary = "AI credits exhausted on this workspace. Add funds to enable AI summaries.";
      } else if (aiRes.ok) {
        const data = await aiRes.json();
        aiSummary = data.choices?.[0]?.message?.content?.trim() || "";
      } else {
        console.error("AI gateway error:", aiRes.status, await aiRes.text());
        aiSummary = "AI summary unavailable.";
      }
    }

    // 4) Save to database (upsert)
    const profilePayload = {
      github_username: cleanUser,
      name: user.name || null,
      avatar_url: user.avatar_url || null,
      bio: user.bio || null,
      location: user.location || null,
      followers: user.followers || 0,
      following: user.following || 0,
      public_repos: user.public_repos || 0,
      total_stars: totalStars,
      top_languages: topLanguages,
      top_repos: topRepos,
      ai_summary: aiSummary,
    };

    const { data: saved, error: dbErr } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "github_username" })
      .select()
      .single();

    if (dbErr) {
      console.error("DB error:", dbErr);
      return new Response(
        JSON.stringify({ error: "Failed to save profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5) Log this generation (counts toward daily quota)
    const { error: logErr } = await supabase
      .from("generation_log")
      .insert({ user_id: userId, github_username: cleanUser });
    if (logErr) {
      console.error("generation_log insert error:", logErr);
      // non-fatal — profile was saved
    }

    return new Response(JSON.stringify({ profile: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
