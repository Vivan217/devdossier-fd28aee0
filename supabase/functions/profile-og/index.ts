import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Public HTML endpoint — no CORS restrictions needed; social crawlers hit it directly.
const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=600",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteOrigin(req: Request): string {
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch { /* ignore */ }
  }
  return "https://devdossier.lovable.app";
}

function renderHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirect?: string;
}): string {
  const { title, description, image, url, redirect } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />

<meta property="og:type" content="profile" />
<meta property="og:site_name" content="DevDossier" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="460" />
<meta property="og:image:height" content="460" />
<meta property="og:url" content="${esc(url)}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />

${redirect ? `<meta http-equiv="refresh" content="0; url=${esc(redirect)}" />` : ""}
</head>
<body>
<p>Redirecting to <a href="${esc(redirect ?? url)}">${esc(redirect ?? url)}</a>…</p>
${redirect ? `<script>location.replace(${JSON.stringify(redirect)})</script>` : ""}
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const username = (url.searchParams.get("u") ?? "").trim();
    const origin = siteOrigin(req);
    const shareUrl = `${origin}/profile/${encodeURIComponent(username)}`;
    const profileAppUrl = shareUrl;

    // Homepage fallback / invalid username → generic branding
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return new Response(
        renderHtml({
          title: "DevDossier — Your GitHub story, told beautifully",
          description:
            "Turn any GitHub username into a recruiter-friendly developer story.",
          image: `${origin}/placeholder.svg`,
          url: origin,
          redirect: origin,
        }),
        { headers: HTML_HEADERS },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select(
        "github_username, name, bio, avatar_url, total_stars, public_repos, top_languages",
      )
      .eq("github_username", username)
      .maybeSingle();

    if (!profile) {
      return new Response(
        renderHtml({
          title: `@${username} on DevDossier`,
          description:
            "Generate a recruiter-friendly developer story from any GitHub profile.",
          image: `https://github.com/${encodeURIComponent(username)}.png`,
          url: shareUrl,
          redirect: `${origin}/generate?u=${encodeURIComponent(username)}`,
        }),
        { headers: HTML_HEADERS },
      );
    }

    const displayName = profile.name || profile.github_username;
    const langs = Array.isArray(profile.top_languages)
      ? (profile.top_languages as Array<{ name?: string }>)
          .map((l) => (typeof l?.name === "string" ? l.name : null))
          .filter(Boolean)
          .slice(0, 2)
          .join(" & ")
      : "";
    const stars = profile.total_stars ?? 0;
    const repos = profile.public_repos ?? 0;
    const statsLine = [
      langs ? `specializing in ${langs}` : null,
      `${stars} stars across ${repos} repos`,
    ]
      .filter(Boolean)
      .join(", ");
    const description = profile.bio
      ? `${profile.bio.slice(0, 140)}${profile.bio.length > 140 ? "…" : ""}`
      : `Developer ${statsLine}.`;

    return new Response(
      renderHtml({
        title: `${displayName}'s Developer Story | DevDossier`,
        description,
        image:
          profile.avatar_url ||
          `https://github.com/${encodeURIComponent(username)}.png`,
        url: shareUrl,
        redirect: profileAppUrl,
      }),
      { headers: HTML_HEADERS },
    );
  } catch (e) {
    console.error("profile-og error", e);
    return new Response(
      renderHtml({
        title: "DevDossier",
        description:
          "Turn any GitHub username into a recruiter-friendly developer story.",
        image: "https://devdossier.lovable.app/placeholder.svg",
        url: "https://devdossier.lovable.app",
      }),
      { status: 200, headers: HTML_HEADERS },
    );
  }
});