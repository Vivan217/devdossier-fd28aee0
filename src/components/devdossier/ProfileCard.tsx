import { Link } from "react-router-dom";
import { useState } from "react";
import { Eye, GitFork, MapPin, Star, Users, ExternalLink, Sparkles, Lock, Pin, PinOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber, langColor } from "@/utils/format";
import {
  getFeaturedRepos,
  sortReposByFeatured,
  MAX_FEATURED_REPOS,
  MAX_FEATURED_BLURB,
  type FeaturedRepo,
  type Profile,
  type ProfileTheme,
  type TopRepo,
  type TopLanguage,
} from "@/services/devdossier";
import { ThemeSwitcher } from "@/components/devdossier/ThemeSwitcher";

interface Props {
  profile: Profile;
  showViews?: boolean;
  onUpgrade?: () => void;
  isPro?: boolean;
  theme?: ProfileTheme;
  canEditTheme?: boolean;
  onThemeChange?: (t: ProfileTheme) => void;
  featured?: FeaturedRepo[];
  canEditFeatured?: boolean;
  onFeaturedChange?: (next: FeaturedRepo[]) => void;
}

export function ProfileCard({
  profile,
  showViews = true,
  onUpgrade,
  isPro = true,
  theme,
  canEditTheme = false,
  onThemeChange,
  featured,
  canEditFeatured = false,
  onFeaturedChange,
}: Props) {
  const rawRepos = (profile.top_repos as unknown as TopRepo[]) || [];
  const langs = (profile.top_languages as unknown as TopLanguage[]) || [];
  const activeTheme: ProfileTheme =
    (theme ?? ((profile as unknown as { theme?: ProfileTheme }).theme) ?? "default");
  const activeFeatured: FeaturedRepo[] = featured ?? getFeaturedRepos(profile);
  const featuredMap = new Map(activeFeatured.map((f) => [f.name, f]));
  const repos = sortReposByFeatured(rawRepos, activeFeatured);
  const featuredCount = activeFeatured.length;

  const toggleFeatured = (name: string) => {
    if (!onFeaturedChange) return;
    if (featuredMap.has(name)) {
      onFeaturedChange(activeFeatured.filter((f) => f.name !== name));
    } else {
      if (featuredCount >= MAX_FEATURED_REPOS) return;
      onFeaturedChange([...activeFeatured, { name, blurb: "" }]);
    }
  };
  const updateBlurb = (name: string, blurb: string) => {
    if (!onFeaturedChange) return;
    onFeaturedChange(
      activeFeatured.map((f) =>
        f.name === name ? { ...f, blurb: blurb.slice(0, MAX_FEATURED_BLURB) } : f,
      ),
    );
  };

  return (
    <Card
      data-dd-theme={activeTheme}
      className="relative overflow-hidden bg-gradient-card glass shadow-elevated p-8 md:p-10 animate-scale-in"
    >
      {/* glow */}
      <div className="dd-glow-blob pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

      {canEditTheme && onThemeChange && (
        <div className="absolute top-4 right-4 z-10">
          <ThemeSwitcher
            value={activeTheme}
            isPro={isPro}
            onChange={onThemeChange}
            onLockedClick={onUpgrade}
          />
        </div>
      )}

      {/* Header */}
      <div className="relative flex flex-col md:flex-row gap-6 items-start">
        <div className="relative">
          <div className="dd-avatar-glow absolute inset-0 rounded-full bg-gradient-primary blur-md opacity-60" />
          <img
            src={profile.avatar_url ?? ""}
            alt={`${profile.github_username} avatar`}
            className="dd-avatar relative h-24 w-24 md:h-28 md:w-28 rounded-full border-2 border-primary/40 object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {profile.name || profile.github_username}
            </h1>
            <a
              href={`https://github.com/${profile.github_username}`}
              target="_blank"
              rel="noreferrer"
              className="dd-muted inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              @{profile.github_username}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {profile.bio && (
            <p className="mt-2 text-muted-foreground leading-relaxed">{profile.bio}</p>
          )}
          <div className="dd-muted mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {profile.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {formatNumber(profile.followers)} followers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-warning" /> {formatNumber(profile.total_stars)} stars
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5" /> {profile.public_repos} repos
            </span>
            {showViews && (
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> {formatNumber(profile.view_count)} views
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI summary */}
      {profile.ai_summary && (
        <div className="dd-ai relative mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="dd-ai-label flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> AI Narrative
          </div>
          <p className="mt-2 text-foreground leading-relaxed">{profile.ai_summary}</p>
        </div>
      )}
      {!profile.ai_summary && !isPro && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onUpgrade}
                className="relative mt-8 w-full text-left rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 hover:border-primary/60 hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold">
                  <Lock className="h-3.5 w-3.5" /> AI Narrative · Pro
                </div>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Unlock an AI-written, recruiter-friendly narrative that summarizes this
                  developer's GitHub story in 2–3 polished sentences.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                  Get Pro to enable →
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>AI narratives are a Pro feature</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Languages */}
      {langs.length > 0 && (
        <div className="relative mt-8">
          <h3 className="dd-muted text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Top Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {langs.map((l) => (
              <Badge
                key={l.name}
                variant="outline"
                className="dd-badge gap-1.5 border-border bg-card-elevated text-foreground py-1 px-3"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: langColor(l.name) }}
                />
                {l.name}
                <span className="dd-muted text-muted-foreground text-xs">{l.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Top repos */}
      {repos.length > 0 && (
        <div className="relative mt-8">
          <h3 className="dd-muted text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Notable Projects
            {canEditFeatured && (
              <span className="ml-2 normal-case tracking-normal text-[10px] text-muted-foreground/80">
                · Pin up to {MAX_FEATURED_REPOS} as Featured ({featuredCount}/{MAX_FEATURED_REPOS})
              </span>
            )}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {repos.map((r) => (
              <RepoCard
                key={r.name}
                repo={r}
                featured={featuredMap.get(r.name)}
                canEdit={canEditFeatured}
                canPinMore={featuredCount < MAX_FEATURED_REPOS}
                onToggle={toggleFeatured}
                onBlurbChange={updateBlurb}
              />
            ))}
          </div>
        </div>
      )}

      {showViews && (
        <div className="dd-muted relative mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Share: <Link to={`/profile/${profile.github_username}`} className="text-primary hover:underline">/profile/{profile.github_username}</Link>
          </span>
          <span>Last refreshed {new Date(profile.updated_at).toLocaleDateString()}</span>
        </div>
      )}
    </Card>
  );
}

interface RepoCardProps {
  repo: TopRepo;
  featured?: FeaturedRepo;
  canEdit: boolean;
  canPinMore: boolean;
  onToggle: (name: string) => void;
  onBlurbChange: (name: string, blurb: string) => void;
}

function RepoCard({ repo: r, featured, canEdit, canPinMore, onToggle, onBlurbChange }: RepoCardProps) {
  const [editingBlurb, setEditingBlurb] = useState(false);
  const isFeatured = !!featured;
  const disablePin = canEdit && !isFeatured && !canPinMore;

  return (
    <div
      className={`dd-repo-card group relative rounded-xl border p-4 transition-all ${
        isFeatured
          ? "border-primary/60 bg-primary/5 shadow-glow"
          : "border-border bg-card-elevated/50 hover:border-primary/50 hover:bg-card-elevated"
      }`}
    >
      {canEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (disablePin) return;
                  onToggle(r.name);
                }}
                aria-label={isFeatured ? "Unpin from featured" : "Pin as featured"}
                aria-pressed={isFeatured}
                disabled={disablePin}
                className={`absolute top-2 right-2 z-10 rounded-md p-1.5 transition ${
                  isFeatured
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted"
                } ${disablePin ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {isFeatured ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isFeatured
                ? "Remove from Featured"
                : disablePin
                ? `Featured limit reached (${MAX_FEATURED_REPOS})`
                : "Pin as Featured"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <a href={r.url} target="_blank" rel="noreferrer" className="block">
        <div className="flex items-start justify-between gap-2 pr-6">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {r.name}
          </span>
          {!canEdit && <ExternalLink className="dd-muted h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </div>
        {isFeatured && (
          <Badge className="mt-1.5 gap-1 border-primary/40 bg-primary/15 text-primary hover:bg-primary/20 text-[10px] uppercase tracking-wider px-2 py-0" variant="outline">
            <Star className="h-2.5 w-2.5 fill-current" /> Featured
          </Badge>
        )}
        {r.description && (
          <p className="dd-muted mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {r.description}
          </p>
        )}
        {isFeatured && featured?.blurb && (
          <p className="mt-2 text-xs italic text-primary/90 leading-relaxed border-l-2 border-primary/40 pl-2">
            {featured.blurb}
          </p>
        )}
        <div className="dd-muted mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {r.language && (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: langColor(r.language) }}
              />
              {r.language}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" /> {formatNumber(r.stars)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="h-3 w-3" /> {formatNumber(r.forks)}
          </span>
        </div>
      </a>

      {canEdit && isFeatured && (
        <div className="mt-2">
          {editingBlurb ? (
            <div className="space-y-1">
              <Input
                autoFocus
                defaultValue={featured?.blurb ?? ""}
                maxLength={MAX_FEATURED_BLURB}
                placeholder="Why this matters (max 100 chars)"
                onBlur={(e) => {
                  onBlurbChange(r.name, e.target.value);
                  setEditingBlurb(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onBlurbChange(r.name, (e.target as HTMLInputElement).value);
                    setEditingBlurb(false);
                  }
                  if (e.key === "Escape") setEditingBlurb(false);
                }}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Enter to save · Esc to cancel</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingBlurb(true)}
              className="text-[11px] text-primary hover:underline"
            >
              {featured?.blurb ? "Edit blurb" : "+ Add a short blurb"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
