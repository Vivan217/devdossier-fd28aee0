import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { Navbar } from "@/components/devdossier/Navbar";
import { Seo } from "@/components/devdossier/Seo";
import { Footer } from "@/components/devdossier/Footer";
import { UpgradeDialog } from "@/components/devdossier/UpgradeDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  generateProfile,
  getProfile,
  type Profile,
} from "@/services/devdossier";
import { formatNumber } from "@/utils/format";
import { useAuth } from "@/contexts/AuthContext";

interface DossierRow {
  log_id: string;
  generated_at: string;
  username: string;
  profile: Profile | null;
}

interface AccountSettings {
  is_public: boolean;
  linkedin_url: string;
  portfolio_url: string;
  pro_until: string | null;
  billing_period: string | null;
}

const Dashboard = () => {
  const { user, quota, isPro, refreshQuota } = useAuth();
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [settings, setSettings] = useState<AccountSettings>({
    is_public: true,
    linkedin_url: "",
    portfolio_url: "",
    pro_until: null,
    billing_period: null,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadDossiers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from("generation_log")
        .select("id, github_username, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const unique = new Map<string, { log_id: string; created_at: string }>();
      (logs ?? []).forEach((l) => {
        if (!unique.has(l.github_username)) {
          unique.set(l.github_username, { log_id: l.id, created_at: l.created_at });
        }
      });

      const usernames = Array.from(unique.keys());
      const profiles = usernames.length
        ? (
            await supabase
              .from("profiles")
              .select("*")
              .in("github_username", usernames)
          ).data ?? []
        : [];
      const byName = new Map(profiles.map((p) => [p.github_username, p as Profile]));

      setRows(
        Array.from(unique.entries()).map(([username, meta]) => ({
          log_id: meta.log_id,
          generated_at: meta.created_at,
          username,
          profile: byName.get(username) ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
      toast.error("Could not load your dossiers");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as unknown as Record<string, unknown>;
      setSettings({
        is_public: (d.is_public as boolean | null) ?? true,
        linkedin_url: (d.linkedin_url as string | null) ?? "",
        portfolio_url: (d.portfolio_url as string | null) ?? "",
        pro_until: (d.pro_until as string | null) ?? null,
        billing_period: (d.billing_period as string | null) ?? null,
      });
    }
  }, [user]);

  useEffect(() => {
    loadDossiers();
    loadSettings();
  }, [loadDossiers, loadSettings]);

  const totalViews = useMemo(
    () => rows.reduce((s, r) => s + (r.profile?.view_count || 0), 0),
    [rows],
  );

  const used = quota?.used_today ?? 0;
  const dailyLimit = quota?.daily_limit ?? 3;

  const publicUrl = (u: string) => `${window.location.origin}/profile/${u}`;

  const handleCopy = async (u: string) => {
    await navigator.clipboard.writeText(publicUrl(u));
    toast.success("Link copied", { description: publicUrl(u) });
  };

  const handleRegenerate = async (u: string) => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setRegenerating(u);
    try {
      await generateProfile(u);
      const fresh = await getProfile(u);
      setRows((prev) =>
        prev.map((r) => (r.username === u ? { ...r, profile: fresh } : r)),
      );
      toast.success("Dossier refreshed", { description: `@${u} updated.` });
      refreshQuota();
    } catch (e) {
      toast.error("Could not regenerate", {
        description: e instanceof Error ? e.message : "Try again shortly.",
      });
    } finally {
      setRegenerating(null);
    }
  };

  const handleDelete = async (logId: string, username: string) => {
    if (!user) return;
    if (!confirm(`Remove @${username} from your dashboard?`)) return;
    const { error } = await supabase
      .from("generation_log")
      .delete()
      .eq("user_id", user.id)
      .eq("github_username", username);
    if (error) {
      toast.error("Could not delete", { description: error.message });
      return;
    }
    setRows((prev) => prev.filter((r) => r.username !== username));
    toast.success("Removed from dashboard");
    refreshQuota();
  };

  const saveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from("user_accounts")
      .update({
        is_public: settings.is_public,
        linkedin_url: settings.linkedin_url || null,
        portfolio_url: settings.portfolio_url || null,
      } as never)
      .eq("user_id", user.id);
    setSavingSettings(false);
    if (error) {
      toast.error("Could not save", { description: error.message });
      return;
    }
    toast.success("Settings saved");
  };

  const renewal = settings.pro_until
    ? new Date(settings.pro_until).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Your Dashboard — DevDossier"
        description="Manage your saved GitHub dossiers, track views, and refresh your recruiter-ready developer story."
        path="/dashboard"
      />
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[420px] w-[420px] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-[360px] w-[360px] rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      <Navbar />
      <main className="flex-1 container mx-auto py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Your dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage every dossier you've generated, in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isPro && (
              <Button
                size="lg"
                onClick={() => setUpgradeOpen(true)}
                className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] hover:opacity-95"
              >
                <Zap className="mr-1 h-4 w-4" /> Upgrade to Pro
              </Button>
            )}
            <Link to="/generate">
              <Button
                size="lg"
                variant="outline"
                className="border-border/60 bg-card/40 backdrop-blur-xl"
              >
                New dossier <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {/* Views */}
          <Card className="relative overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl p-6 md:col-span-2">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Total profile views
                </div>
                <div className="mt-3 text-5xl font-bold tracking-tight">
                  {formatNumber(totalViews)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Across {rows.length} dossier{rows.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>

          {/* Quota / Pro */}
          <Card className="relative overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl p-6">
            {isPro ? (
              <>
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-600/15" />
                <div className="absolute inset-0 -z-10 rounded-lg [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] p-px bg-gradient-to-r from-blue-500/60 to-purple-600/60 opacity-60" />
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
                    Pro plan · Active
                  </span>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Unlimited generations
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {renewal
                    ? `Renews / expires ${renewal}`
                    : "Thanks for supporting DevDossier."}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Daily quota
                  </div>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {used}
                  <span className="text-muted-foreground text-xl">/{dailyLimit}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Generated today
                </div>
                <Progress
                  value={dailyLimit > 0 ? (used / dailyLimit) * 100 : 0}
                  className="mt-4 h-1.5 bg-secondary/60"
                />
              </>
            )}
          </Card>
        </div>

        {/* Dossiers grid */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">My generated dossiers</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Every profile you've created on DevDossier.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-16 text-center">
              <Loader2 className="h-7 w-7 mx-auto text-primary animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 backdrop-blur-xl p-16 text-center">
              <h3 className="text-lg font-semibold">No dossiers yet</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                Generate your first profile to see it here.
              </p>
              <Link to="/generate">
                <Button className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-glow">
                  Generate first profile
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => {
                const p = r.profile;
                const langs = (p?.top_languages as Array<{ name: string }> | null) ?? [];
                return (
                  <Card
                    key={r.username}
                    className="group relative overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <img
                        src={p?.avatar_url ?? `https://github.com/${r.username}.png`}
                        alt={r.username}
                        className="h-12 w-12 rounded-full border border-border"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">
                          {p?.name || r.username}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{r.username}
                        </div>
                      </div>
                    </div>

                    {langs.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {langs.slice(0, 3).map((l) => (
                          <span
                            key={l.name}
                            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border border-border/70 bg-background/50 text-muted-foreground"
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatNumber(p?.view_count ?? 0)}
                      </span>
                      <span>{new Date(r.generated_at).toLocaleDateString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={publicUrl(r.username)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                            aria-label="View dossier"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>View public dossier</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCopy(r.username)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                            aria-label="Copy link"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Copy share link</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleRegenerate(r.username)}
                            disabled={regenerating === r.username}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                              isPro
                                ? "hover:bg-primary/10 hover:text-primary text-muted-foreground"
                                : "text-muted-foreground/60"
                            }`}
                            aria-label="Regenerate"
                          >
                            {regenerating === r.username ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isPro ? (
                              <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isPro ? "Regenerate AI narrative" : "Pro only — upgrade to regenerate"}
                        </TooltipContent>
                      </Tooltip>

                      <div className="flex-1" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDelete(r.log_id, r.username)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Remove from dashboard</TooltipContent>
                      </Tooltip>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Settings */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Profile visibility and links shown on your shared dossiers.
            </p>
          </div>

          <Card className="border-border/60 bg-card/40 backdrop-blur-xl p-6">
            <div className="flex items-start justify-between gap-6 pb-6 border-b border-border/60">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                  {settings.is_public ? (
                    <Globe className="h-4 w-4 text-primary" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    Profile visibility — {settings.is_public ? "Public" : "Private"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {settings.is_public
                      ? "Your dossiers are reachable by anyone with the link."
                      : "Only you can see your dossiers from your dashboard."}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.is_public}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, is_public: v }))
                }
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/your-handle"
                  value={settings.linkedin_url}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, linkedin_url: e.target.value }))
                  }
                  className="bg-background/40 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio URL</Label>
                <Input
                  id="portfolio"
                  placeholder="https://your-portfolio.com"
                  value={settings.portfolio_url}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, portfolio_url: e.target.value }))
                  }
                  className="bg-background/40 border-border/60"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={saveSettings}
                disabled={savingSettings}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              >
                {savingSettings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save settings
              </Button>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onUpgraded={() => {
          refreshQuota();
          loadSettings();
        }}
      />
    </div>
  );
};

export default Dashboard;
