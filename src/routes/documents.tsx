import { createFileRoute, Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Music,
  Pencil,
  Plus,
  Presentation,
  Search,
  Share2,
  Trash2,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  BottomSheet,
  shareMemoryFile,
  useBackHandler,
  useLocalUrl,
} from "@/components/MemoryMedia";
import { DateField } from "@/components/pickers";
import { Card, PageHeading, PrimaryButton, TextField, useConfirm } from "@/components/kit";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_CATEGORIES,
  countByCategory,
  docKind,
  fileExtension,
  filterDocuments,
  previewKind,
  type DocKind,
} from "@/lib/documents";
import { formatDate, todayISO } from "@/lib/health";
import {
  deleteLocalFiles,
  getLocalFile,
  MAX_LOCAL_FILE_BYTES,
  saveLocalFiles,
  type StoredFile,
} from "@/lib/media";
import {
  formatFileSize,
  sortMemories,
  type DocumentCategory,
  type DocumentEntry,
} from "@/lib/memories";
import { NoAppError, openStoredFile } from "@/lib/native/open-file";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
});

interface RecordOption {
  kind: "visit" | "vaccine";
  id: string;
  label: string;
}

const KIND_VISUAL: Record<DocKind, { icon: LucideIcon; tone: string }> = {
  pdf: { icon: FileText, tone: "bg-red-500/15 text-red-600 dark:text-red-400" },
  word: { icon: FileText, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  text: { icon: FileText, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  sheet: { icon: FileSpreadsheet, tone: "bg-green-500/15 text-green-700 dark:text-green-400" },
  slides: { icon: Presentation, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  image: { icon: FileImage, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  video: { icon: Video, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  audio: { icon: Music, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  archive: { icon: FileArchive, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  other: { icon: FileIcon, tone: "bg-secondary text-primary" },
};

/* ------------------------------------------------------------------ */
/* Preview (images, video, audio, text) shown inside the app           */
/* ------------------------------------------------------------------ */

function DocPreview({
  file,
  title,
  onClose,
  onOpenOther,
  onShare,
}: {
  file: StoredFile;
  title: string;
  onClose: () => void;
  onOpenOther: () => void;
  onShare: () => void;
}) {
  const { t } = useApp();
  const kind = previewKind(file);
  const { url, missing } = useLocalUrl(file, kind !== "text");
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);
  useBackHandler(true, onClose);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (kind !== "text") return undefined;
    let active = true;
    setText(null);
    void getLocalFile(file.id)
      .then((blob) => (blob ? blob.text() : null))
      .then((value) => {
        if (!active) return;
        if (value === null) setFailed(true);
        else setText(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [file.id, kind]);

  const barButton =
    "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-white active:bg-white/15";

  let body: React.ReactNode;
  if (missing || failed) {
    body = (
      <p className="m-auto max-w-xs px-6 text-center text-sm text-white/80">
        {missing ? t.documentsMissing : t.documentsPreviewFailed}
      </p>
    );
  } else if (kind === "text") {
    body =
      text === null ? (
        <Loader2 className="m-auto h-7 w-7 animate-spin text-white/60" aria-hidden="true" />
      ) : (
        <pre className="m-3 whitespace-pre-wrap break-words rounded-2xl bg-card p-4 text-sm text-foreground">
          {text || t.documentsTextEmpty}
        </pre>
      );
  } else if (!url) {
    body = <Loader2 className="m-auto h-7 w-7 animate-spin text-white/60" aria-hidden="true" />;
  } else if (kind === "image") {
    body = (
      <img
        src={url}
        alt={title}
        draggable={false}
        onClick={() => setZoom((current) => !current)}
        onError={() => setFailed(true)}
        className={cn(
          "m-auto select-none",
          zoom ? "w-[250%] max-w-none" : "max-h-full max-w-full object-contain",
        )}
      />
    );
  } else if (kind === "video") {
    body = (
      <video
        src={url}
        controls
        playsInline
        aria-label={title}
        onError={() => setFailed(true)}
        className="m-auto max-h-full max-w-full bg-black"
      />
    );
  } else {
    body = (
      <audio
        src={url}
        controls
        aria-label={title}
        onError={() => setFailed(true)}
        className="m-auto w-[90%]"
      />
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          aria-label={t.memoryClose}
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 active:bg-white/30"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <p className="min-w-0 flex-1 truncate font-bold">{title}</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-auto">{body}</div>
      <div className="flex gap-2 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <button type="button" onClick={onOpenOther} className={barButton}>
          <ExternalLink className="h-5 w-5" aria-hidden="true" /> {t.documentsOpenOther}
        </button>
        <button type="button" onClick={onShare} className={barButton}>
          <Share2 className="h-5 w-5" aria-hidden="true" /> {t.memoryShare}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit a document                                               */
/* ------------------------------------------------------------------ */

const selectClass =
  "w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

function DocumentSheet({
  petId,
  entry,
  records,
  onClose,
}: {
  petId: string;
  entry?: DocumentEntry | undefined;
  records: RecordOption[];
  onClose: () => void;
}) {
  const { t, addDocument, updateDocuments } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<DocumentCategory>(entry?.category ?? "medical");
  const [recordValue, setRecordValue] = useState(
    entry?.recordKind && entry.recordId ? `${entry.recordKind}:${entry.recordId}` : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const chosenRecord = records.find((record) => `${record.kind}:${record.id}` === recordValue);

  const pick = (picked: File | null) => {
    if (!picked) return;
    setFile(picked);
    if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, ""));
    setError("");
  };

  const save = async () => {
    if (!title.trim()) return setError(t.documentsNeedName);
    if (!date) return setError(t.memoryNeedDate);
    if (!entry && !file) return setError(t.documentsNeedFile);
    if (file && (!file.size || file.size > MAX_LOCAL_FILE_BYTES)) return setError(t.memoryFileLimit);
    setSaving(true);
    try {
      let stored: StoredFile | undefined;
      if (file) {
        [stored] = await saveLocalFiles([file]);
        if (!stored) throw new Error("The selected file could not be saved.");
      }
      if (entry) {
        if (stored) {
          try {
            await deleteLocalFiles([entry.file]);
          } catch {
            await deleteLocalFiles([stored]).catch(() => undefined);
            throw new Error("The old file could not be removed.");
          }
        }
        const replacement = stored;
        updateDocuments((list) =>
          list.map((item) =>
            item.id !== entry.id
              ? item
              : {
                  ...item,
                  title: title.trim(),
                  category,
                  date,
                  file: replacement ?? item.file,
                  recordKind: chosenRecord?.kind,
                  recordId: chosenRecord?.id,
                },
          ),
        );
        toast.success(t.documentsEditSaved);
      } else if (stored) {
        addDocument({
          petId,
          date,
          title: title.trim(),
          category,
          file: stored,
          recordKind: chosenRecord?.kind,
          recordId: chosenRecord?.id,
        });
        toast.success(t.documentsSaved);
      }
      onClose();
    } catch {
      setError(t.documentsStorageError);
    } finally {
      setSaving(false);
    }
  };

  const shownFile = file ?? entry?.file;

  return (
    <BottomSheet
      open
      title={entry ? t.documentsEdit : t.documentsAdd}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" disabled={saving} onClick={() => void save()}>
          {t.documentsSave}
        </PrimaryButton>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <p className="text-sm font-bold">
            {entry ? t.documentsCurrentFile : t.documentsFile}
          </p>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          {shownFile && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
              {(() => {
                const { icon: Icon, tone } = KIND_VISUAL[docKind(shownFile)];
                return (
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      tone,
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                );
              })()}
              <span className="min-w-0 flex-1">
                <span className="block break-all text-sm font-bold">{shownFile.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatFileSize(shownFile.size)}
                </span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border bg-secondary px-3 text-sm font-bold text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {entry || file ? t.documentsReplaceFile : t.documentsChooseFile}
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border bg-secondary px-3 text-sm font-bold text-primary"
            >
              <Camera className="h-4 w-4" aria-hidden="true" /> {t.documentsTakePhoto}
            </button>
          </div>
        </div>
        <TextField
          label={t.documentsName}
          placeholder={t.documentsNamePh}
          maxLength={100}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
        />
        <div className="space-y-1.5">
          <label htmlFor="document-category" className="text-sm font-bold">
            {t.documentsCategory}
          </label>
          <select
            id="document-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory)}
            className={selectClass}
          >
            {DOCUMENT_CATEGORIES.map((value, index) => (
              <option key={value} value={value}>
                {t.documentsCategories[index]}
              </option>
            ))}
          </select>
        </div>
        <DateField label={t.documentsDate} value={date} onChange={setDate} />
        <div className="space-y-1.5">
          <label htmlFor="document-record" className="text-sm font-bold">
            {t.documentsLinkRecord}
          </label>
          <select
            id="document-record"
            value={recordValue}
            onChange={(event) => setRecordValue(event.target.value)}
            className={selectClass}
          >
            <option value="">{t.documentsNoRecord}</option>
            {records.map((record) => (
              <option key={`${record.kind}:${record.id}`} value={`${record.kind}:${record.id}`}>
                {record.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type SheetState = { mode: "add" } | { mode: "edit"; id: string };

function DocumentsPage() {
  const {
    t,
    pets,
    selectedPetId,
    selectPet,
    documents,
    visits,
    vaccines,
    removeDocument,
    settings,
  } = useApp();
  const { ask, dialog } = useConfirm();
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  const petId = pet?.id;

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");

  // Another pet has other documents: start from a clean view.
  useEffect(() => {
    setSheet(null);
    setPreviewId(null);
    setQuery("");
    setCategory("all");
  }, [petId]);

  const records: RecordOption[] = useMemo(() => {
    if (!petId) return [];
    return [
      ...visits
        .filter((visit) => visit.petId === petId)
        .map((visit) => ({
          kind: "visit" as const,
          id: visit.id,
          label: `${formatDate(visit.date, settings.lang)} · ${visit.reason}`,
        })),
      ...vaccines
        .filter((vaccine) => vaccine.petId === petId)
        .map((vaccine) => ({
          kind: "vaccine" as const,
          id: vaccine.id,
          label: `${formatDate(vaccine.date, settings.lang)} · ${vaccine.name}`,
        })),
    ].sort((a, b) => a.label.localeCompare(b.label, settings.lang));
  }, [petId, visits, vaccines, settings.lang]);

  const all = useMemo(
    () => (petId ? sortMemories(documents.filter((document) => document.petId === petId)) : []),
    [documents, petId],
  );
  const counts = useMemo(() => countByCategory(all), [all]);
  const shown = useMemo(() => filterDocuments(all, { category, query }), [all, category, query]);

  const categoryLabel = (value: DocumentCategory) =>
    t.documentsCategories[DOCUMENT_CATEGORIES.indexOf(value)] ?? "";

  const recordTitle = (kind?: "visit" | "vaccine", id?: string) => {
    if (!kind || !id) return null;
    return records.find((record) => record.kind === kind && record.id === id)?.label ?? null;
  };

  const openExternal = async (entry: DocumentEntry) => {
    try {
      const result = await openStoredFile(entry.file);
      if (result === "downloaded") toast.success(t.documentsDownloaded);
    } catch (error) {
      if (error instanceof NoAppError) toast.error(t.documentsNoApp);
      else if ((error as Error | undefined)?.message === "missing") toast.error(t.documentsMissing);
      else toast.error(t.documentsOpenError);
    }
  };

  const openDocument = (entry: DocumentEntry) => {
    if (previewKind(entry.file)) setPreviewId(entry.id);
    else void openExternal(entry);
  };

  const share = async (entry: DocumentEntry) => {
    try {
      await shareMemoryFile(entry.file, entry.title);
    } catch {
      toast.error(t.memoryShareError);
    }
  };

  const previewEntry = previewId ? all.find((entry) => entry.id === previewId) : undefined;
  const editEntry =
    sheet?.mode === "edit" ? all.find((entry) => entry.id === sheet.id) : undefined;

  const actionClass =
    "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold active:bg-secondary";

  return (
    <>
      <PageHeading back="/" title={t.documentsTitle} subtitle={t.documentsSubtitle} />

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

          <PrimaryButton className="w-full" onClick={() => setSheet({ mode: "add" })}>
            <Plus className="h-5 w-5" aria-hidden="true" /> {t.documentsAdd}
          </PrimaryButton>

          {all.length > 0 && (
            <div className="space-y-3">
              <label className="relative block">
                <span className="sr-only">{t.documentsSearch}</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  placeholder={t.documentsSearch}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-12 w-full rounded-2xl border bg-background pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["all", ...DOCUMENT_CATEGORIES] as const).map((value) => {
                  const count = value === "all" ? all.length : counts[value];
                  if (value !== "all" && count === 0 && category !== value) return null;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={category === value}
                      onClick={() => setCategory(value)}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-bold",
                        category === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card",
                      )}
                    >
                      {value === "all" ? t.documentsAll : categoryLabel(value)} · {count}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <section className="space-y-3">
            {all.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">{t.documentsEmpty}</p>
              </Card>
            ) : shown.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">{t.documentsNoResults}</p>
              </Card>
            ) : (
              shown.map((entry) => {
                const kind = docKind(entry.file);
                const { icon: Icon, tone } = KIND_VISUAL[kind];
                const ext = fileExtension(entry.file.name).toUpperCase();
                const record = recordTitle(entry.recordKind, entry.recordId);
                return (
                  <Card key={entry.id} className="space-y-2 p-3">
                    <button
                      type="button"
                      onClick={() => openDocument(entry)}
                      aria-label={`${t.documentsOpen}: ${entry.title}`}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                          tone,
                        )}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-bold leading-snug">
                          {entry.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {categoryLabel(entry.category)} · {formatDate(entry.date, settings.lang)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {ext ? `${ext} · ` : ""}
                          {formatFileSize(entry.file.size)}
                        </span>
                        {record && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {t.documentsRecord}: {record}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="flex gap-1 border-t pt-2">
                      <button
                        type="button"
                        onClick={() => void share(entry)}
                        className={cn(actionClass, "text-primary")}
                      >
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{t.memoryShare}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSheet({ mode: "edit", id: entry.id })}
                        className={cn(actionClass, "text-primary")}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{t.documentsEdit.split(" ")[0]}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${t.delete} ${entry.title}`}
                        onClick={() =>
                          ask(t.documentsDeleteQ, t.documentsDeleteBody, t.delete, () => {
                            void removeDocument(entry.id);
                          })
                        }
                        className={cn(actionClass, "text-destructive")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{t.delete}</span>
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </section>

          <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {t.documentsLocalOnly}
          </p>
        </>
      )}

      {previewEntry && (
        <DocPreview
          file={previewEntry.file}
          title={previewEntry.title}
          onClose={() => setPreviewId(null)}
          onOpenOther={() => void openExternal(previewEntry)}
          onShare={() => void share(previewEntry)}
        />
      )}
      {pet && sheet?.mode === "add" && (
        <DocumentSheet petId={pet.id} records={records} onClose={() => setSheet(null)} />
      )}
      {pet && sheet?.mode === "edit" && editEntry && (
        <DocumentSheet
          key={editEntry.id}
          petId={pet.id}
          entry={editEntry}
          records={records}
          onClose={() => setSheet(null)}
        />
      )}
      {dialog}
    </>
  );
}
