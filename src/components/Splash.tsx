import { useCallback, useEffect, useRef, useState } from "react";

// The animated logo plays once when the app opens, then fades out. It fills the WHOLE screen.
// Two versions exist: public/splash.gif (5:8, tablets) and public/splash-phone.gif (1:2, phones).
// The one whose proportions are closest to the screen is used, so almost nothing gets cropped.
const TABLET_GIF = "/splash.gif";
const PHONE_GIF = "/splash-phone.gif";
const TABLET_MIN_RATIO = 0.56; // width / height; between 0.5 (phone GIF) and 0.625 (tablet GIF)

function pickGif(): string {
  const ratio = window.innerWidth / Math.max(window.innerHeight, 1);
  return ratio >= TABLET_MIN_RATIO ? TABLET_GIF : PHONE_GIF;
}

const FADE_START_MS = 3900; // the GIF runs ~4.7 s; fade while the finished logo is still on screen
const FADE_MS = 600;
const MAX_WAIT_MS = 8000; // never block the app if the image is slow or fails
const BACKGROUND = "#fcfaf0"; // same cream as the GIF, so the edges blend in

export function Splash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  const [src, setSrc] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  const dismiss = useCallback(() => setPhase((p) => (p === "show" ? "fade" : p)), []);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setPhase("gone");
      return;
    }
    // The <img> is created only now, so the GIF always starts from its first frame.
    setSrc(pickGif());
    timers.current.push(window.setTimeout(dismiss, MAX_WAIT_MS));
    const all = timers.current;
    return () => all.forEach((id) => window.clearTimeout(id));
  }, [dismiss]);

  useEffect(() => {
    if (phase !== "fade") return;
    const id = window.setTimeout(() => setPhase("gone"), FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[100]"
      style={{
        background: BACKGROUND,
        opacity: phase === "fade" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      {src && (
        <img
          src={src}
          alt="Ķepatiņa"
          draggable={false}
          // Edge to edge: "cover" fills the entire screen with no side or top/bottom bars.
          className="absolute inset-0 h-full w-full select-none object-cover object-center"
          onLoad={() => {
            if (started.current) return;
            started.current = true;
            timers.current.push(window.setTimeout(dismiss, FADE_START_MS));
          }}
          onError={dismiss}
        />
      )}
    </div>
  );
}
