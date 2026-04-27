import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Github, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { ProfileCard } from "@/components/devdossier/ProfileCard";
import { generateProfile, type Profile } from "@/services/devdossier";

const Generate = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get("u") ?? "";
  const [username, setUsername] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const run = async (name: string) => {
    const clean = name.trim().replace(/^@/, "");
    if (!clean) return;
    setLoading(true);
    setProfile(null);
    try {
      const p = await generateProfile(clean);
      setProfile(p);
      setParams({ u: clean }, { replace: true });
      toast.success("Profile generated", { description: `@${clean} is ready to share.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate profile";
      toast.error("Could not generate", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(username);
  };

  const copyShare = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.github_username}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: url });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto py-12 md:py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Generate a dossier</h1>
          <p className="mt-3 text-muted-foreground">
            Enter a GitHub username — we'll do the rest.
          </p>
          <form onSubmit={submit} className="mt-8">
            <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-card">
              <div className="flex-1 flex items-center gap-2 px-4">
                <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GitHub username"
                  disabled={loading}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-11 text-base"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading || !username.trim()}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    Generate <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-12 max-w-4xl mx-auto">
          {loading && (
            <div className="rounded-2xl border border-border bg-gradient-card p-10 text-center animate-fade-in">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground">
                Fetching repos, crunching stats, writing your story…
              </p>
            </div>
          )}

          {profile && !loading && (
            <>
              <ProfileCard profile={profile} showViews={false} />
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={copyShare} variant="outline" size="lg">
                  <Share2 className="mr-2 h-4 w-4" /> Copy share link
                </Button>
                <Link to={`/profile/${profile.github_username}`}>
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
                    View public profile
                    <ArrowRight className="ml-1 h-4 w-4" />
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

export default Generate;
