import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Folder,
  FolderMinus,
  FolderPlus,
  Heart,
  ImagePlus,
  Images,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  BottomSheet,
  MediaCover,
  MediaThumb,
  MediaViewer,
  shareMemoryFile,
  useBackHandler,
} from "@/components/MemoryMedia";
import { DateField } from "@/components/pickers";
import {
  Card,
  GhostButton,
  PageHeading,
  PrimaryButton,
  TextField,
  useConfirm,
} from "@/components/kit";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { formatDate, todayISO } from "@/lib/health";
import { deleteLocalFiles, saveLocalFiles } from "@/lib/media";
import {
  cleanAlbumName,
  deleteAlbum,
  fileInAlbum,
  findAlbum,
  flattenMedia,
  groupByMonth,
  isMemoryFile,
  listAlbums,
  removeFiles,
  renameAlbum,
  setAlbumMembership,
  setFavorite,
  sortMemories,
  type AlbumInfo,
  type MediaItem,
  type MemoryEntry,
  type MemoryFile,
} from "@/lib/memories";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

type Tab = "photos" | "albums" | "moments";
/** The "Favorites" album is built in: it is not stored, it shows every favourite file. */
const FAV = "\u0000favorites";

interface Preset {
  album?: string | undefined;
  favorite?: boolean | undefined;
}

type SheetState =
  | { kind: "memory"; memoryId?: string | undefined; preset?: Preset | undefined }
  | { kind: "albumPick"; ids: string[] }
  | { kind: "newAlbum" }
  | { kind: "addToAlbum"; album: string }
  | { kind: "rename"; album: string };

const gridClass = "grid grid-cols-3 gap-1";

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function BarIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary active:bg-secondary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function NewFileTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const { t } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      {url &&
        (file.type.startsWith("video/") ? (
          <video
            src={`${url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={url}
            alt={file.name}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ))}
      <button
        type="button"
        aria-label={`${t.memoryRemoveFile}: ${file.name}`}
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit a memory                                                 */
/* ------------------------------------------------------------------ */

function MemorySheet({
  petId,
  memory,
  preset,
  onClose,
}: {
  petId: string;
  memory?: MemoryEntry | undefined;
  preset?: Preset | undefined;
  onClose: () => void;
}) {
  const { t, addMemory, updateMemories } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(memory?.date ?? todayISO());
  const [title, setTitle] = useState(memory?.title ?? "");
  const [note, setNote] = useState(memory?.note ?? "");
  const [kept, setKept] = useState<MemoryFile[]>(memory?.files ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const chooseFiles = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const invalid = incoming.find((file) => !isMemoryFile(file));
    if (invalid) {
      setError(
        invalid.size > 50 * 1024 * 1024 || invalid.size === 0 ? t.memoryFileLimit : t.memoryFileType,
      );
    } else {
      setError("");
    }
    setFiles((current) => [...current, ...incoming.filter(isMemoryFile)]);
  };

  const save = async () => {
    if (!date) return setError(t.memoryNeedDate);
    if (date > todayISO()) return setError(t.memoryFutureDate);
    if (!title.trim() && !note.trim() && kept.length + files.length === 0)
      return setError(t.memoryNeedContent);
    setSaving(true);
    try {
      const saved = await saveLocalFiles(files);
      if (memory) {
        const keptIds = new Set(kept.map((file) => file.id));
        const removed = memory.files.filter((file) => !keptIds.has(file.id));
        try {
          await deleteLocalFiles(removed);
        } catch {
          await deleteLocalFiles(saved).catch(() => undefined);
          throw new Error("delete failed");
        }
        updateMemories((list) =>
          list.map((entry) =>
            entry.id !== memory.id
              ? entry
              : {
                  ...entry,
                  date,
                  title: title.trim(),
                  note: note.trim() || undefined,
                  files: [...entry.files.filter((file) => keptIds.has(file.id)), ...saved],
                },
          ),
        );
        toast.success(t.memoryEditSaved);
      } else {
        const extra: Partial<Pick<MemoryFile, "albums" | "favorite">> = {};
        if (preset?.album) extra.albums = [preset.album];
        if (preset?.favorite) extra.favorite = true;
        addMemory({
          petId,
          date,
          title: title.trim(),
          note: note.trim() || undefined,
          files: saved.map((file) => ({ ...file, ...extra })),
        });
        toast.success(t.memorySaved);
      }
      onClose();
    } catch {
      setError(t.memoryStorageError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open
      title={memory ? t.memoryEdit : t.memoryAdd}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" disabled={saving} onClick={() => void save()}>
          {t.memorySave}
        </PrimaryButton>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.memoryMedia}</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => {
              chooseFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="grid grid-cols-4 gap-1.5">
            {kept.map((file) => (
              <div key={file.id} className="relative">
                <MediaThumb file={file} onClick={() => undefined} />
                <button
                  type="button"
                  aria-label={`${t.memoryRemoveFile}: ${file.name}`}
                  onClick={() => setKept((current) => current.filter((f) => f.id !== file.id))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {files.map((file, index) => (
              <NewFileTile
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))}
              />
            ))}
            <button
              type="button"
              aria-label={t.memoryChooseMedia}
              onClick={() => fileInput.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed bg-secondary text-primary"
            >
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
        <DateField
          label={t.memoryDate}
          max={todayISO()}
          value={date}
          onChange={(value) => {
            setDate(value);
            setError("");
          }}
        />
        <TextField
          label={t.memoryEntryTitleOpt}
          placeholder={t.memoryTitlePh}
          maxLength={100}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">{t.memoryNote}</span>
          <textarea
            value={note}
            rows={3}
            maxLength={1200}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Choose album(s) for some files                                      */
/* ------------------------------------------------------------------ */

function AlbumSheet({
  ids,
  albums,
  byId,
  onToggle,
  onCreate,
  onClose,
}: {
  ids: string[];
  albums: AlbumInfo[];
  byId: Map<string, MediaItem>;
  onToggle: (name: string, on: boolean) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const create = () => {
    const cleaned = cleanAlbumName(name);
    if (!cleaned) return setError(t.memoryNeedAlbumName);
    onCreate(cleaned);
    setName("");
    setError("");
  };

  return (
    <BottomSheet
      open
      title={t.memoryAddToAlbum}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={onClose}>
          {t.memoryDone}
        </PrimaryButton>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="space-y-1">
          {albums.map((album) => {
            const count = ids.filter((id) => {
              const item = byId.get(id);
              return !!item && fileInAlbum(item.file, album.name);
            }).length;
            const all = ids.length > 0 && count === ids.length;
            return (
              <button
                key={album.name}
                type="button"
                aria-pressed={all}
                onClick={() => onToggle(album.name, !all)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-secondary"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {album.items[0] && <MediaCover file={album.items[0].file} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{album.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.memoryItemCount.replace("{n}", String(album.items.length))}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2",
                    all
                      ? "border-primary bg-primary text-primary-foreground"
                      : count > 0
                        ? "border-primary text-primary"
                        : "border-muted-foreground/40 text-transparent",
                  )}
                >
                  {count > 0 && !all ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2 rounded-2xl bg-muted p-3">
          <TextField
            label={t.memoryNewAlbum}
            placeholder={t.memoryAlbumNamePh}
            maxLength={40}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") create();
            }}
          />
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <GhostButton className="w-full" onClick={create}>
            <FolderPlus className="h-4 w-4" aria-hidden="true" /> {t.memoryCreateAlbum}
          </GhostButton>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Pick photos from the whole library (new album / add to album)       */
/* ------------------------------------------------------------------ */

function PhotoPickerSheet({
  title,
  items,
  confirmLabel,
  withName,
  onConfirm,
  onClose,
}: {
  title: string;
  items: MediaItem[];
  confirmLabel: string;
  withName: boolean;
  onConfirm: (ids: string[], name: string) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    const cleaned = cleanAlbumName(name);
    if (withName && !cleaned) return setError(t.memoryNeedAlbumName);
    if (selected.size === 0) return setError(t.memoryNeedAlbumPhotos);
    onConfirm([...selected], cleaned);
  };

  return (
    <BottomSheet
      open
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={confirm}>
          {confirmLabel}
          {selected.size > 0 ? ` (${selected.size})` : ""}
        </PrimaryButton>
      }
    >
      <div className="space-y-3 pt-1">
        {withName && (
          <TextField
            label={t.memoryAlbumName}
            placeholder={t.memoryAlbumNamePh}
            maxLength={40}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        )}
        <p className="text-sm font-bold">{t.memoryPickPhotos}</p>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.memoryNothingToPick}</p>
        ) : (
          <div className={gridClass}>
            {items.map((item) => (
              <MediaThumb
                key={item.file.id}
                file={item.file}
                selecting
                selected={selected.has(item.file.id)}
                onClick={() => {
                  toggle(item.file.id);
                  setError("");
                }}
              />
            ))}
          </div>
        )}
        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}

function RenameSheet({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [name, setName] = useState(value);
  const [error, setError] = useState("");
  const save = () => {
    const cleaned = cleanAlbumName(name);
    if (!cleaned) return setError(t.memoryNeedAlbumName);
    onSave(cleaned);
  };
  return (
    <BottomSheet
      open
      title={t.memoryRenameAlbum}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" onClick={save}>
          {t.memorySave}
        </PrimaryButton>
      }
    >
      <div className="space-y-2 pt-1">
        <TextField
          label={t.memoryAlbumName}
          maxLength={40}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
        />
        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function MemoriesPage() {
  const { t, pets, selectedPetId, selectPet, memories, updateMemories, removeMemory, settings } =
    useApp();
  const { ask, dialog } = useConfirm();
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  const petId = pet?.id;

  const [tab, setTab] = useState<Tab>("photos");
  const [albumOpen, setAlbumOpen] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ ids: string[]; index: number } | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const petMemories = useMemo(
    () => (petId ? memories.filter((memory) => memory.petId === petId) : []),
    [memories, petId],
  );
  const items = useMemo(() => flattenMedia(petMemories), [petMemories]);
  const byId = useMemo(() => new Map(items.map((item) => [item.file.id, item])), [items]);
  const albums = useMemo(() => listAlbums(items), [items]);
  const favItems = useMemo(() => items.filter((item) => item.file.favorite), [items]);

  const albumItems: MediaItem[] =
    albumOpen === FAV ? favItems : albumOpen ? (findAlbum(albums, albumOpen)?.items ?? []) : [];
  const albumTitle = albumOpen === FAV ? t.memoryFavorites : (albumOpen ?? "");
  /** The list of files currently shown as a grid (and used for select-all / the viewer). */
  const shownItems = albumOpen ? albumItems : tab === "photos" ? items : [];

  const cancelSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  useBackHandler(albumOpen !== null, () => {
    cancelSelect();
    setAlbumOpen(null);
  });
  useBackHandler(selecting, cancelSelect);

  // A different pet has different photos and albums.
  useEffect(() => {
    setAlbumOpen(null);
    setViewer(null);
    setSheet(null);
    cancelSelect();
  }, [petId, cancelSelect]);

  // An album with no photos left no longer exists.
  useEffect(() => {
    if (albumOpen && albumOpen !== FAV && !findAlbum(albums, albumOpen)) setAlbumOpen(null);
  }, [albumOpen, albums]);

  const viewerItems = useMemo(() => {
    const list: MediaItem[] = [];
    for (const id of viewer?.ids ?? []) {
      const item = byId.get(id);
      if (item) list.push(item);
    }
    return list;
  }, [viewer, byId]);
  const viewerIndex = Math.min(viewer?.index ?? 0, Math.max(0, viewerItems.length - 1));

  useEffect(() => {
    if (viewer && viewerItems.length === 0) setViewer(null);
  }, [viewer, viewerItems.length]);

  const openViewer = (list: MediaItem[], fileId: string) => {
    const index = list.findIndex((item) => item.file.id === fileId);
    setViewer({ ids: list.map((item) => item.file.id), index: Math.max(0, index) });
  };

  const toggleSelect = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tapItem = (item: MediaItem, list: MediaItem[]) => {
    if (selecting) toggleSelect(item.file.id);
    else openViewer(list, item.file.id);
  };

  /* ---- changes ---- */

  const change = (fn: (list: MemoryEntry[], petId: string) => MemoryEntry[]) => {
    if (!petId) return;
    updateMemories((list) => fn(list, petId));
  };
  const setFav = (ids: string[], on: boolean) =>
    change((list, id) => setFavorite(list, id, new Set(ids), on));
  const setInAlbum = (ids: string[], name: string, on: boolean) =>
    change((list, id) => setAlbumMembership(list, id, new Set(ids), name, on));
  const canonicalAlbum = (name: string) => findAlbum(albums, name)?.name ?? name;

  const createAlbum = (name: string, ids: string[]) => {
    setInAlbum(ids, canonicalAlbum(name), true);
    toast.success(t.memoryAlbumAdded);
  };

  const deleteFiles = async (ids: string[]) => {
    const set = new Set(ids);
    const files = items.filter((item) => set.has(item.file.id)).map((item) => item.file);
    try {
      await deleteLocalFiles(files);
    } catch {
      toast.error(t.memoryDeleteError);
      return;
    }
    change((list, id) => removeFiles(list, id, set));
  };

  const confirmDelete = (ids: string[], after?: () => void) =>
    ask(t.memoryDeleteFileQ, t.memoryDeleteFileBody, t.delete, () => {
      void deleteFiles(ids);
      after?.();
    });

  const share = async (item: MediaItem) => {
    try {
      await shareMemoryFile(item.file, item.title || t.memoryTitle);
    } catch {
      toast.error(t.memoryShareError);
    }
  };

  const switchTab = (next: Tab) => {
    cancelSelect();
    setAlbumOpen(null);
    setTab(next);
  };

  const monthLabel = (key: string) => {
    const date = new Date(`${key}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    const text = date.toLocaleDateString(settings.lang, { month: "long", year: "numeric" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const renderGrid = (list: MediaItem[], grouped: boolean) => {
    const tile = (item: MediaItem) => (
      <MediaThumb
        key={item.file.id}
        file={item.file}
        selecting={selecting}
        selected={selected.has(item.file.id)}
        onClick={() => tapItem(item, list)}
        onLongPress={() => {
          if (!selecting) {
            setSelecting(true);
            setSelected(new Set([item.file.id]));
          }
        }}
      />
    );
    if (!grouped) return <div className={gridClass}>{list.map(tile)}</div>;
    return (
      <div className="space-y-4">
        {groupByMonth(list).map((group) => (
          <section key={group.key} className="space-y-2">
            <h3 className="px-1 text-sm font-bold text-muted-foreground">
              {monthLabel(group.key)}
            </h3>
            <div className={gridClass}>{group.items.map(tile)}</div>
          </section>
        ))}
      </div>
    );
  };

  /* ---- selection bar ---- */

  const selectedItems = shownItems.filter((item) => selected.has(item.file.id));
  const selectedIds = selectedItems.map((item) => item.file.id);
  const allFav = selectedItems.length > 0 && selectedItems.every((item) => item.file.favorite);
  const allSelected = shownItems.length > 0 && selectedItems.length === shownItems.length;

  const selectionBar = selecting && (
    <div className="sticky top-[68px] z-20 flex items-center gap-1 rounded-2xl border bg-card px-2 py-1.5 shadow-soft">
      <BarIcon label={t.cancel} onClick={cancelSelect}>
        <X className="h-5 w-5" aria-hidden="true" />
      </BarIcon>
      <button
        type="button"
        onClick={() =>
          setSelected(allSelected ? new Set() : new Set(shownItems.map((item) => item.file.id)))
        }
        className="min-w-0 flex-1 truncate px-1 text-left text-sm font-bold"
      >
        {t.memorySelectedCount.replace("{n}", String(selected.size))}
      </button>
      <BarIcon
        label={allFav ? t.memoryFavoriteRemove : t.memoryFavoriteAdd}
        disabled={selected.size === 0}
        onClick={() => setFav(selectedIds, !allFav)}
      >
        <Heart className={cn("h-5 w-5", allFav && "fill-current")} aria-hidden="true" />
      </BarIcon>
      <BarIcon
        label={t.memoryAddToAlbum}
        disabled={selected.size === 0}
        onClick={() => setSheet({ kind: "albumPick", ids: selectedIds })}
      >
        <FolderPlus className="h-5 w-5" aria-hidden="true" />
      </BarIcon>
      {albumOpen && albumOpen !== FAV && (
        <BarIcon
          label={t.memoryRemoveFromAlbum}
          disabled={selected.size === 0}
          onClick={() => {
            setInAlbum(selectedIds, albumOpen, false);
            cancelSelect();
          }}
        >
          <FolderMinus className="h-5 w-5" aria-hidden="true" />
        </BarIcon>
      )}
      <BarIcon
        label={t.delete}
        disabled={selected.size === 0}
        onClick={() => confirmDelete(selectedIds, cancelSelect)}
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </BarIcon>
    </div>
  );

  /* ---- tabs ---- */

  const tabs: { id: Tab; label: string }[] = [
    { id: "photos", label: t.memoryTabPhotos },
    { id: "albums", label: t.memoryTabAlbums },
    { id: "moments", label: t.memoryTabMoments },
  ];

  const albumCard = (name: string, count: number, cover: MemoryFile | undefined, fav: boolean, onOpen: () => void) => (
    <button key={name} type="button" onClick={onOpen} className="min-w-0 space-y-1.5 text-left">
      <span className="relative block aspect-square overflow-hidden rounded-3xl border bg-muted">
        {cover ? (
          <MediaCover file={cover} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            {fav ? (
              <Heart className="h-9 w-9" aria-hidden="true" />
            ) : (
              <Folder className="h-9 w-9" aria-hidden="true" />
            )}
          </span>
        )}
        {fav && (
          <Heart
            className="absolute bottom-2 right-2 h-5 w-5 fill-rose-400 text-rose-400 drop-shadow"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="block truncate px-1 font-bold">{name}</span>
      <span className="block px-1 text-xs text-muted-foreground">
        {t.memoryItemCount.replace("{n}", String(count))}
      </span>
    </button>
  );

  const editingMemory =
    sheet?.kind === "memory" && sheet.memoryId
      ? petMemories.find((memory) => memory.id === sheet.memoryId)
      : undefined;

  return (
    <>
      <PageHeading back="/" title={t.memoryTitle} subtitle={t.memorySubtitle} />

      {!pet ? (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-warn">{t.hNeedPet}</p>
          <Link
            to="/pets"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            {t.addPet}
          </Link>
        </Card>
      ) : (
        <>
          {pets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pets.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectPet(item.id)}
                  aria-pressed={pet.id === item.id}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${pet.id === item.id ? "border-primary bg-secondary text-primary" : "bg-card"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => switchTab(item.id)}
                className={cn(
                  "min-h-10 truncate rounded-xl px-2 text-sm font-bold transition-colors",
                  tab === item.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ---------------- album opened ---------------- */}
          {albumOpen ? (
            <section className="space-y-3">
              <div className="flex items-center gap-1">
                <BarIcon
                  label={t.memoryTabAlbums}
                  onClick={() => {
                    cancelSelect();
                    setAlbumOpen(null);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </BarIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold text-primary">{albumTitle}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t.memoryItemCount.replace("{n}", String(albumItems.length))}
                  </p>
                </div>
                {albumOpen !== FAV && (
                  <>
                    <BarIcon
                      label={t.memoryRenameAlbum}
                      onClick={() => setSheet({ kind: "rename", album: albumOpen })}
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                    </BarIcon>
                    <BarIcon
                      label={t.memoryDeleteAlbum}
                      onClick={() =>
                        ask(t.memoryDeleteAlbumQ, t.memoryDeleteAlbumBody, t.delete, () => {
                          change((list, id) => deleteAlbum(list, id, albumOpen));
                          cancelSelect();
                          setAlbumOpen(null);
                        })
                      }
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </BarIcon>
                  </>
                )}
              </div>
              {!selecting && (
                <div className="flex gap-2">
                  {albumOpen !== FAV && (
                    <PrimaryButton
                      className="flex-1"
                      onClick={() => setSheet({ kind: "addToAlbum", album: albumOpen })}
                    >
                      <Images className="h-5 w-5" aria-hidden="true" /> {t.memoryAddPhotos}
                    </PrimaryButton>
                  )}
                  <GhostButton
                    className={albumOpen === FAV ? "flex-1" : undefined}
                    aria-label={t.memoryAddFilesHere}
                    onClick={() =>
                      setSheet({
                        kind: "memory",
                        preset: albumOpen === FAV ? { favorite: true } : { album: albumOpen },
                      })
                    }
                  >
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    {albumOpen === FAV ? ` ${t.memoryAddFilesHere}` : null}
                  </GhostButton>
                  {albumItems.length > 0 && (
                    <GhostButton onClick={() => setSelecting(true)}>{t.memorySelect}</GhostButton>
                  )}
                </div>
              )}
              {selectionBar}
              {albumItems.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted-foreground">
                    {albumOpen === FAV ? t.memoryNoFavorites : t.memoryEmptyAlbum}
                  </p>
                </Card>
              ) : (
                renderGrid(albumItems, false)
              )}
            </section>
          ) : (
            <>
              <div className="flex gap-2">
                <PrimaryButton className="flex-1" onClick={() => setSheet({ kind: "memory" })}>
                  <Plus className="h-5 w-5" aria-hidden="true" /> {t.memoryAdd}
                </PrimaryButton>
                {tab === "photos" && items.length > 0 && !selecting && (
                  <GhostButton onClick={() => setSelecting(true)}>{t.memorySelect}</GhostButton>
                )}
              </div>

              {/* ---------------- all photos ---------------- */}
              {tab === "photos" && (
                <section className="space-y-3">
                  {selectionBar}
                  {items.length === 0 ? (
                    <Card>
                      <p className="text-sm text-muted-foreground">{t.memoryEmpty}</p>
                    </Card>
                  ) : (
                    renderGrid(items, true)
                  )}
                </section>
              )}

              {/* ---------------- albums ---------------- */}
              {tab === "albums" && (
                <section className="grid grid-cols-2 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: "newAlbum" })}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-secondary/50 p-3 text-center font-bold text-primary"
                  >
                    <FolderPlus className="h-8 w-8" aria-hidden="true" />
                    {t.memoryNewAlbum}
                  </button>
                  {albumCard(t.memoryFavorites, favItems.length, favItems[0]?.file, true, () =>
                    setAlbumOpen(FAV),
                  )}
                  {albums.map((album) =>
                    albumCard(album.name, album.items.length, album.items[0]?.file, false, () =>
                      setAlbumOpen(album.name),
                    ),
                  )}
                </section>
              )}

              {/* ---------------- moments ---------------- */}
              {tab === "moments" && (
                <section className="space-y-3">
                  {petMemories.length === 0 ? (
                    <Card>
                      <p className="text-sm text-muted-foreground">{t.memoryEmpty}</p>
                    </Card>
                  ) : (
                    sortMemories(petMemories).map((entry) => {
                      const entryItems = items.filter((item) => item.memoryId === entry.id);
                      const shown = entry.files.slice(0, 4);
                      const more = entry.files.length - shown.length;
                      return (
                        <Card key={entry.id} className="space-y-3">
                          <div className="flex items-start gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold">{entry.title || t.memoryUntitled}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(entry.date, settings.lang)}
                              </p>
                            </div>
                            <BarIcon
                              label={t.memoryEdit}
                              onClick={() => setSheet({ kind: "memory", memoryId: entry.id })}
                            >
                              <Pencil className="h-5 w-5" aria-hidden="true" />
                            </BarIcon>
                            <BarIcon
                              label={`${t.delete} ${entry.title}`}
                              onClick={() =>
                                ask(t.memoryDeleteQ, t.memoryDeleteBody, t.delete, () => {
                                  void removeMemory(entry.id);
                                })
                              }
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </BarIcon>
                          </div>
                          {entry.note && (
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {entry.note}
                            </p>
                          )}
                          {shown.length > 0 && (
                            <div className="grid grid-cols-4 gap-1">
                              {shown.map((file, index) => (
                                <MediaThumb
                                  key={file.id}
                                  file={file}
                                  overlay={more > 0 && index === shown.length - 1 ? `+${more + 1}` : undefined}
                                  onClick={() => openViewer(entryItems, file.id)}
                                />
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </section>
              )}
            </>
          )}

          <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {t.memoryLocalOnly}
          </p>
        </>
      )}

      {/* ---------------- full-screen viewer ---------------- */}
      {viewer && viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          index={viewerIndex}
          onIndex={(index) => setViewer((current) => (current ? { ...current, index } : current))}
          onClose={() => setViewer(null)}
          onFavorite={(item) => setFav([item.file.id], !item.file.favorite)}
          onAlbum={(item) => setSheet({ kind: "albumPick", ids: [item.file.id] })}
          onEdit={(item) => setSheet({ kind: "memory", memoryId: item.memoryId })}
          onShare={(item) => void share(item)}
          onDelete={(item) => confirmDelete([item.file.id])}
        />
      )}

      {/* ---------------- sheets ---------------- */}
      {pet && sheet?.kind === "memory" && (sheet.memoryId ? !!editingMemory : true) && (
        <MemorySheet
          key={sheet.memoryId ?? "new"}
          petId={pet.id}
          memory={editingMemory}
          preset={sheet.preset}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "albumPick" && (
        <AlbumSheet
          ids={sheet.ids}
          albums={albums}
          byId={byId}
          onToggle={(name, on) => setInAlbum(sheet.ids, name, on)}
          onCreate={(name) => createAlbum(name, sheet.ids)}
          onClose={() => {
            setSheet(null);
            if (selecting) cancelSelect();
          }}
        />
      )}
      {sheet?.kind === "newAlbum" && (
        <PhotoPickerSheet
          title={t.memoryNewAlbum}
          items={items}
          confirmLabel={t.memoryCreateAlbum}
          withName
          onConfirm={(ids, name) => {
            createAlbum(name, ids);
            setSheet(null);
            setAlbumOpen(canonicalAlbum(name));
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "addToAlbum" && (
        <PhotoPickerSheet
          title={t.memoryAddPhotos}
          items={items.filter((item) => !fileInAlbum(item.file, sheet.album))}
          confirmLabel={t.memoryAddToAlbum}
          withName={false}
          onConfirm={(ids) => {
            setInAlbum(ids, sheet.album, true);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "rename" && (
        <RenameSheet
          value={sheet.album}
          onSave={(name) => {
            change((list, id) => renameAlbum(list, id, sheet.album, name));
            setAlbumOpen(name);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {dialog}
    </>
  );
}
