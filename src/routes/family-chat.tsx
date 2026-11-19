import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type TouchList } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ArrowUp, ChevronLeft, ChevronRight, Mic, Paperclip, Play, Square, X } from "lucide-react";
import { Card, PageHeading } from "@/components/kit";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/family-chat")({
  component: FamilyChatPage,
});

type MessageKind = "text" | "image" | "video" | "audio";
interface FamilyMessage {
  id: string;
  family_id: string;
  sender_id: string;
  kind: MessageKind;
  content: string | null;
  media_path: string | null;
  created_at: string;
  mediaUrl?: string;
}

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_RECORDING_MS = 120_000;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "";
}

function logChatError(action: string, error: unknown) {
  console.error(`[family-chat] ${action} failed`, error);
}

function mediaExtension(type: string): string {
  const mime = type.split(";")[0] ?? "";
  return (
    {
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/webm": "webm",
      "image/gif": "gif",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/quicktime": "mov",
      "video/webm": "webm",
    }[mime] ?? "bin"
  );
}

interface ViewerItem {
  id: string;
  kind: "image" | "video";
  url: string;
}

const VIEWER_LABELS = {
  lv: { open: "Atvērt", close: "Aizvērt", prev: "Iepriekšējais", next: "Nākamais" },
  en: { open: "Open", close: "Close", prev: "Previous", next: "Next" },
  ru: { open: "Открыть", close: "Закрыть", prev: "Предыдущее", next: "Следующее" },
  fr: { open: "Ouvrir", close: "Fermer", prev: "Précédent", next: "Suivant" },
};

const MAX_ZOOM = 5;

function touchDistance(touches: TouchList) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

/**
 * Full-screen viewer for chat photos and videos.
 * Photos: pinch or double-tap to zoom, drag when zoomed, swipe left/right for the previous/next
 * item, swipe down to close. Videos: normal controls, bigger picture, buttons for previous/next.
 */
function MediaViewer({
  items,
  index,
  onIndex,
  onClose,
  labels,
}: {
  items: ViewerItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  labels: { close: string; prev: string; next: string };
}) {
  const item = items[index];
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ x: 0, y: 0 });
  const gesture = useRef({
    mode: "none" as "none" | "pinch" | "pan" | "swipe",
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startOffX: 0,
    startOffY: 0,
    lastTap: 0,
    moved: false,
  });

  function applyZoom(nextScale: number, nextOffset: { x: number; y: number }) {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }

  function applyDrag(next: { x: number; y: number }) {
    dragRef.current = next;
    setDrag(next);
  }

  function goTo(next: number) {
    if (next >= 0 && next < items.length) onIndex(next);
  }

  function toggleZoom() {
    if (scaleRef.current > 1) applyZoom(1, { x: 0, y: 0 });
    else applyZoom(2.5, { x: 0, y: 0 });
  }

  // a new item always starts un-zoomed
  useEffect(() => {
    applyZoom(1, { x: 0, y: 0 });
    applyDrag({ x: 0, y: 0 });
    gesture.current.mode = "none";
  }, [index]);

  // keyboard (web) + lock the page behind the viewer
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else if (event.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  });

  if (!item) return null;

  const touchHandlers =
    item.kind === "image"
      ? {
          onTouchStart: (event: React.TouchEvent) => {
            const g = gesture.current;
            if (event.touches.length === 2) {
              g.mode = "pinch";
              g.startDist = touchDistance(event.touches);
              g.startScale = scaleRef.current;
              g.moved = true;
              return;
            }
            if (event.touches.length === 1) {
              const touch = event.touches[0];
              g.startX = touch.clientX;
              g.startY = touch.clientY;
              g.startOffX = offsetRef.current.x;
              g.startOffY = offsetRef.current.y;
              g.moved = false;
              g.mode = scaleRef.current > 1 ? "pan" : "swipe";
            }
          },
          onTouchMove: (event: React.TouchEvent) => {
            const g = gesture.current;
            if (g.mode === "pinch" && event.touches.length === 2) {
              const next = Math.min(
                MAX_ZOOM,
                Math.max(1, (g.startScale * touchDistance(event.touches)) / g.startDist),
              );
              applyZoom(next, next === 1 ? { x: 0, y: 0 } : offsetRef.current);
              return;
            }
            if (event.touches.length !== 1) return;
            const touch = event.touches[0];
            const dx = touch.clientX - g.startX;
            const dy = touch.clientY - g.startY;
            if (Math.abs(dx) + Math.abs(dy) > 8) g.moved = true;
            if (g.mode === "pan") {
              applyZoom(scaleRef.current, { x: g.startOffX + dx, y: g.startOffY + dy });
            } else if (g.mode === "swipe") {
              applyDrag({ x: dx, y: dy });
            }
          },
          onTouchEnd: (event: React.TouchEvent) => {
            const g = gesture.current;
            if (event.touches.length > 0) {
              // one finger left after a pinch: continue as a drag from here
              if (g.mode === "pinch" && event.touches.length === 1) {
                const touch = event.touches[0];
                g.mode = scaleRef.current > 1 ? "pan" : "none";
                g.startX = touch.clientX;
                g.startY = touch.clientY;
                g.startOffX = offsetRef.current.x;
                g.startOffY = offsetRef.current.y;
              }
              return;
            }
            const mode = g.mode;
            g.mode = "none";
            const { x, y } = dragRef.current;
            applyDrag({ x: 0, y: 0 });

            if (!g.moved && mode !== "pinch") {
              const now = Date.now();
              if (now - g.lastTap < 300) {
                g.lastTap = 0;
                toggleZoom();
              } else {
                g.lastTap = now;
              }
              return;
            }
            if (mode === "swipe") {
              if (Math.abs(x) > 70 && Math.abs(x) > Math.abs(y)) goTo(index + (x < 0 ? 1 : -1));
              else if (y > 100 && y > Math.abs(x)) onClose();
              return;
            }
            if (scaleRef.current <= 1.02) {
              applyZoom(1, { x: 0, y: 0 });
            } else {
              const limitX = (window.innerWidth * (scaleRef.current - 1)) / 2;
              const limitY = (window.innerHeight * (scaleRef.current - 1)) / 2;
              applyZoom(scaleRef.current, {
                x: Math.max(-limitX, Math.min(limitX, offsetRef.current.x)),
                y: Math.max(-limitY, Math.min(limitY, offsetRef.current.y)),
              });
            }
          },
        }
      : {};

  const navButton =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white active:bg-black/70";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm opacity-80">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          aria-label={labels.close}
          onClick={onClose}
          className="rounded-full bg-white/15 p-2 active:bg-white/30"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        style={item.kind === "image" ? { touchAction: "none" } : undefined}
        {...touchHandlers}
      >
        {item.kind === "image" ? (
          <img
            key={item.id}
            src={item.url}
            alt=""
            draggable={false}
            onDoubleClick={toggleZoom}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${offset.x + (scale === 1 ? drag.x : 0)}px, ${offset.y + (scale === 1 ? drag.y : 0)}px) scale(${scale})`,
            }}
          />
        ) : (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full bg-black"
          />
        )}
        {index > 0 && (
          <button
            type="button"
            aria-label={labels.prev}
            onClick={() => goTo(index - 1)}
            className={`${navButton} left-2`}
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => goTo(index + 1)}
            className={`${navButton} right-2`}
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function FamilyChatPage() {
  const { t, family, user, online, settings } = useApp();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatKeyRef = useRef("");
  const familyId = family?.id;
  const userId = user?.id;

  useEffect(
    () => () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    const chatKey = familyId && userId ? `${familyId}:${userId}` : "";
    if (chatKey !== chatKeyRef.current) {
      chatKeyRef.current = chatKey;
      setMessages([]);
      setNicknames({});
      setLoadFailed(false);
      setLoading(Boolean(chatKey));
    }
    if (!familyId || !userId || !online) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadFailed(false);
    const loadMessages = async () => {
      const [messageRes, nicknameRes] = await Promise.all([
        supabase
          .from("family_messages")
          .select("id, family_id, sender_id, kind, content, media_path, created_at")
          .eq("family_id", familyId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("family_member_nicknames")
          .select("member_user_id, nickname")
          .eq("family_id", familyId)
          .eq("user_id", userId),
      ]);
      if (!active) return;
      if (messageRes.error) {
        logChatError("load messages", messageRes.error);
        toast.error(messageRes.error.message || t.famChatFailed);
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      if (nicknameRes.error) {
        logChatError("load nicknames", nicknameRes.error);
        toast.error(nicknameRes.error.message || t.famChatFailed);
      }
      const rows = [...(messageRes.data ?? [])].reverse() as FamilyMessage[];
      const withUrls = await Promise.all(
        rows.map(async (message) => {
          if (!message.media_path) return message;
          const { data, error } = await supabase.storage
            .from("family-chat")
            .createSignedUrl(message.media_path, 3600);
          if (error) {
            logChatError("create media signed URL", error);
            toast.error(error.message);
            return message;
          }
          return { ...message, mediaUrl: data.signedUrl };
        }),
      );
      if (!active) return;
      setMessages(withUrls);
      setNicknames(
        Object.fromEntries(
          (nicknameRes.data ?? []).map((row) => [row.member_user_id, row.nickname]),
        ),
      );
      setLoading(false);
    };

    void loadMessages();
    const channel = supabase
      .channel(`family-chat-${familyId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "family_messages",
          filter: `family_id=eq.${familyId}`,
        },
        () => void loadMessages(),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [familyId, userId, online, t.famChatFailed]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!family || !user || !online || sending) return;
    const text = content.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return;
    setSending(true);
    try {
      const { error } = await supabase.from("family_messages").insert({
        family_id: family.id,
        sender_id: user.id,
        kind: "text",
        content: text,
      });
      if (error) throw error;
      setDraft("");
    } catch (error) {
      logChatError("send message", error);
      toast.error(errorMessage(error) || t.famChatMediaFailed);
    } finally {
      setSending(false);
    }
  }

  async function sendMedia(file: Blob, kind: Exclude<MessageKind, "text">, fileName?: string) {
    if (!family || !user || !online || sending) return;
    if (!file.size) {
      toast.error(t.famChatEmptyMedia);
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error(t.famChatFileTooLarge);
      return;
    }
    const mimeType = file.type.split(";")[0] ?? "";
    if (!mimeType.startsWith(`${kind}/`)) {
      toast.error(t.famChatInvalidMedia);
      return;
    }
    setSending(true);
    const name = fileName ?? `voice-${crypto.randomUUID()}.${mediaExtension(file.type)}`;
    const path = `${family.id}/${user.id}/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    let uploaded = false;
    try {
      const { error: uploadError } = await supabase.storage
        .from("family-chat")
        .upload(path, file, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;
      uploaded = true;

      const { error: insertError } = await supabase.from("family_messages").insert({
        family_id: family.id,
        sender_id: user.id,
        kind,
        media_path: path,
      });
      if (insertError) throw insertError;
    } catch (error) {
      logChatError(`send ${kind} media`, error);
      if (uploaded) {
        try {
          const { error: removeError } = await supabase.storage.from("family-chat").remove([path]);
          if (removeError) logChatError("remove orphaned media", removeError);
        } catch (removeError) {
          logChatError("remove orphaned media", removeError);
        }
      }
      const detail = errorMessage(error);
      toast.error(detail ? `${t.famChatMediaFailed} ${detail}` : t.famChatMediaFailed);
    } finally {
      setSending(false);
    }
  }

  const viewerItems: ViewerItem[] = messages.flatMap((message) =>
    (message.kind === "image" || message.kind === "video") && message.mediaUrl
      ? [{ id: message.id, kind: message.kind, url: message.mediaUrl }]
      : [],
  );
  const viewerIndex = viewerId === null ? -1 : viewerItems.findIndex((item) => item.id === viewerId);
  const viewerOpen = viewerId !== null;

  // The viewer takes one history entry, so the Android back button / browser back closes it
  // instead of leaving the chat.
  useEffect(() => {
    if (!viewerOpen) return;
    const onPop = () => setViewerId(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [viewerOpen]);

  function openViewer(id: string) {
    window.history.pushState({ ...(window.history.state ?? {}), kepViewer: true }, "");
    setViewerId(id);
  }

  function closeViewer() {
    if (window.history.state?.kepViewer) window.history.back();
    else setViewerId(null);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(t.famChatUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
        setRecording(false);
        if (blob.size) void sendMedia(blob, "audio");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      recordTimerRef.current = setTimeout(() => recorder.stop(), MAX_RECORDING_MS);
    } catch (error) {
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      toast.error(error instanceof Error ? error.message : t.famChatUnsupported);
    }
  }

  if (!user || !family) {
    return (
      <>
        <PageHeading title={t.famChat} back="/profile" />
        <Card className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {user ? t.famChatNoFamily : t.famNeedAccount}
          </p>
          <Link to="/profile" className="font-bold text-primary underline">
            {t.famTitle}
          </Link>
        </Card>
      </>
    );
  }

  const memberNames = new Map(
    family.members.map((member) => [
      member.userId,
      nicknames[member.userId] || member.email || member.userId.slice(0, 8),
    ]),
  );
  const dateLocale = { lv: "lv-LV", en: "en", ru: "ru-RU", fr: "fr-FR" }[settings.lang];
  const voiceActionLabel = recording ? t.famChatStop : t.famChatVoice;
  const viewerLabels = VIEWER_LABELS[settings.lang];

  return (
    <>
      <PageHeading
        title={t.famChat}
        subtitle={family.members.map((m) => memberNames.get(m.userId)).join(", ")}
        back="/profile"
      />
      <Card className="space-y-3 p-3">
        <div
          ref={listRef}
          aria-live="polite"
          className="flex min-h-56 max-h-[55vh] flex-col gap-3 overflow-y-auto px-1 py-2"
        >
          {loading ? (
            <p className="m-auto text-sm text-muted-foreground">{t.famChatLoading}</p>
          ) : loadFailed ? (
            <p className="m-auto text-sm text-muted-foreground">{t.famChatFailed}</p>
          ) : messages.length === 0 ? (
            <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
              {online ? t.famChatEmpty : t.offline}
            </p>
          ) : (
            messages.map((message) => {
              const own = message.sender_id === user.id;
              return (
                <article
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-3 py-2 ${own ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-secondary"}`}
                >
                  <p className="mb-1 truncate text-xs font-bold opacity-80">
                    {own ? t.famYou : memberNames.get(message.sender_id)}
                  </p>
                  {message.kind === "text" ? (
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  ) : message.kind === "image" && message.mediaUrl ? (
                    <button
                      type="button"
                      aria-label={viewerLabels.open}
                      onClick={() => openViewer(message.id)}
                      className="block"
                    >
                      <img
                        src={message.mediaUrl}
                        alt={t.photo}
                        className="max-h-64 max-w-full rounded-xl object-contain"
                      />
                    </button>
                  ) : message.kind === "video" && message.mediaUrl ? (
                    <button
                      type="button"
                      aria-label={viewerLabels.open}
                      onClick={() => openViewer(message.id)}
                      className="relative block overflow-hidden rounded-xl"
                    >
                      <video
                        preload="metadata"
                        muted
                        playsInline
                        src={`${message.mediaUrl}#t=0.1`}
                        className="pointer-events-none max-h-64 max-w-full bg-black"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/55 p-3 text-white">
                          <Play className="h-7 w-7 fill-current" />
                        </span>
                      </span>
                    </button>
                  ) : message.kind === "audio" && message.mediaUrl ? (
                    <audio
                      controls
                      preload="metadata"
                      src={message.mediaUrl}
                      className="max-w-full"
                    />
                  ) : (
                    <p className="text-sm">{t.famChatMediaFailed}</p>
                  )}
                  <time className="mt-1 block text-right text-[10px] opacity-70">
                    {new Date(message.created_at).toLocaleTimeString(dateLocale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </article>
              );
            })
          )}
        </div>
        <form
          className="flex items-end gap-2 border-t pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(draft);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (file.size > MAX_MEDIA_BYTES) {
                toast.error(t.famChatFileTooLarge);
                return;
              }
              if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                toast.error(t.famChatUnsupported);
                return;
              }
              void sendMedia(file, file.type.startsWith("image/") ? "image" : "video", file.name);
            }}
          />
          <button
            type="button"
            aria-label={t.famChatPhoto}
            title={t.famChatPhoto}
            disabled={!online || sending}
            onClick={() => inputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={voiceActionLabel}
            title={voiceActionLabel}
            disabled={!online || sending}
            onClick={() => {
              if (recording) recorderRef.current?.stop();
              else void startRecording();
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary disabled:opacity-50"
          >
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.famChatTextPh}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            aria-label={t.famChatTextPh}
            className="min-h-11 max-h-32 flex-1 resize-none rounded-2xl border px-3 py-2"
          />
          <button
            type="submit"
            aria-label={t.famChatSend}
            disabled={!online || sending || !draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
      </Card>
      {viewerIndex >= 0 && (
        <MediaViewer
          items={viewerItems}
          index={viewerIndex}
          onIndex={(next) => setViewerId(viewerItems[next]?.id ?? null)}
          onClose={closeViewer}
          labels={viewerLabels}
        />
      )}
    </>
  );
}
