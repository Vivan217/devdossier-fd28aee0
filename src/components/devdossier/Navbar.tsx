import { Link, useLocation, useNavigate } from "react-router-dom";
import { Github, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const link = (to: string, label: string) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`text-sm transition-colors ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
            <Github className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Dev<span className="text-primary">Dossier</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-6">
            {link("/", "Home")}
            {link("/generate", "Generate")}
            {link("/dashboard", "Dashboard")}
          </div>
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3 sm:pl-4 sm:border-l sm:border-border/40">
                  <span className="hidden md:inline text-xs text-muted-foreground max-w-[180px] truncate">
                    {user.email}
                  </span>
                  <Button
                    onClick={handleSignOut}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:pl-4 sm:border-l sm:border-border/40">
                  <Link to="/login">
                    <Button size="sm" variant="ghost" className="h-8">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button
                      size="sm"
                      className="h-8 bg-gradient-primary text-primary-foreground shadow-glow"
                    >
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
