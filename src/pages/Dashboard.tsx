import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { listProfiles, type Profile } from "@/services/devdossier";
import { formatNumber } from "@/utils/format";

const Dashboard = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setProfiles(await listProfiles());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalViews = profiles.reduce((s, p) => s + (p.view_count || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Saved dossiers</h1>
            <p className="mt-2 text-muted-foreground">
              Every profile generated on DevDossier, ranked by recency.
            </p>
          </div>
          <Link to="/generate">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
              Generate new <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Total profiles", value: profiles.length },
            { label: "Total views", value: totalViews },
            { label: "Total stars indexed", value: profiles.reduce((s, p) => s + (p.total_stars || 0), 0) },
          ].map((s) => (
            <Card key={s.label} className="bg-gradient-card glass p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {s.label}
              </div>
              <div className="mt-1 text-3xl font-bold">{formatNumber(s.value)}</div>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-gradient-card p-16 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="rounded-2xl border border-border bg-gradient-card p-16 text-center">
            <h2 className="text-xl font-semibold">No dossiers yet</h2>
            <p className="mt-2 text-muted-foreground">
              Generate your first profile to see it here.
            </p>
            <Link to="/generate">
              <Button className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow">
                Generate first profile
              </Button>
            </Link>
          </div>
        )}

        {!loading && profiles.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <Link
                key={p.id}
                to={`/profile/${p.github_username}`}
                className="group block"
              >
                <Card className="bg-gradient-card glass p-5 transition-all hover:border-primary/40 hover:-translate-y-1 hover:shadow-elevated h-full">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar_url ?? ""}
                      alt={p.github_username}
                      className="h-12 w-12 rounded-full border border-border"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate group-hover:text-primary transition-colors">
                        {p.name || p.github_username}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{p.github_username}
                      </div>
                    </div>
                  </div>
                  {p.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.bio}</p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {formatNumber(p.view_count)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning" /> {formatNumber(p.total_stars)}
                    </span>
                    <span className="ml-auto">{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
