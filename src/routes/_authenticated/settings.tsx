import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Activity } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — GuardEngine" }] }),
  component: SettingsPage,
});

const DAILY_LIMIT = 10;

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null);
  const [usage, setUsage] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url").eq("id", user.id).maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("role", "user")
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);
      setProfile(prof as typeof profile);
      setUsage(count ?? 0);
    })();
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const initials =
    (profile?.full_name || user?.email || "?")
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  const pct = Math.min(100, (usage / DAILY_LIMIT) * 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your GuardEngine profile and usage.</p>

        <section className="mt-8 rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url ?? user?.user_metadata?.avatar_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{profile?.full_name || "Unnamed researcher"}</div>
              <div className="text-sm text-muted-foreground">{profile?.email ?? user?.email}</div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-surface/60 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" /> Query usage today
          </div>
          <div className="mt-3 text-2xl font-semibold">
            {usage} <span className="text-base font-normal text-muted-foreground">/ {DAILY_LIMIT} queries</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Free tier resets at midnight UTC.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-surface/60 p-6">
          <div className="text-sm font-medium">Account</div>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of GuardEngine on this device.</p>
          <Button onClick={signOut} variant="outline" className="mt-4">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
