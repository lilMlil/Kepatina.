import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform();

type RouterLike = {
  history: { back: () => void; push: (path: string) => void };
  state: { location: { pathname: string } };
};
let routerRef: RouterLike | null = null;

/** Set when a password-reset link is opened; the profile page then asks for a new password. */
export const RECOVERY_KEY = "kepatina/recovery";
export const RECOVERY_EVENT = "kepatina:recovery";
function markRecovery() {
  try {
    sessionStorage.setItem(RECOVERY_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(RECOVERY_EVENT));
}

/** Where the confirmation link should lead: back into the app on Android, the site address on the web. */
export function authRedirectUrl(): string | undefined {
  if (isNative()) return "lv.kepatina.app://auth-callback";
  return typeof window !== "undefined" ? window.location.origin : undefined;
}

/** Handles lv.kepatina.app://auth-callback#access_token=... (opened from the confirmation e-mail). */
async function handleAuthLink(url: string) {
  if (!url.startsWith("lv.kepatina.app://auth-callback")) return;
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const params = new URLSearchParams(
    hashIdx >= 0 ? url.slice(hashIdx + 1) : queryIdx >= 0 ? url.slice(queryIdx + 1) : "",
  );
  const { toast } = await import("sonner");
  const err = params.get("error_description") ?? params.get("error");
  if (err) {
    toast.error(err.replace(/\+/g, " "));
    return;
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = params.get("code");
  let error: { message: string } | null = null;
  if (access_token && refresh_token) {
    ({ error } = await supabase.auth.setSession({ access_token, refresh_token }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    return;
  }
  if (error) {
    toast.error(error.message);
  } else if (params.get("type") === "recovery") {
    markRecovery();
    routerRef?.history.push("/profile");
  } else {
    toast.success("✓");
  }
}

/** One-time native setup: Android back button, status bar, hide native splash. */
export function setupNative(router: RouterLike) {
  if (!isNative()) return;
  routerRef = router;
  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      await App.addListener("appUrlOpen", (e) => void handleAuthLink(e.url));
      const launch = await App.getLaunchUrl();
      if (launch?.url) void handleAuthLink(launch.url);
      await App.addListener("backButton", () => {
        if (router.state.location.pathname !== "/") router.history.back();
        else void App.exitApp();
      });
    } catch {
      /* plugin unavailable */
    }
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      if (platform() === "android") await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
    } catch {
      /* plugin unavailable */
    }
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    } catch {
      /* plugin unavailable */
    }
  })();
}

/** Keep the status bar readable in light and dark theme. */
export async function applyStatusBarTheme(theme: "light" | "dark") {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
    if (platform() === "android")
      await StatusBar.setBackgroundColor({ color: theme === "dark" ? "#14201a" : "#fbf9ea" });
  } catch {
    /* ignore */
  }
}

/** Current position: native plugin inside the app, browser API on the web. */
export async function getPosition(): Promise<{ lat: number; lon: number }> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      perm = await Geolocation.requestPermissions();
    }
    // Android 12+ lets the user share only an approximate location: that is enough here.
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      throw new Error("denied");
    }
    try {
      const p = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      });
      return { lat: p.coords.latitude, lon: p.coords.longitude };
    } catch {
      try {
        const p = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 300000,
        });
        return { lat: p.coords.latitude, lon: p.coords.longitude };
      } catch {
        throw new Error("unavailable");
      }
    }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? "denied" : "unavailable")),
      { timeout: 15000 },
    );
  });
}

/** Share plain text: system share sheet in the app, Web Share API in a browser. Returns false if unavailable. */
export async function shareText(title: string, text: string): Promise<boolean> {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, dialogTitle: title });
      return true;
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ title, text });
      return true;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError" || /cancel/i.test(String((e as Error).message))) return true;
  }
  return false;
}
