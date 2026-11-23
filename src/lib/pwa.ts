import { isNative } from "./native/platform";

/** True when the page runs as an installed app (opened from the iPhone home screen). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

/** iPhone / iPad (iPadOS pretends to be a Mac, so touch points are checked too). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/**
 * Registers the service worker (public/sw.js) so the installed app opens and works offline.
 * Skipped inside the native Capacitor app and during development.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || isNative()) return;
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* the app works without it, just not offline */
    });
  });
}
