import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Search, Settings, Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { Avatar } from "./kit";
import { InstallHint } from "./InstallHint";
import { accountCopy } from "@/lib/account-i18n";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, owner, online, recovery, user, settings } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/", label: t.tabHome, icon: Home },
    { to: "/food", label: t.tabFood, icon: Search },
    { to: "/symptoms", label: t.tabSymptoms, icon: Stethoscope },
    { to: "/reminders", label: t.tabReminders, icon: Bell },
    { to: "/profile", label: t.tabProfile, icon: User },
  ] as const;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/90 px-5 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
          <span className="font-display text-2xl font-semibold text-primary">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            aria-label={t.settings}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link to="/profile" aria-label={t.tabProfile}>
            <Avatar src={owner.photo} size={40} fallback="person" />
          </Link>
        </div>
      </header>
      <InstallHint />
      {!online && (
        <div
          role="status"
          className="mx-5 mb-2 rounded-2xl bg-warn-soft px-4 py-2 text-xs font-bold text-warn"
        >
          {t.offline}
        </div>
      )}
      {recovery && user && path !== "/profile" && (
        <Link
          to="/profile"
          className="mx-5 mb-2 rounded-2xl bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground"
        >
          {accountCopy[settings.lang].banner}
        </Link>
      )}
      <main className="flex-1 space-y-5 px-5 pb-44 pt-2">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur">
        <ul className="grid grid-cols-5 gap-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <li key={to} className="min-w-0">
                <Link
                  to={to}
                  className={cn(
                    "flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl px-0.5 py-1.5 text-[10px] font-bold leading-tight",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-11 items-center justify-center rounded-full",
                      active && "bg-secondary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="block w-full truncate text-center tracking-tight">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
