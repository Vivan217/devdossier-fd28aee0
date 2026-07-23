import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { Seo } from "@/components/devdossier/Seo";
import { ProfileCard } from "@/components/devdossier/ProfileCard";
import {
  getProfile,
  incrementViews,
  setProfileTheme,
  userOwnsProfile,
  setFeaturedRepos,
  getFeaturedRepos,
  type FeaturedRepo,
  type Profile,
  type ProfileTheme,
} from "@/services/devdossier";
import { generateResumePdf } from "@/utils/resumePdf";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/devdossier/UpgradeDialog";

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [theme, setTheme] = useState<ProfileTheme>("default");
  const [isOwner, setIsOwner] = useState(false);
  const [featured, setFeatured] = useState<FeaturedRepo[]>([]);
  const { isPro, user } = useAuth();

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await getProfile(username);
        if (cancelled) return;
        if (!p) {
          setNotFound(true);
        } else {
          // bump view count and reflect locally
          const newCount = await incrementViews(username);
          setProfile({ ...p, view_count: newCount ?? p.view_count + 1 });
          setTheme(((p as unknown as { theme?: ProfileTheme }).theme) ?? "default");
          setFeatured(getFeaturedRepos(p));
          // SEO title
          document.title = `${p.name || p.github_username} — DevDossier`;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    if (!user || !username) {
      setIsOwner(false);
      return;
    }
    userOwnsProfile(user.id, username).then((v) => {
      if (!cancelled) setIsOwner(v);
    });
    return () => {
      cancelled = true;
    };
  }, [user, username]);

  const handleThemeChange = async (t: ProfileTheme) => {
    if (!profile) return;
    const prev = theme;
    setTheme(t);
    try {
      await setProfileTheme(profile.github_username, t);
      toast.success("Theme updated");
    } catch (e) {
      setTheme(prev);
      const msg = e instanceof Error ? e.message : "Could not change theme";
      toast.error("Theme change failed", { description: msg });
    }
  };

  const handleFeaturedChange = async (next: FeaturedRepo[]) => {
    if (!profile) return;
    const prev = featured;
    setFeatured(next);
    try {
      const saved = await setFeaturedRepos(profile.github_username, next);
      setFeatured(saved);
    } catch (e) {
      setFeatured(prev);
      toast.error("Could not update Featured", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const copyShare = async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
    const shareUrl = `https://${projectId}.supabase.co/functions/v1/profile-og?u=${encodeURIComponent(username ?? "")}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied", {
      description: "Includes a rich social preview.",
    });
  };

  const downloadPdf = async () => {
    if (!profile) return;
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setDownloading(true);
    try {
      const publicUrl = `${window.location.origin}/profile/${profile.github_username}`;
      await generateResumePdf({ ...profile, featured_repos: featured as unknown as Profile["featured_repos"] }, publicUrl);
      toast.success("Resume downloaded");
    } catch (e) {
      toast.error("Could not generate PDF", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {profile ? (
        <Seo
          title={`${profile.name || profile.github_username}'s Developer Story | DevDossier`}
          description={
            profile.bio
              ? `${profile.bio.slice(0, 155)}${profile.bio.length > 155 ? "…" : ""}`
              : `Developer with ${profile.total_stars ?? 0} stars across ${profile.public_repos ?? 0} repos on GitHub.`
          }
          path={`/profile/${profile.github_username}`}
          image={profile.avatar_url || `https://github.com/${profile.github_username}.png`}
          type="profile"
          jsonLd={[
            {
              "@context": "https://schema.org",
              "@type": "ProfilePage",
              mainEntity: {
                "@type": "Person",
                name: profile.name || profile.github_username,
                alternateName: profile.github_username,
                image: profile.avatar_url || `https://github.com/${profile.github_username}.png`,
                description: profile.bio ?? undefined,
                url: `https://devdossier.lovable.app/profile/${profile.github_username}`,
                sameAs: [`https://github.com/${profile.github_username}`],
              },
            },
          ]}
        />
      ) : (
        <Seo
          title={`@${username ?? ""} — DevDossier`}
          description="Recruiter-friendly GitHub developer story powered by AI."
          path={`/profile/${username ?? ""}`}
        />
      )}
      <Navbar />
      <main className="flex-1 container mx-auto py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          {loading && (
            <div className="rounded-2xl border border-border bg-gradient-card p-16 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
            </div>
          )}

          {!loading && notFound && (
            <div className="rounded-2xl border border-border bg-gradient-card p-16 text-center">
              <h2 className="text-2xl font-bold">Profile not found</h2>
              <p className="mt-2 text-muted-foreground">
                No DevDossier exists for <span className="text-foreground">@{username}</span> yet.
              </p>
              <Link to={`/generate?u=${encodeURIComponent(username ?? "")}`}>
                <Button className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow">
                  Generate it now
                </Button>
              </Link>
            </div>
          )}

          {!loading && profile && (
            <>
              <ProfileCard
                profile={profile}
                isPro={isPro}
                theme={theme}
                canEditTheme={isOwner}
                onThemeChange={handleThemeChange}
                onUpgrade={() => setUpgradeOpen(true)}
                featured={featured}
                canEditFeatured={isOwner}
                onFeaturedChange={handleFeaturedChange}
              />
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={copyShare} variant="outline" size="lg">
                  <Share2 className="mr-2 h-4 w-4" /> Copy share link
                </Button>
                <Button
                  onClick={downloadPdf}
                  variant="outline"
                  size="lg"
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPro ? (
                    <Download className="mr-2 h-4 w-4" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {downloading ? "Generating…" : isPro ? "Download PDF resume" : "Download PDF · Pro"}
                </Button>
                <Link to={`/generate?u=${encodeURIComponent(profile.github_username)}`}>
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
                    Refresh dossier
                  </Button>
                </Link>
              </div>
              <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProfile;
