import { useEffect, useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type Period = "monthly" | "annual";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgraded?: () => void;
}

const PLANS: Record<Period, { label: string; price: string; sub: string; bullet: string }> = {
  monthly: {
    label: "Monthly",
    price: "₹99",
    sub: "per month",
    bullet: "Cancel anytime",
  },
  annual: {
    label: "Annual",
    price: "₹799",
    sub: "per year",
    bullet: "Save ~33% vs monthly",
  },
};

const FEATURES = [
  "Unlimited dossier generations",
  "Priority AI summaries",
  "Early access to new templates",
  "Support indie development",
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function UpgradeDialog({ open, onOpenChange, onUpgraded }: UpgradeDialogProps) {
  const [period, setPeriod] = useState<Period>("annual");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (open) loadRazorpayScript();
  }, [open]);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load Razorpay checkout");

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: { plan: period },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "DevDossier",
        description: `Pro · ${period === "annual" ? "Annual" : "Monthly"} plan`,
        prefill: { email: user.email ?? "" },
        theme: { color: "#3b82f6" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setVerifying(true);
          const verifyToast = toast.loading("Processing payment…", {
            description: "Verifying your payment securely.",
          });
          try {
            const { data: vd, error: vErr } = await supabase.functions.invoke(
              "razorpay-verify-payment",
              { body: response },
            );
            if (vErr) throw new Error(vErr.message);
            if (vd?.error) throw new Error(vd.error);
            toast.success("Welcome to Pro 🎉", {
              id: verifyToast,
              description: "Unlimited generations are now unlocked.",
            });
            onOpenChange(false);
            onUpgraded?.();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Verification failed";
            toast.error("Payment verification failed", {
              id: verifyToast,
              description: msg,
            });
          } finally {
            setVerifying(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        toast.error("Payment failed", {
          description: resp?.error?.description || "Please try again.",
        });
      });
      rzp.open();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      toast.error("Checkout error", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card/90 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-5 w-5 text-primary" /> Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlimited dossiers. Cancel anytime. Test mode — use Razorpay test cards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {(Object.keys(PLANS) as Period[]).map((p) => {
            const plan = PLANS[p];
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border bg-background/40 hover:border-primary/40"
                }`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {plan.label}
                </div>
                <div className="mt-1 text-2xl font-bold">{plan.price}</div>
                <div className="text-xs text-muted-foreground">{plan.sub}</div>
                <div className="mt-2 text-xs text-primary">{plan.bullet}</div>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={startCheckout}
          disabled={loading || verifying}
          size="lg"
          className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing payment…
            </>
          ) : loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening checkout…
            </>
          ) : (
            <>Pay {PLANS[period].price} · {PLANS[period].label}</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure checkout powered by Razorpay (test mode).
        </p>
      </DialogContent>
    </Dialog>
  );
}