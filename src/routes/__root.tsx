import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Splash } from "@/components/Splash";
import { Toaster } from "@/components/ui/sonner";
import { dicts, type Lang } from "@/lib/i18n";
import { PrimaryButton } from "@/components/kit";
import { supabaseConfigured } from "@/integrations/supabase/client";

// Root fallbacks can render without AppProvider; restore only their saved language.
function useFallbackCopy() {
  const [lang, setLang] = useState<Lang>("lv");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kepatina/settings-v1") ?? "{}");
      if (saved.lang === "lv" || saved.lang === "en" || saved.lang === "ru" || saved.lang === "fr")
        setLang(saved.lang);
    } catch {
      // Keep Latvian when saved settings cannot be read.
    }
  }, []);
  return dicts[lang];
}

function NotFoundComponent() {
  const t = useFallbackCopy();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.pageNotFound}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.pageNotFoundBody}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const t = useFallbackCopy();
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.pageLoadError}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.pageLoadErrorBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <PrimaryButton
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            {t.tryAgain}
          </PrimaryButton>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  // The finder's page (opened from a QR link) is shown without the app's menus.
  const bare = useRouterState({ select: (st) => st.location.pathname.startsWith("/found") });

  useEffect(() => {
    if (!supabaseConfigured)
      console.warn("[Ķepatiņa] Supabase is not configured: accounts and sync are disabled.");
  }, []);

  return (
    <AppProvider>
      {bare ? (
        <Outlet />
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
      <Toaster position="top-center" />
      {!bare && <Splash />}
    </AppProvider>
  );
}
