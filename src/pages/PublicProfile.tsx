import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { ProfileCard } from "@/components/devdossier/ProfileCard";
import { getProfile, incrementViews, type Profile } from "@/services/devdossier";

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  const copyShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  return (
    <div className="min-h-screen flex flex-col">
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
              <ProfileCard profile={profile} />
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={copyShare} variant="outline" size="lg">
                  <Share2 className="mr-2 h-4 w-4" /> Copy share link
                </Button>
                <Link to={`/generate?u=${encodeURIComponent(profile.github_username)}`}>
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
                    Refresh dossier
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProfile;
