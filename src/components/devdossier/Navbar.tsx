import { Link, useLocation } from "react-router-dom";
import { Github } from "lucide-react";

export function Navbar() {
  const { pathname } = useLocation();
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
        <nav className="flex items-center gap-6">
          {link("/", "Home")}
          {link("/generate", "Generate")}
          {link("/dashboard", "Dashboard")}
        </nav>
      </div>
    </header>
  );
}
