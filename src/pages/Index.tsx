import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Github, Sparkles, Share2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [u, setU] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = u.trim().replace(/^@/, "");
    if (!clean) return;
    navigate(`/generate?u=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(212_100%_60%/0.15),transparent_60%)] pointer-events-none" />
          <div className="container mx-auto relative pt-20 pb-24 md:pt-32 md:pb-36 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary mb-8 animate-fade-in">
              <Sparkles className="h-3 w-3" /> AI-powered developer profiles
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] animate-fade-in-up">
              Your GitHub story,
              <br />
              <span className="text-gradient">told beautifully.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:120ms]">
              Turn any GitHub username into a clean, recruiter-friendly developer
              profile with an AI-generated narrative — in seconds.
            </p>

            <form
              onSubmit={submit}
              className="mt-10 mx-auto max-w-xl animate-fade-in-up [animation-delay:240ms]"
            >
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-elevated">
                <div className="flex-1 flex items-center gap-2 px-4">
                  <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={u}
                    onChange={(e) => setU(e.target.value)}
                    placeholder="Enter GitHub username e.g. torvalds"
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-11 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-glow"
                >
                  Generate Profile
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No signup required. Try{" "}
                {["torvalds", "gaearon", "sindresorhus"].map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setU(s)}
                    className="text-primary hover:underline mx-1"
                  >
                    {s}
                  </button>
                ))}
              </p>
            </form>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps. Zero friction.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Github,
                title: "1. Paste username",
                desc: "Drop any public GitHub handle into the box. We pull repos, languages, and commit data instantly.",
              },
              {
                icon: Sparkles,
                title: "2. AI writes your story",
                desc: "Our AI analyzes your code footprint and crafts a 2-3 line professional narrative — tuned for recruiters.",
              },
              {
                icon: Share2,
                title: "3. Share the link",
                desc: "Get a clean public profile at /profile/your-username. Drop it in resumes, DMs, and applications.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-border bg-gradient-card p-6 hover:border-primary/40 transition-all hover:-translate-y-1 hover:shadow-elevated"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto py-20">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-card p-10 md:p-16 text-center shadow-elevated">
            <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
            <div className="relative">
              <BarChart3 className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Stand out before the interview
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Recruiters spend 7 seconds on a profile. Make those seconds count.
              </p>
              <Link to="/generate">
                <Button size="lg" className="mt-6 bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
                  Build your dossier
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
