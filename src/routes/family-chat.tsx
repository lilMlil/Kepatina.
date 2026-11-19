import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode, type TouchList } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
<<<<<<< HEAD
import { ArrowUp, Download, Mic, Paperclip, Share2, Square, Trash2 } from "lucide-react";
import { Card, PageHeading, useConfirm } from "@/components/kit";
=======
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  EllipsisVertical,
  Mic,
  Paperclip,
  Play,
  Share2,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Card, PageHeading } from "@/components/kit";
>>>>>>> 789e2179cc5752d3b8ffc0e99f12f15d07eba3bc
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native/platform";
import { useApp } from "@/lib/store";
import { saveMedia, saveText, shareMedia } from "@/lib/native/chat-media";
import { shareText } from "@/lib/native/platform";

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

<<<<<<< HEAD
function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_") || "family-message";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read the file."));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(blob);
  });
=======
interface ViewerItem {
  id: string;
  kind: "image" | "video";
  url: string;
}

const CHAT_LABELS = {
  lv: {
    open: "Atvērt",
    close: "Aizvērt",
    prev: "Iepriekšējais",
    next: "Nākamais",
    actions: "Darbības",
    copy: "Kopēt tekstu",
    copied: "Teksts nokopēts",
    save: "Saglabāt",
    saved: "Saglabāts",
    share: "Kopīgot",
    delete: "Dzēst",
    cancel: "Atcelt",
    deleteAllTitle: "Dzēst visiem?",
    deleteAllText: "Ziņa pazudīs visiem ģimenes čatā.",
    deleteMeTitle: "Dzēst man?",
    deleteMeText: "Ziņa pazudīs tikai tev, pārējiem tā paliks.",
    saveFailed: "Neizdevās saglabāt.",
    shareFailed: "Neizdevās kopīgot.",
    deleteFailed: "Neizdevās izdzēst.",
    deleted: "Ziņa izdzēsta",
  },
  en: {
    open: "Open",
    close: "Close",
    prev: "Previous",
    next: "Next",
    actions: "Actions",
    copy: "Copy text",
    copied: "Text copied",
    save: "Save",
    saved: "Saved",
    share: "Share",
    delete: "Delete",
    cancel: "Cancel",
    deleteAllTitle: "Delete for everyone?",
    deleteAllText: "This message will disappear for everyone in the family chat.",
    deleteMeTitle: "Delete for me?",
    deleteMeText: "The message will disappear only for you; everyone else keeps it.",
    saveFailed: "Could not save.",
    shareFailed: "Could not share.",
    deleteFailed: "Could not delete.",
    deleted: "Message deleted",
  },
  ru: {
    open: "Открыть",
    close: "Закрыть",
    prev: "Предыдущее",
    next: "Следующее",
    actions: "Действия",
    copy: "Копировать текст",
    copied: "Текст скопирован",
    save: "Сохранить",
    saved: "Сохранено",
    share: "Поделиться",
    delete: "Удалить",
    cancel: "Отмена",
    deleteAllTitle: "Удалить для всех?",
    deleteAllText: "Сообщение исчезнет у всех в семейном чате.",
    deleteMeTitle: "Удалить для меня?",
    deleteMeText: "Сообщение исчезнет только у тебя, у остальных останется.",
    saveFailed: "Не удалось сохранить.",
    shareFailed: "Не удалось поделиться.",
    deleteFailed: "Не удалось удалить.",
    deleted: "Сообщение удалено",
  },
  fr: {
    open: "Ouvrir",
    close: "Fermer",
    prev: "Précédent",
    next: "Suivant",
    actions: "Actions",
    copy: "Copier le texte",
    copied: "Texte copié",
    save: "Enregistrer",
    saved: "Enregistré",
    share: "Partager",
    delete: "Supprimer",
    cancel: "Annuler",
    deleteAllTitle: "Supprimer pour tous ?",
    deleteAllText: "Le message disparaîtra pour toute la famille.",
    deleteMeTitle: "Supprimer pour moi ?",
    deleteMeText: "Le message disparaîtra seulement pour vous, les autres le garderont.",
    saveFailed: "Échec de l’enregistrement.",
    shareFailed: "Échec du partage.",
    deleteFailed: "Échec de la suppression.",
    deleted: "Message supprimé",
  },
};

const MAX_ZOOM = 5;

function touchDistance(touches: TouchList) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

interface SheetAction {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

/** Bottom sheet with the actions for one message. */
function ActionSheet({
  actions,
  cancelLabel,
  onClose,
}: {
  actions: SheetAction[];
  cancelLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full rounded-t-3xl bg-card p-3 text-card-foreground shadow-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onSelect}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium active:bg-secondary ${action.danger ? "text-destructive" : ""}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-2xl px-4 py-3 text-center text-base font-semibold opacity-70 active:bg-secondary"
        >
          {cancelLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Small "are you sure?" box; sits above the full-screen viewer too. */
function ConfirmBox({
  title,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-3xl bg-card p-5 text-card-foreground shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">{text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold active:bg-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
  onSave,
  onShare,
  onDelete,
  busy,
  labels,
}: {
  items: ViewerItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  labels: { close: string; prev: string; next: string; save: string; share: string; delete: string };
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={labels.save}
            title={labels.save}
            disabled={busy}
            onClick={() => onSave(item.id)}
            className="rounded-full bg-white/15 p-2 active:bg-white/30 disabled:opacity-40"
          >
            <Download className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={labels.share}
            title={labels.share}
            disabled={busy}
            onClick={() => onShare(item.id)}
            className="rounded-full bg-white/15 p-2 active:bg-white/30 disabled:opacity-40"
          >
            <Share2 className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={labels.delete}
            title={labels.delete}
            disabled={busy}
            onClick={() => onDelete(item.id)}
            className="rounded-full bg-white/15 p-2 active:bg-white/30 disabled:opacity-40"
          >
            <Trash2 className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={labels.close}
            onClick={onClose}
            className="rounded-full bg-white/15 p-2 active:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
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
>>>>>>> 789e2179cc5752d3b8ffc0e99f12f15d07eba3bc
}

function FamilyChatPage() {
  const { t, family, user, online, settings } = useApp();
  const { ask, dialog } = useConfirm();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
<<<<<<< HEAD
  const [workingMessageId, setWorkingMessageId] = useState<string | null>(null);
=======
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
>>>>>>> 789e2179cc5752d3b8ffc0e99f12f15d07eba3bc
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
      .on(
        "postgres_changes",
<<<<<<< HEAD
        {
          event: "DELETE",
          schema: "public",
          table: "family_messages",
        },
        () => void loadMessages(),
=======
        { event: "DELETE", schema: "public", table: "family_messages" },
        (payload) => {
          const removedId = (payload.old as { id?: string } | null)?.id;
          if (removedId) setMessages((current) => current.filter((m) => m.id !== removedId));
        },
>>>>>>> 789e2179cc5752d3b8ffc0e99f12f15d07eba3bc
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

  // Messages the person removed "for me only" (kept on this device).
  const hiddenKey = familyId && userId ? `kepatina/chat-hidden/${familyId}/${userId}` : "";
  useEffect(() => {
    if (!hiddenKey) {
      setHidden([]);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(hiddenKey) ?? "[]");
      setHidden(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
    } catch {
      setHidden([]);
    }
  }, [hiddenKey]);

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

<<<<<<< HEAD
  async function getMessageFile(message: FamilyMessage): Promise<File> {
    if (message.kind === "text") {
      return new File([message.content ?? ""], `message-${message.id}.txt`, {
        type: "text/plain;charset=utf-8",
      });
    }
    if (!message.media_path) throw new Error(t.famChatActionFailed);
    const { data, error } = await supabase.storage.from("family-chat").download(message.media_path);
    if (error) throw error;
    const storedName = message.media_path.split("/").pop() ?? "";
    const name = storedName.replace(/^[a-f0-9-]{36}-/i, "");
    return new File([data], safeFileName(name || `${message.kind}.${mediaExtension(data.type)}`), {
      type: data.type || "application/octet-stream",
    });
  }

  async function writeNativeFile(file: File, directory: "Documents" | "Cache"): Promise<string> {
    const { Directory, Filesystem } = await import("@capacitor/filesystem");
    const { uri } = await Filesystem.writeFile({
      path: safeFileName(file.name),
      data: await blobToBase64(file),
      directory: Directory[directory],
      recursive: true,
    });
    return uri;
  }

  async function getMessageShareUrl(message: FamilyMessage): Promise<string | null> {
    if (!message.media_path) return null;
    const { data, error } = await supabase.storage
      .from("family-chat")
      .createSignedUrl(message.media_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async function saveMessage(message: FamilyMessage) {
    if (workingMessageId) return;
    setWorkingMessageId(message.id);
    try {
      const file = await getMessageFile(message);
      if (isNative()) {
        await writeNativeFile(file, "Documents");
      } else {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      toast.success(t.famChatSaved);
    } catch (error) {
      logChatError("save message", error);
      toast.error(errorMessage(error) || t.famChatActionFailed);
    } finally {
      setWorkingMessageId(null);
    }
  }

  async function shareMessage(message: FamilyMessage) {
    if (workingMessageId) return;
    setWorkingMessageId(message.id);
    try {
      const title = t.famChat;
      if (message.kind === "text") {
        const text = message.content ?? "";
        if (isNative()) {
          const { Share } = await import("@capacitor/share");
          await Share.share({ title, text, dialogTitle: title });
        } else if (typeof navigator.share === "function") {
          await navigator.share({ title, text });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          toast.success(t.famChatCopied);
        } else {
          toast.error(t.famChatShareUnavailable);
        }
        return;
      }

      const file = await getMessageFile(message);
      if (isNative()) {
        const uri = await writeNativeFile(file, "Cache");
        const { Share } = await import("@capacitor/share");
        await Share.share({ title, files: [uri], dialogTitle: title });
      } else if (typeof navigator.share === "function") {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, files: [file] });
        } else {
          const url = await getMessageShareUrl(message);
          if (!url) throw new Error(t.famChatShareUnavailable);
          await navigator.share({ title, url });
        }
      } else if (navigator.clipboard) {
        const url = await getMessageShareUrl(message);
        if (!url) throw new Error(t.famChatShareUnavailable);
        await navigator.clipboard.writeText(url);
        toast.success(t.famChatCopied);
      } else {
        toast.error(t.famChatShareUnavailable);
      }
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || /cancel/i.test(error.message)))
        return;
      logChatError("share message", error);
      toast.error(errorMessage(error) || t.famChatActionFailed);
    } finally {
      setWorkingMessageId(null);
    }
  }

  async function deleteMessage(message: FamilyMessage) {
    if (!family || !user || workingMessageId) return;
    setWorkingMessageId(message.id);
    try {
      const { data, error } = await supabase
        .from("family_messages")
        .delete()
        .eq("id", message.id)
        .eq("family_id", family.id)
        .eq("sender_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(t.famChatActionFailed);
      setMessages((current) => current.filter((item) => item.id !== message.id));

      if (message.media_path) {
        try {
          const { error: storageError } = await supabase.storage
            .from("family-chat")
            .remove([message.media_path]);
          if (storageError) throw storageError;
        } catch (error) {
          logChatError("remove deleted message media", error);
          toast.error(t.famChatMediaCleanupFailed);
          return;
        }
      }
      toast.success(t.famChatDeleted);
    } catch (error) {
      logChatError("delete message", error);
      toast.error(errorMessage(error) || t.famChatActionFailed);
    } finally {
      setWorkingMessageId(null);
    }
=======
  const visibleMessages = messages.filter((message) => !hidden.includes(message.id));
  const viewerItems: ViewerItem[] = visibleMessages.flatMap((message) =>
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

  // the open item vanished (deleted by someone else): leave the viewer
  useEffect(() => {
    if (viewerId !== null && viewerIndex < 0 && !loading) closeViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, viewerIndex, loading]);

  const labels = CHAT_LABELS[settings.lang];

  function fileStamp(message: FamilyMessage) {
    const d = new Date(message.created_at);
    const two = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
  }

  function mediaFileName(message: FamilyMessage) {
    const fromPath = message.media_path?.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    const fallback = { image: "jpg", video: "mp4", audio: "m4a", text: "txt" }[message.kind];
    return `kepatina-${message.kind}-${fileStamp(message)}.${fromPath ?? fallback}`;
  }

  /** A fresh link, because the one shown in the chat expires after an hour. */
  async function freshMediaUrl(message: FamilyMessage) {
    if (message.media_path) {
      const { data, error } = await supabase.storage
        .from("family-chat")
        .createSignedUrl(message.media_path, 600);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    if (message.mediaUrl) return message.mediaUrl;
    throw new Error(t.famChatMediaFailed);
  }

  async function runAction(task: () => Promise<void>, failText: string) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      logChatError("message action", error);
      const detail = errorMessage(error);
      toast.error(detail ? `${failText} ${detail}` : failText);
    } finally {
      setBusy(false);
    }
  }

  function findMessage(id: string) {
    return messages.find((message) => message.id === id);
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(labels.copied);
  }

  function copyMessage(id: string) {
    const message = findMessage(id);
    setMenuId(null);
    if (!message || message.kind !== "text") return;
    void runAction(() => copyToClipboard(message.content ?? ""), labels.saveFailed);
  }

  function saveMessage(id: string) {
    const message = findMessage(id);
    setMenuId(null);
    if (!message) return;
    void runAction(async () => {
      if (message.kind === "text") {
        const where = await saveText(message.content ?? "", `kepatina-text-${fileStamp(message)}.txt`);
        toast.success(where ? `${labels.saved}: ${where}` : labels.saved);
        return;
      }
      const where = await saveMedia(
        await freshMediaUrl(message),
        message.kind,
        mediaFileName(message),
        labels.save,
      );
      if (where) toast.success(`${labels.saved}: ${where}`);
    }, labels.saveFailed);
  }

  function shareMessage(id: string) {
    const message = findMessage(id);
    setMenuId(null);
    if (!message) return;
    void runAction(async () => {
      if (message.kind === "text") {
        const text = message.content ?? "";
        if (!(await shareText(labels.share, text))) await copyToClipboard(text);
        return;
      }
      await shareMedia(
        await freshMediaUrl(message),
        message.kind,
        mediaFileName(message),
        labels.share,
      );
    }, labels.shareFailed);
  }

  function askDelete(id: string) {
    setMenuId(null);
    setConfirmId(id);
  }

  async function performDelete() {
    const message = confirmId ? findMessage(confirmId) : undefined;
    setConfirmId(null);
    if (!message || !user) return;
    await runAction(async () => {
      if (message.sender_id === user.id) {
        // own message: removed for everyone, together with its file
        const { data, error } = await supabase
          .from("family_messages")
          .delete()
          .eq("id", message.id)
          .eq("sender_id", user.id)
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("not allowed");
        if (message.media_path) {
          const { error: removeError } = await supabase.storage
            .from("family-chat")
            .remove([message.media_path]);
          if (removeError) logChatError("remove deleted media", removeError);
        }
        setMessages((current) => current.filter((m) => m.id !== message.id));
      } else {
        // someone else's message: hidden only for this person, on this device
        const next = [...hidden, message.id].slice(-500);
        setHidden(next);
        try {
          localStorage.setItem(hiddenKey, JSON.stringify(next));
        } catch {
          /* storage unavailable: it just comes back after a reload */
        }
      }
      if (viewerId === message.id) {
        const at = viewerItems.findIndex((item) => item.id === message.id);
        const neighbour = viewerItems[at + 1] ?? viewerItems[at - 1];
        if (neighbour) setViewerId(neighbour.id);
        else closeViewer();
      }
      toast.success(labels.deleted);
    }, labels.deleteFailed);
>>>>>>> 789e2179cc5752d3b8ffc0e99f12f15d07eba3bc
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
  const menuMessage = menuId ? messages.find((message) => message.id === menuId) : undefined;
  const confirmMessage = confirmId ? messages.find((message) => message.id === confirmId) : undefined;

  return (
    <>
      {dialog}
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
          ) : visibleMessages.length === 0 ? (
            <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
              {online ? t.famChatEmpty : t.offline}
            </p>
          ) : (
            visibleMessages.map((message) => {
              const own = message.sender_id === user.id;
              return (
                <article
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-3 py-2 ${own ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-secondary"}`}
                  onContextMenu={(event) => {
                    // long-press on a photo / video / voice message opens the same actions as the ⋮ button
                    if (message.kind === "text") return;
                    event.preventDefault();
                    setMenuId(message.id);
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold opacity-80">
                      {own ? t.famYou : memberNames.get(message.sender_id)}
                    </p>
                    <button
                      type="button"
                      aria-label={labels.actions}
                      title={labels.actions}
                      onClick={() => setMenuId(message.id)}
                      className="-mr-1 shrink-0 rounded-full p-1 opacity-70 active:bg-black/10"
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  </div>
                  {message.kind === "text" ? (
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  ) : message.kind === "image" && message.mediaUrl ? (
                    <button
                      type="button"
                      aria-label={labels.open}
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
                      aria-label={labels.open}
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
                  <div className="mt-1 flex justify-end gap-2 border-t border-current/10 pt-1">
                    <button
                      type="button"
                      aria-label={t.famChatSave}
                      title={t.famChatSave}
                      disabled={workingMessageId !== null}
                      onClick={() => void saveMessage(message)}
                      className="flex h-8 w-8 items-center justify-center rounded-full opacity-75 hover:opacity-100 disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t.famChatShare}
                      title={t.famChatShare}
                      disabled={workingMessageId !== null}
                      onClick={() => void shareMessage(message)}
                      className="flex h-8 w-8 items-center justify-center rounded-full opacity-75 hover:opacity-100 disabled:opacity-40"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    {own && (
                      <button
                        type="button"
                        aria-label={t.famChatDelete}
                        title={t.famChatDelete}
                        disabled={workingMessageId !== null}
                        onClick={() =>
                          ask(
                            t.famChatDeleteQ,
                            t.famChatDeleteBody,
                            t.famChatDelete,
                            () => void deleteMessage(message),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full text-destructive opacity-75 hover:opacity-100 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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
          onSave={saveMessage}
          onShare={shareMessage}
          onDelete={askDelete}
          busy={busy}
          labels={labels}
        />
      )}
      {menuMessage && (
        <ActionSheet
          cancelLabel={labels.cancel}
          onClose={() => setMenuId(null)}
          actions={[
            ...(menuMessage.kind === "text"
              ? [
                  {
                    key: "copy",
                    label: labels.copy,
                    icon: <Copy className="h-5 w-5" />,
                    onSelect: () => copyMessage(menuMessage.id),
                  },
                ]
              : []),
            {
              key: "save",
              label: labels.save,
              icon: <Download className="h-5 w-5" />,
              onSelect: () => saveMessage(menuMessage.id),
            },
            {
              key: "share",
              label: labels.share,
              icon: <Share2 className="h-5 w-5" />,
              onSelect: () => shareMessage(menuMessage.id),
            },
            {
              key: "delete",
              label: labels.delete,
              icon: <Trash2 className="h-5 w-5" />,
              danger: true,
              onSelect: () => askDelete(menuMessage.id),
            },
          ]}
        />
      )}
      {confirmMessage && (
        <ConfirmBox
          title={confirmMessage.sender_id === user.id ? labels.deleteAllTitle : labels.deleteMeTitle}
          text={confirmMessage.sender_id === user.id ? labels.deleteAllText : labels.deleteMeText}
          confirmLabel={labels.delete}
          cancelLabel={labels.cancel}
          onConfirm={() => void performDelete()}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
