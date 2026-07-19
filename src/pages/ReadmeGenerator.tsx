import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Copy, Download, Github, Sparkles, FileCode2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { Seo } from "@/components/devdossier/Seo";
import { toast } from "@/components/ui/sonner";
import { getProfile, type Profile, type TopRepo, type TopLanguage } from "@/services/devdossier";

function buildReadme(p: Profile): string {
  const langs = ((p.top_languages as unknown as TopLanguage[]) ?? []).slice(0, 6);
  const repos = ((p.top_repos as unknown as TopRepo[]) ?? []).slice(0, 6);
  const name = p.name || p.github_username;
  const bio = p.bio ? `> ${p.bio}\n\n` : "";
  const summary = p.ai_summary ? `${p.ai_summary}\n\n` : "";

  const langLine = langs.length
    ? `**Top languages:** ${langs.map((l) => `\`${l.name}\``).join(" · ")}\n\n`
    : "";

  const stats =
    `![Followers](https://img.shields.io/github/followers/${p.github_username}?style=for-the-badge&color=3b82f6&labelColor=0f172a) ` +
    `![Stars](https://img.shields.io/github/stars/${p.github_username}?style=for-the-badge&color=3b82f6&labelColor=0f172a) ` +
    `\n\n`;

  const statsTable =
    `| Metric | Value |\n| --- | --- |\n` +
    `| Public repos | ${p.public_repos ?? 0} |\n` +
    `| Followers | ${p.followers ?? 0} |\n` +
    `| Following | ${p.following ?? 0} |\n` +
    `| Total stars | ${p.total_stars ?? 0} |\n\n`;

  const repoList = repos.length
    ? `### Pinned work\n\n` +
      repos
        .map(
          (r) =>
            `- [**${r.name}**](${r.url}) — ${r.description ?? "No description"}  \n  ⭐ ${r.stars} · 🍴 ${r.forks}${r.language ? ` · ${r.language}` : ""}`,
        )
        .join("\n") +
      "\n\n"
    : "";

  const footer = `---\n\n*Generated with [DevDossier](https://devdossier.lovable.app) — the AI GitHub profile README generator.*\n`;

  return (
    `### Hi, I'm ${name} 👋\n\n` +
    bio +
    summary +
    stats +
    langLine +
    statsTable +
    repoList +
    footer
  );
}

const ReadmeGenerator = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get("u") ?? "";
  const [username, setUsername] = useState(initial);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const markdown = useMemo(() => (profile ? buildReadme(profile) : ""), [profile]);

  const load = async (name: string) => {
    const clean = name.trim().replace(/^@/, "");
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    try {
      const p = await getProfile(clean);
      if (!p) {
        setNotFound(true);
      } else {
        setProfile(p);
      }
    } catch (e) {
      toast.error("Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) load(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, "");
    if (!clean) return;
    setParams({ u: clean });
    load(clean);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    toast.success("README markdown copied");
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="GitHub README Generator — AI Profile README.md | DevDossier"
        description="Free GitHub README generator. Turn your GitHub profile into a polished README.md with AI-written bio, stats, top languages, and pinned repos in one click."
        path="/readme-generator"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "DevDossier GitHub README Generator",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          description:
            "AI-powered GitHub Profile README.md generator. Create a beautiful README from any GitHub username in seconds.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
          <div className="container mx-auto relative pt-16 pb-10 md:pt-24 md:pb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary mb-6">
              <Sparkles className="h-3 w-3" /> GitHub Profile README generator
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Generate a stunning
              <br />
              <span className="text-gradient">GitHub README.md</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter any GitHub username. We turn your dossier — AI summary, stats,
              top languages, and pinned repos — into a copy-paste README.md for
              your profile.
            </p>

            <form onSubmit={submit} className="mt-8 mx-auto max-w-xl">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-elevated">
                <div className="flex-1 flex items-center gap-2 px-4">
                  <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="GitHub username e.g. torvalds"
                    aria-label="GitHub username"
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-11 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  {loading ? "Loading…" : "Generate README"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="container mx-auto pb-24">
          {notFound && (
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card/60 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No dossier found for <span className="text-foreground font-medium">@{username}</span>.
                Create one first, then come back to export the README.
              </p>
              <Link to={`/generate?u=${encodeURIComponent(username)}`}>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                  Create dossier <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {profile && (
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCode2 className="h-4 w-4" />
                  README.md preview for <span className="text-foreground font-medium">@{profile.github_username}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copy}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={download}
                    className="bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                  </Button>
                </div>
              </div>
              <Textarea
                readOnly
                value={markdown}
                className="min-h-[520px] font-mono text-xs bg-card/60 backdrop-blur-xl border-border"
                aria-label="Generated README markdown"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Paste this into <code className="text-foreground">{profile.github_username}/{profile.github_username}/README.md</code> — GitHub renders it on your profile automatically.
              </p>
            </div>
          )}

          {!profile && !notFound && !loading && (
            <div className="mx-auto max-w-3xl grid md:grid-cols-3 gap-4">
              {[
                { t: "AI-written bio", d: "Two crisp lines that summarize what you build." },
                { t: "Live stats badges", d: "Followers and stars auto-update via shields.io." },
                { t: "Pinned repos", d: "Your top projects with descriptions and stack." },
              ].map((f) => (
                <div key={f.t} className="rounded-xl border border-border bg-card/60 p-5">
                  <div className="text-sm font-semibold">{f.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ReadmeGenerator;