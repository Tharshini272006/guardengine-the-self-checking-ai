import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DotField } from "@/components/DotField";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ShieldCheck, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export function AppShell({ children, sidebar }: { children: ReactNode; sidebar?: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials =
    (user?.user_metadata?.full_name || user?.email || "?")
      .toString()
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "?";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-40">
        <DotField baseOpacity={0.12} intensity={0.7} />
      </div>

      {sidebar && (
        <aside className="relative z-10 hidden w-72 shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-xl md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
            <div className="grid h-7 w-7 place-items-center rounded-md border border-primary/40 bg-primary/10">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">GuardEngine</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">{sidebar}</div>
        </aside>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="grid h-7 w-7 place-items-center rounded-md border border-primary/40 bg-primary/10">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">GuardEngine</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-2 py-1 hover:bg-surface">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
