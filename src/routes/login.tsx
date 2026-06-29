import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { DotField } from "@/components/DotField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ShieldCheck, Mail, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — GuardEngine" },
      { name: "description", content: "Sign in to GuardEngine to upload research papers and chat with verified AI." },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.9 2 2.7 6.2 2.7 11.3S6.9 20.6 12 20.6c7 0 9.3-4.9 9.3-7.4 0-.5-.05-.9-.13-1.3H12z"/>
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: String(result.error) });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setGoogleLoading(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send code", { description: error.message });
      return;
    }
    toast.success("Code sent", { description: `We emailed a 6-digit code to ${email}` });
    setStage("code");
  }

  async function verifyCode() {
    if (otp.length !== 6) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setVerifying(false);
    if (error) {
      toast.error("Invalid code", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <DotField />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 ring-glow">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">GuardEngine</span>
        </Link>

        <div className="w-full rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur-xl ring-glow-soft sm:p-8">
          {stage === "email" ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Sign in to GuardEngine</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Two ways in — both passwordless.
              </p>

              <Button
                onClick={handleGoogle}
                variant="outline"
                disabled={googleLoading}
                className="mt-6 w-full"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={sendCode} className="space-y-3">
                <div>
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="you@research.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={sending || !email}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {sending ? "Sending code…" : "Continue with email"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStage("email"); setOtp(""); }}
                className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h1 className="text-xl font-semibold tracking-tight">Enter your code</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="text-foreground">{email}</span>.
              </p>
              <div className="mt-6 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={verifyCode}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={verifyCode}
                disabled={otp.length !== 6 || verifying}
                className="mt-6 w-full"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify and sign in
              </Button>
              <button
                onClick={(e) => sendCode(e as unknown as React.FormEvent)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
                disabled={sending}
              >
                {sending ? "Resending…" : "Resend code"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in you agree to verified, source-grounded answers only.
        </p>
      </div>
    </div>
  );
}
