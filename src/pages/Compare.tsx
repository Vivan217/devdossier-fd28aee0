import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Github, Loader2, Trophy, Star, Users, GitFork, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { formatNumber, langColor } from "@/utils/format";

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  html_url: string;
}

interface GhRepo {
  name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
}

interface Aggregate {
  user: GhUser;
  totalStars: number;
  totalForks: number;
  topLanguages: { name: string; count: number }[];
  accountAgeYears: number;
}

async function fetchUser(username: string): Promise<Aggregate> {
  const clean = username.trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) {
    throw new Error(`Invalid username: ${username}`);
  }
  const uRes = await fetch(`https://api.github.com/users/${clean}`);
  if (uRes.status === 404) throw new Error(`@${clean} not found on GitHub`);
  if (!uRes.ok) throw new Error(`GitHub API error for @${clean}`);
  const user: GhUser = await uRes.json();

  const rRes = await fetch(`https://api.github.com/users/${clean}/repos?per_page=100&sort=updated`);
  const repos: GhRepo[] = rRes.ok ? await rRes.json() : [];
  const own = repos.filter((r) => !r.fork);
  const totalStars = own.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = own.reduce((s, r) => s + (r.forks_count || 0), 0);
  const langCount: Record<string, number> = {};
  for (const r of own) if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
  const created = new Date(user.created_at);
  const accountAgeYears = (Date.now() - created.getTime()) / (365.25 * 24 * 3600 * 1000);

  return { user, totalStars, totalForks, topLanguages, accountAgeYears };
}

function Metric({
  label,
  a,
  b,
  format = (n: number) => formatNumber(n),
  higherWins = true,
}: {
  label: string;
  a: number;
  b: number;
  format?: (n: number) => string;
  higherWins?: boolean;
}) {
  const aWins = higherWins ? a > b : a < b;
  const bWins = higherWins ? b > a : b < a;
  const cell = (v: number, win: boolean) => (
    <div
      className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
        win
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border/60 bg-card/40 text-muted-foreground"
      }`}
    >
      <div className="text-xl font-bold flex items-center justify-center gap-1.5">
        {win && <Trophy className="h-3.5 w-3.5 text-primary" />}
        {format(v)}
      </div>
    </div>
  );
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center mb-2">
        {label}
      </div>
      <div className="flex gap-3">
        {cell(a, aWins)}
        {cell(b, bWins)}
      </div>
    </div>
  );
}

function UserHeader({ agg }: { agg: Aggregate }) {
  const u = agg.user;
  return (
    <div className="text-center">
      <img
        src={u.avatar_url}
        alt={u.login}
        className="mx-auto h-24 w-24 rounded-full border-2 border-primary/40"
        loading="lazy"
      />
      <h2 className="mt-3 text-xl font-bold">{u.name || u.login}</h2>
      <a
        href={u.html_url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary hover:underline"
      >
        @{u.login}
      </a>
      {u.bio && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {u.bio}
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {u.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {u.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Since {new Date(u.created_at).getFullYear()}
        </span>
      </div>
    </div>
  );
}

function LangBars({
  a,
  b,
}: {
  a: { name: string; count: number }[];
  b: { name: string; count: number }[];
}) {
  const all = Array.from(
    new Set([...a.map((l) => l.name), ...b.map((l) => l.name)]),
  ).slice(0, 6);
  const max = Math.max(
    1,
    ...a.map((l) => l.count),
    ...b.map((l) => l.count),
  );
  const findCount = (list: { name: string; count: number }[], n: string) =>
    list.find((l) => l.name === n)?.count ?? 0;

  return (
    <div className="space-y-3">
      {all.map((name) => {
        const av = findCount(a, name);
        const bv = findCount(b, name);
        return (
          <div key={name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-muted-foreground">{av}</span>
              <div className="h-2 rounded-full bg-secondary/60 flex-1 max-w-[140px] overflow-hidden">
                <div
                  className="h-full float-right"
                  style={{
                    width: `${(av / max) * 100}%`,
                    backgroundColor: langColor(name),
                  }}
                />
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: langColor(name) }}
              />
              {name}
            </Badge>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full bg-secondary/60 flex-1 max-w-[140px] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${(bv / max) * 100}%`,
                    backgroundColor: langColor(name),
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{bv}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Compare = () => {
  const [params, setParams] = useSearchParams();
  const [u1, setU1] = useState(params.get("a") ?? "");
  const [u2, setU2] = useState(params.get("b") ?? "");
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState<Aggregate | null>(null);
  const [b, setB] = useState<Aggregate | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const A = u1.trim().replace(/^@/, "");
    const B = u2.trim().replace(/^@/, "");
    if (!A || !B) {
      toast.error("Enter both GitHub usernames");
      return;
    }
    if (A.toLowerCase() === B.toLowerCase()) {
      toast.error("Pick two different developers");
      return;
    }
    setLoading(true);
    setA(null);
    setB(null);
    try {
      const [ra, rb] = await Promise.all([fetchUser(A), fetchUser(B)]);
      setA(ra);
      setB(rb);
      setParams({ a: A, b: B }, { replace: true });
      document.title = `${A} vs ${B} — DevDossier Compare`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const winnerLabel = useMemo(() => {
    if (!a || !b) return null;
    let sa = 0;
    let sb = 0;
    const cmp = (x: number, y: number) => {
      if (x > y) sa++;
      else if (y > x) sb++;
    };
    cmp(a.totalStars, b.totalStars);
    cmp(a.user.followers, b.user.followers);
    cmp(a.user.public_repos, b.user.public_repos);
    cmp(a.totalForks, b.totalForks);
    cmp(a.accountAgeYears, b.accountAgeYears);
    if (sa === sb) return "It's a tie";
    return sa > sb ? `@${a.user.login} leads` : `@${b.user.login} leads`;
  }, [a, b]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto py-10 md:py-14">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Compare two <span className="text-gradient">developers</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Stack any two GitHub profiles head-to-head. No signup required.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] items-center p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-elevated"
          >
            <div className="flex items-center gap-2 px-3">
              <Github className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={u1}
                onChange={(e) => setU1(e.target.value)}
                placeholder="First username"
                className="border-0 bg-transparent focus-visible:ring-0 h-11"
              />
            </div>
            <div className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground">
              vs
            </div>
            <div className="flex items-center gap-2 px-3">
              <Github className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={u2}
                onChange={(e) => setU2(e.target.value)}
                placeholder="Second username"
                className="border-0 bg-transparent focus-visible:ring-0 h-11"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Compare <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {loading && (
            <div className="mt-12 rounded-2xl border border-border bg-gradient-card p-16 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              <p className="mt-3 text-sm text-muted-foreground">Fetching profiles…</p>
            </div>
          )}

          {!loading && a && b && (
            <div className="mt-10 space-y-8">
              {winnerLabel && (
                <div className="text-center">
                  <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 text-sm px-4 py-1.5">
                    <Trophy className="h-3.5 w-3.5 mr-1.5" /> {winnerLabel}
                  </Badge>
                </div>
              )}

              <Card className="p-6 md:p-8 bg-gradient-card glass">
                <div className="grid gap-8 md:grid-cols-2">
                  <UserHeader agg={a} />
                  <UserHeader agg={b} />
                </div>
              </Card>

              <Card className="p-6 md:p-8 bg-gradient-card glass">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-5 text-center">
                  Head-to-head
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Total stars" a={a.totalStars} b={b.totalStars} />
                  <Metric label="Followers" a={a.user.followers} b={b.user.followers} />
                  <Metric label="Following" a={a.user.following} b={b.user.following} />
                  <Metric label="Public repos" a={a.user.public_repos} b={b.user.public_repos} />
                  <Metric label="Total forks" a={a.totalForks} b={b.totalForks} />
                  <Metric
                    label="Account age (yrs)"
                    a={a.accountAgeYears}
                    b={b.accountAgeYears}
                    format={(n) => n.toFixed(1)}
                  />
                </div>
              </Card>

              <Card className="p-6 md:p-8 bg-gradient-card glass">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-5 text-center">
                  Top languages
                </h3>
                <LangBars a={a.topLanguages} b={b.topLanguages} />
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                Note: GitHub's public API doesn't expose full contribution streaks;
                stars, followers, and repo counts are shown instead.
              </p>
            </div>
          )}

          {!loading && !a && !b && (
            <div className="mt-10 grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
              {[
                ["torvalds", "gaearon"],
                ["sindresorhus", "tj"],
                ["yyx990803", "gaearon"],
              ].map(([x, y]) => (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  onClick={() => {
                    setU1(x);
                    setU2(y);
                  }}
                  className="rounded-xl border border-border/60 bg-card/40 p-3 hover:border-primary/40 transition-colors"
                >
                  Try <span className="text-primary">@{x}</span> vs{" "}
                  <span className="text-primary">@{y}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Compare;