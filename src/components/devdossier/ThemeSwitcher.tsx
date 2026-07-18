import { Check, Lock, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ProfileTheme } from "@/services/devdossier";

interface ThemeOption {
  id: ProfileTheme;
  label: string;
  description: string;
  proOnly: boolean;
}

export const THEMES: ThemeOption[] = [
  { id: "default", label: "Default", description: "Dark navy · electric blue", proOnly: false },
  { id: "aurora", label: "Aurora", description: "Purple · blue · pink gradients", proOnly: true },
  { id: "terminal", label: "Terminal", description: "Black · green mono · hacker", proOnly: true },
  { id: "minimal", label: "Minimal Light", description: "White · clean · recruiter-ready", proOnly: true },
];

interface Props {
  value: ProfileTheme;
  isPro: boolean;
  onChange: (t: ProfileTheme) => void;
  onLockedClick?: () => void;
}

export function ThemeSwitcher({ value, isPro, onChange, onLockedClick }: Props) {
  const current = THEMES.find((t) => t.id === value) ?? THEMES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full bg-background/60 backdrop-blur border-border/60 text-xs"
          aria-label="Change profile card theme"
        >
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Card theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const locked = t.proOnly && !isPro;
          const active = t.id === value;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                if (locked) {
                  onLockedClick?.();
                  return;
                }
                if (!active) onChange(t.id);
              }}
              className="flex items-start gap-2 py-2 cursor-pointer"
            >
              <div className="mt-0.5 h-4 w-4 flex items-center justify-center">
                {active ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : locked ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{t.label}</span>
                  {t.proOnly && (
                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                      Pro
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {locked ? "Get Pro to unlock" : t.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}