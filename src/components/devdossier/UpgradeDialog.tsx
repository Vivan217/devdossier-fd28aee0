import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";

type Period = "monthly" | "annual";

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

function getRazorpay(): RazorpayConstructor | undefined {
  return (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
}

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgraded?: () => void;
  /** Navigate to /success after payment. Disable to stay and resume an action. */
  redirectOnSuccess?: boolean;
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
    if (getRazorpay()) return resolve(true);
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(getRazorpay())), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(getRazorpay()));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function UpgradeDialog({
  open,
  onOpenChange,
  onUpgraded,
  redirectOnSuccess = true,
}: UpgradeDialogProps) {
  const [period, setPeriod] = useState<Period>("annual");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const rzpRef = useRef<RazorpayInstance | null>(null);
  const navigate = useNavigate();
  const { refreshQuota } = useAuth();

  useEffect(() => {
    if (open) loadRazorpayScript();
  }, [open]);

  // Never keep a checkout instance around between opens — a stale instance
  // would re-open the previous (possibly expired) order.
  const discardCheckout = () => {
    try {
      rzpRef.current?.close?.();
    } catch {
      /* ignore */
    }
    rzpRef.current = null;
  };

  useEffect(() => {
    if (!open) discardCheckout();
    return () => discardCheckout();
  }, [open]);

  const startCheckout = async () => {
    discardCheckout();
    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      const Razorpay = getRazorpay();
      if (!ok || !Razorpay) {
        console.error("Razorpay checkout SDK is unavailable");
        throw new Error("Could not load Razorpay checkout. Please refresh and try again.");
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        headers: { "Cache-Control": "no-store" },
        body: { plan: period, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      });
      if (error) {
        console.error("Razorpay order creation request failed", {
          message: error.message,
          plan: period,
        });
        throw new Error(error.message);
      }
      if (data?.error) {
        console.error("Razorpay order creation API returned an error", {
          message: data.error,
          plan: period,
        });
        throw new Error(data.error);
      }

      console.info("Initiating Razorpay checkout", {
        orderId: data.order_id,
        amount: data.amount,
        currency: data.currency,
        plan: period,
      });
      const rzp: RazorpayInstance = new Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "DevDossier",
        description: `Pro · ${period === "annual" ? "Annual" : "Monthly"} plan`,
        prefill: { email: user.email ?? "" },
        theme: { color: "#3b82f6" },
        handler: async (response: RazorpaySuccessResponse) => {
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
            await refreshQuota();
            onUpgraded?.();
            if (redirectOnSuccess) navigate("/success");
          } catch (e: unknown) {
            console.error("Razorpay payment verification failed", e);
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
          escape: true,
          backdropclose: false,
          ondismiss: () => {
            setLoading(false);
            discardCheckout();
            toast.info("Checkout cancelled", {
              description: "No payment was taken.",
            });
          },
        },
      });
      rzpRef.current = rzp;
      rzp.on("payment.failed", (resp: RazorpayFailureResponse) => {
        console.error("Razorpay payment failed", {
          code: resp.error?.code,
          reason: resp.error?.reason,
          description: resp.error?.description,
        });
        setLoading(false);
        discardCheckout();
        toast.error("Payment failed", {
          description: resp?.error?.description || "Please try again.",
        });
      });
      rzp.open();
    } catch (e: unknown) {
      console.error("Razorpay checkout initiation failed", e);
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