import { Link } from "react-router-dom";
import { Eye, GitFork, MapPin, Star, Users, ExternalLink, Sparkles, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber, langColor } from "@/utils/format";
import type { Profile, ProfileTheme, TopRepo, TopLanguage } from "@/services/devdossier";
import { ThemeSwitcher } from "@/components/devdossier/ThemeSwitcher";

interface Props {
  profile: Profile;
  showViews?: boolean;
  onUpgrade?: () => void;
  isPro?: boolean;
  theme?: ProfileTheme;
  canEditTheme?: boolean;
  onThemeChange?: (t: ProfileTheme) => void;
}

export function ProfileCard({
  profile,
  showViews = true,
  onUpgrade,
  isPro = true,
  theme,
  canEditTheme = false,
  onThemeChange,
}: Props) {
  const repos = (profile.top_repos as unknown as TopRepo[]) || [];
  const langs = (profile.top_languages as unknown as TopLanguage[]) || [];
  const activeTheme: ProfileTheme =
    (theme ?? ((profile as unknown as { theme?: ProfileTheme }).theme) ?? "default");

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
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {repos.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="dd-repo-card group rounded-xl border border-border bg-card-elevated/50 p-4 hover:border-primary/50 hover:bg-card-elevated transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {r.name}
                  </span>
                  <ExternalLink className="dd-muted h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
                {r.description && (
                  <p className="dd-muted mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {r.description}
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
