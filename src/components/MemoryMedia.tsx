import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Heart,
  Loader2,
  Pencil,
  Play,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocalFile } from "@/lib/media";
import { formatDate } from "@/lib/health";
import { isVideoFile, type MediaItem, type MemoryFile } from "@/lib/memories";
import { isNative, pushBackHandler } from "@/lib/native/platform";
import { useApp } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Android back button                                                 */
/* ------------------------------------------------------------------ */

/** While `active`, the Android back button calls `onBack` instead of leaving the page. */
export function useBackHandler(active: boolean, onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    if (!active) return undefined;
    return pushBackHandler(() => {
      latest.current();
      return true;
    });
  }, [active]);
}

/* ------------------------------------------------------------------ */
/* Loading files from the device storage                               */
/* ------------------------------------------------------------------ */

/** Object URL of a stored file (created while the component is mounted). */
export function useLocalUrl(file: MemoryFile | undefined, enabled = true) {
  const [state, setState] = useState<{ url: string | null; missing: boolean }>({
    url: null,
    missing: false,
  });
  const id = file?.id;
  useEffect(() => {
    if (!id || !enabled) {
      setState({ url: null, missing: false });
      return undefined;
    }
    let active = true;
    let objectUrl: string | undefined;
    setState({ url: null, missing: false });
    void getLocalFile(id)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setState({ url: null, missing: true });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, missing: false });
      })
      .catch(() => {
        if (active) setState({ url: null, missing: true });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, enabled]);
  return state;
}

const THUMB_WIDTH = 360;
/** Small JPEG thumbnails, kept for the whole session so scrolling the grid stays fast. */
const thumbCache = new Map<string, string>();

let running = 0;
const waiting: (() => void)[] = [];
/** Decode at most 3 photos at once so a big album does not exhaust the phone's memory. */
async function queued<T>(task: () => Promise<T>): Promise<T> {
  if (running >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function makeThumb(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: THUMB_WIDTH,
      resizeQuality: "medium",
    });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    return out ? URL.createObjectURL(out) : null;
  } catch {
    return null;
  }
}

/** Square-cropped preview of a photo or the first frame of a video. Loads only when scrolled into view. */
export function MediaCover({
  file,
  className,
}: {
  file: MemoryFile;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const video = isVideoFile(file);
  const [src, setSrc] = useState<string | null>(() => thumbCache.get(file.id) ?? null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const cached = thumbCache.get(file.id);
    setMissing(false);
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    setSrc(null);
    let active = true;
    let objectUrl: string | undefined;
    const load = () => {
      void queued(async () => {
        if (!active) return;
        const blob = await getLocalFile(file.id);
        if (!active) return;
        if (!blob) {
          setMissing(true);
          return;
        }
        if (!video) {
          const thumb = await makeThumb(blob);
          if (!active) {
            if (thumb) URL.revokeObjectURL(thumb);
            return;
          }
          if (thumb) {
            thumbCache.set(file.id, thumb);
            setSrc(thumb);
            return;
          }
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      }).catch(() => {
        if (active) setMissing(true);
      });
    };
    const el = ref.current;
    let observer: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            load();
          }
        },
        { rootMargin: "400px" },
      );
      observer.observe(el);
    } else {
      load();
    }
    return () => {
      active = false;
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, video]);

  return (
    <div ref={ref} className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      {src &&
        !missing &&
        (video ? (
          <video
            src={`${src}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            aria-label={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={src}
            alt={file.name}
            draggable={false}
            className="h-full w-full object-cover"
          />
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thumbnail tile of the grid                                          */
/* ------------------------------------------------------------------ */

export function MediaThumb({
  file,
  selecting,
  selected,
  overlay,
  onClick,
  onLongPress,
  className,
}: {
  file: MemoryFile;
  selecting?: boolean | undefined;
  selected?: boolean | undefined;
  /** Text drawn over the tile, e.g. "+3". */
  overlay?: string | undefined;
  onClick: () => void;
  onLongPress?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={file.name}
      aria-pressed={selecting ? !!selected : undefined}
      onPointerDown={() => {
        fired.current = false;
        if (!onLongPress) return;
        stop();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, 450);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onClick();
      }}
      className={cn(
        "relative aspect-square w-full select-none overflow-hidden rounded-lg bg-muted active:opacity-80",
        className,
      )}
    >
      <MediaCover file={file} />
      {isVideoFile(file) && !overlay && (
        <span className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
        </span>
      )}
      {file.favorite && !selecting && !overlay && (
        <Heart
          className="absolute bottom-1 right-1 h-4 w-4 fill-rose-400 text-rose-400 drop-shadow"
          aria-hidden="true"
        />
      )}
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
          {overlay}
        </span>
      )}
      {selecting && (
        <>
          {selected && <span className="absolute inset-0 bg-primary/30" />}
          <span
            className={cn(
              "absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white bg-black/30 text-transparent",
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useApp();
  useBackHandler(open, onClose);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-card text-foreground shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="min-w-0 truncate text-xl font-semibold text-primary">{title}</h2>
          <button
            type="button"
            aria-label={t.memoryClose}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Sharing a stored file                                               */
/* ------------------------------------------------------------------ */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const isCancel = (error: unknown) =>
  (error as Error | undefined)?.name === "AbortError" ||
  /cancel/i.test(String((error as Error | undefined)?.message ?? ""));

/** System share sheet (Android) / Web Share API / plain download (desktop browsers). */
export async function shareMemoryFile(file: MemoryFile, title: string): Promise<void> {
  const blob = await getLocalFile(file.id);
  if (!blob) throw new Error("missing");
  const name = file.name.replace(/[^\w.\- ]+/g, "_") || "file";

  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    try {
      await Filesystem.rmdir({ path: "kepatina-share", directory: Directory.Cache, recursive: true });
    } catch {
      /* nothing to clean */
    }
    const path = `kepatina-share/${name}`;
    await Filesystem.writeFile({
      path,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri], dialogTitle: title });
    } catch (error) {
      if (!isCancel(error)) throw error;
    }
    return;
  }

  const shareable = new File([blob], name, { type: file.type });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [shareable] })) {
    try {
      await navigator.share({ files: [shareable], title });
    } catch (error) {
      if (!isCancel(error)) throw error;
    }
    return;
  }
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/* ------------------------------------------------------------------ */
/* Full-screen viewer                                                  */
/* ------------------------------------------------------------------ */

interface View {
  s: number;
  x: number;
  y: number;
}
interface Point {
  x: number;
  y: number;
}
interface Gesture {
  pointers: Map<number, Point>;
  mode: "none" | "pan" | "swipe" | "dismiss" | "pinch";
  start: Point;
  startView: View;
  startMid: Point;
  startDist: number;
  t0: number;
  moved: boolean;
  vx: number;
  lastDx: number;
  lastDy: number;
  lastTap: number;
  lastTapPos: Point;
}

const IDENTITY: View = { s: 1, x: 0, y: 0 };
const MAX_ZOOM = 5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function pinchInfo(pointers: Map<number, Point>) {
  const pts = [...pointers.values()];
  const a = pts[0];
  const b = pts[1];
  if (!a || !b) return null;
  return {
    dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

function ViewerSlide({
  file,
  position,
  drag,
  dragging,
  current,
  view,
}: {
  file: MemoryFile;
  position: number;
  drag: Point;
  dragging: boolean;
  current: boolean;
  view: View;
}) {
  const { t } = useApp();
  const video = isVideoFile(file);
  // Only the visible video is loaded; neighbouring photos are loaded so swiping feels instant.
  const { url, missing } = useLocalUrl(file, !video || current);

  return (
    <div
      aria-hidden={!current}
      className="absolute inset-0 flex items-center justify-center"
      style={{
        transform: `translate3d(calc(${position * 100}% + ${drag.x}px), ${drag.y}px, 0)`,
        transition: dragging ? "none" : "transform 220ms ease-out",
      }}
    >
      {missing ? (
        <p className="px-8 text-center text-sm text-white/80">{t.memoryFileMissing}</p>
      ) : video && !current ? (
        <Play className="h-12 w-12 text-white/40" aria-hidden="true" />
      ) : !url ? (
        <Loader2 className="h-7 w-7 animate-spin text-white/60" aria-hidden="true" />
      ) : video ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={file.name}
          className="max-h-full max-w-full bg-black"
        />
      ) : (
        <img
          src={url}
          alt={file.name}
          draggable={false}
          className="h-full w-full select-none object-contain"
          style={
            current
              ? {
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
                  transition: dragging ? "none" : "transform 200ms ease-out",
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

const barButton =
  "flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[11px] font-bold text-white active:bg-white/15";

/**
 * Full-screen photo / video viewer: swipe left and right, pinch or double-tap to zoom,
 * drag down to close. Actions (favourite, album, edit, share, delete) are in the bottom bar.
 */
export function MediaViewer({
  items,
  index,
  onIndex,
  onClose,
  onFavorite,
  onAlbum,
  onEdit,
  onShare,
  onDelete,
}: {
  items: MediaItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  onFavorite: (item: MediaItem) => void;
  onAlbum: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onShare: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const { t, settings } = useApp();
  const item = items[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const viewRef = useRef<View>(IDENTITY);
  const [drag, setDrag] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const g = useRef<Gesture>({
    pointers: new Map(),
    mode: "none",
    start: { x: 0, y: 0 },
    startView: IDENTITY,
    startMid: { x: 0, y: 0 },
    startDist: 1,
    t0: 0,
    moved: false,
    vx: 0,
    lastDx: 0,
    lastDy: 0,
    lastTap: 0,
    lastTapPos: { x: 0, y: 0 },
  });
  const video = !!item && isVideoFile(item.file);

  useBackHandler(true, onClose);

  const commitView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    commitView(IDENTITY);
    setDrag({ x: 0, y: 0 });
  }, [index, commitView]);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < items.length) onIndex(next);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!item) return null;

  const rect = () => stageRef.current?.getBoundingClientRect();

  const clampView = (next: View): View => {
    const r = rect();
    const s = clamp(next.s, 1, MAX_ZOOM);
    if (!r || s <= 1) return IDENTITY;
    const maxX = (r.width * (s - 1)) / 2;
    const maxY = (r.height * (s - 1)) / 2;
    return { s, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  };

  /** Zoom to `scale` keeping the content under (px, py) in place. */
  const zoomAt = (scale: number, px: number, py: number, base: View): View => {
    const r = rect();
    if (!r) return base;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const ix = (px - cx - base.x) / base.s;
    const iy = (py - cy - base.y) / base.s;
    const s = clamp(scale, 1, MAX_ZOOM);
    return clampView({ s, x: px - cx - ix * s, y: py - cy - iy * s });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (video) return;
    const st = g.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    st.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (st.pointers.size === 2) {
      const info = pinchInfo(st.pointers);
      if (info) {
        st.mode = "pinch";
        st.startDist = info.dist;
        st.startMid = info.mid;
        st.startView = viewRef.current;
        st.moved = true;
        setDrag({ x: 0, y: 0 });
      }
      return;
    }
    st.mode = "none";
    st.start = { x: event.clientX, y: event.clientY };
    st.startView = viewRef.current;
    st.moved = false;
    st.t0 = performance.now();
    st.vx = 0;
    st.lastDx = 0;
    st.lastDy = 0;
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const st = g.current;
    if (!st.pointers.has(event.pointerId)) return;
    st.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (st.mode === "pinch") {
      const info = pinchInfo(st.pointers);
      const r = rect();
      if (!info || !r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const s = clamp((st.startView.s * info.dist) / st.startDist, 1, MAX_ZOOM);
      const ix = (st.startMid.x - cx - st.startView.x) / st.startView.s;
      const iy = (st.startMid.y - cy - st.startView.y) / st.startView.s;
      commitView(clampView({ s, x: info.mid.x - cx - ix * s, y: info.mid.y - cy - iy * s }));
      return;
    }
    if (st.pointers.size !== 1) return;

    const dx = event.clientX - st.start.x;
    const dy = event.clientY - st.start.y;
    if (st.mode === "none") {
      if (Math.hypot(dx, dy) < 8) return;
      st.moved = true;
      st.mode =
        viewRef.current.s > 1 ? "pan" : Math.abs(dx) > Math.abs(dy) ? "swipe" : "dismiss";
    }
    if (st.mode === "pan") {
      commitView(
        clampView({ s: st.startView.s, x: st.startView.x + dx, y: st.startView.y + dy }),
      );
    } else if (st.mode === "swipe") {
      st.vx = dx / Math.max(1, performance.now() - st.t0);
      st.lastDx = dx;
      setDrag({ x: dx, y: 0 });
    } else if (st.mode === "dismiss") {
      st.lastDy = dy;
      setDrag({ x: 0, y: dy });
    }
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const st = g.current;
    if (!st.pointers.delete(event.pointerId)) return;

    if (st.mode === "pinch") {
      if (viewRef.current.s < 1.02) commitView(IDENTITY);
      if (st.pointers.size === 1) {
        // One finger is still down: carry on as a pan.
        const rest = [...st.pointers.values()][0];
        if (rest) st.start = rest;
        st.startView = viewRef.current;
        st.mode = viewRef.current.s > 1 ? "pan" : "none";
      } else {
        st.mode = "none";
        setDragging(false);
      }
      return;
    }
    if (st.pointers.size > 0) return;

    setDragging(false);
    const mode = st.mode;
    st.mode = "none";

    if (mode === "swipe" && !cancelled) {
      const width = rect()?.width ?? 300;
      const fast = Math.abs(st.vx) > 0.45 && Math.abs(st.lastDx) > 24;
      if ((st.lastDx < -width * 0.2 || (fast && st.lastDx < 0)) && index < items.length - 1)
        onIndex(index + 1);
      else if ((st.lastDx > width * 0.2 || (fast && st.lastDx > 0)) && index > 0)
        onIndex(index - 1);
      setDrag({ x: 0, y: 0 });
      return;
    }
    if (mode === "dismiss" && !cancelled) {
      if (Math.abs(st.lastDy) > 110) {
        onClose();
        return;
      }
      setDrag({ x: 0, y: 0 });
      return;
    }
    if (mode === "swipe" || mode === "dismiss") {
      setDrag({ x: 0, y: 0 });
      return;
    }
    if (mode === "pan") return;

    // A tap: two quick taps toggle zoom.
    const now = performance.now();
    if (!cancelled && !st.moved && now - st.t0 < 350) {
      const near =
        Math.hypot(event.clientX - st.lastTapPos.x, event.clientY - st.lastTapPos.y) < 40;
      if (now - st.lastTap < 320 && near) {
        st.lastTap = 0;
        commitView(
          viewRef.current.s > 1
            ? IDENTITY
            : zoomAt(2.5, event.clientX, event.clientY, viewRef.current),
        );
      } else {
        st.lastTap = now;
        st.lastTapPos = { x: event.clientX, y: event.clientY };
      }
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (video) return;
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    const current = viewRef.current;
    commitView(zoomAt(current.s * factor, event.clientX, event.clientY, current));
  };

  const visible = [index - 1, index, index + 1].filter((i) => i >= 0 && i < items.length);
  const navButton =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white active:bg-black/70";
  const fade = 1 - Math.min(Math.abs(drag.y) / 320, 0.6);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.file.name}
      className="fixed inset-0 z-[60] flex flex-col text-white"
      style={{
        backgroundColor: `rgba(0,0,0,${fade})`,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          aria-label={t.memoryClose}
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/30"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="text-sm font-bold opacity-80">
          {index + 1} / {items.length}
        </span>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: video ? "pan-y" : "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event, false)}
        onPointerCancel={(event) => endPointer(event, true)}
        onWheel={onWheel}
      >
        {visible.map((i) => {
          const entry = items[i];
          if (!entry) return null;
          return (
            <ViewerSlide
              key={entry.file.id}
              file={entry.file}
              position={i - index}
              drag={drag}
              dragging={dragging}
              current={i === index}
              view={view}
            />
          );
        })}
        {index > 0 && (
          <button
            type="button"
            aria-label={t.memoryPrev}
            onClick={() => go(-1)}
            className={cn(navButton, "left-2", video ? "flex" : "hidden sm:flex")}
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            type="button"
            aria-label={t.memoryNext}
            onClick={() => go(1)}
            className={cn(navButton, "right-2", video ? "flex" : "hidden sm:flex")}
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-5 pb-1 pt-2">
        <p className="truncate text-sm font-bold">{item.title || t.memoryUntitled}</p>
        <p className="truncate text-xs text-white/70">
          {formatDate(item.date, settings.lang)}
          {item.note ? ` · ${item.note}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1">
        <button
          type="button"
          aria-pressed={!!item.file.favorite}
          onClick={() => onFavorite(item)}
          className={barButton}
        >
          <Heart
            className={cn("h-6 w-6", item.file.favorite && "fill-rose-400 text-rose-400")}
            aria-hidden="true"
          />
          <span className="max-w-full truncate">{t.memoryFavorites}</span>
        </button>
        <button type="button" onClick={() => onAlbum(item)} className={barButton}>
          <FolderPlus className="h-6 w-6" aria-hidden="true" />
          <span className="max-w-full truncate">{t.memoryTabAlbums}</span>
        </button>
        <button type="button" onClick={() => onEdit(item)} className={barButton}>
          <Pencil className="h-6 w-6" aria-hidden="true" />
          <span className="max-w-full truncate">{t.memoryEdit.split(" ")[0]}</span>
        </button>
        <button type="button" onClick={() => onShare(item)} className={barButton}>
          <Share2 className="h-6 w-6" aria-hidden="true" />
          <span className="max-w-full truncate">{t.memoryShare}</span>
        </button>
        <button type="button" onClick={() => onDelete(item)} className={barButton}>
          <Trash2 className="h-6 w-6" aria-hidden="true" />
          <span className="max-w-full truncate">{t.delete}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
