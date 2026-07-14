import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/devdossier/Navbar";
import { Footer } from "@/components/devdossier/Footer";
import { Seo } from "@/components/devdossier/Seo";
import { useAuth } from "@/contexts/AuthContext";

const Success = () => {
  const { refreshQuota, isPro } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshQuota();
    const t = setTimeout(() => navigate("/generate"), 6000);
    return () => clearTimeout(t);
  }, [refreshQuota, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Welcome to Pro — DevDossier"
        description="Your DevDossier Pro upgrade is confirmed — unlimited dossiers and AI narratives unlocked."
        path="/success"
      />
      <Navbar />
      <main className="flex-1 container mx-auto py-16 flex items-center justify-center">
        <Card className="max-w-lg w-full bg-gradient-card glass p-10 text-center shadow-elevated animate-scale-in">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Pro 🎉</h1>
          <p className="mt-3 text-muted-foreground">
            {isPro
              ? "Your account is now Pro. Unlimited dossiers and AI narratives unlocked."
              : "Your payment is being finalized. Pro features will appear shortly."}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI narratives enabled
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/generate">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
                Generate a dossier <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline">
                Go to dashboard
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Redirecting you to /generate in a few seconds…
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Success;