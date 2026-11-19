import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Heart, ImagePlus, Trash2 } from "lucide-react";
import { LocalFilePreview } from "@/components/LocalFilePreview";
import { DateField } from "@/components/pickers";
import { Card, PageHeading, PrimaryButton, TextField, useConfirm } from "@/components/kit";
import { useApp } from "@/lib/store";
import { formatDate, todayISO } from "@/lib/health";
import { isMemoryFile, sortMemories } from "@/lib/memories";
import { saveLocalFiles } from "@/lib/media";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

function MemoriesPage() {
  const { t, pets, selectedPetId, selectPet, memories, addMemory, removeMemory, settings } =
    useApp();
  const { ask, dialog } = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const chooseFiles = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const invalid = incoming.find((file) => !isMemoryFile(file));
    if (invalid) {
      setError(
        invalid.size > 50 * 1024 * 1024 || invalid.size === 0
          ? t.memoryFileLimit
          : t.memoryFileType,
      );
    } else {
      setError("");
    }
    setFiles((current) => [...current, ...incoming.filter(isMemoryFile)]);
  };

  const save = async () => {
    if (!pet) return;
    if (!title.trim()) return setError(t.memoryNeedTitle);
    if (!date) return setError(t.memoryNeedDate);
    if (date > todayISO()) return setError(t.memoryFutureDate);
    setSaving(true);
    try {
      const savedFiles = await saveLocalFiles(files);
      addMemory({
        petId: pet.id,
        date,
        title: title.trim(),
        note: note.trim() || undefined,
        files: savedFiles,
      });
      setTitle("");
      setNote("");
      setFiles([]);
      setDate(todayISO());
      setError("");
      toast.success(t.memorySaved);
    } catch {
      setError(t.memoryStorageError);
    } finally {
      setSaving(false);
    }
  };

  const entries = pet ? sortMemories(memories.filter((memory) => memory.petId === pet.id)) : [];

  return (
    <>
      <PageHeading
        back="/"
        eyebrow={t.memoryTitle}
        title={t.memoryTitle}
        subtitle={t.memorySubtitle}
      />

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

          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Heart className="h-5 w-5 text-primary" /> {t.memoryAdd}
            </h2>
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
              label={t.memoryEntryTitle}
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
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-secondary px-4 py-3 text-sm font-bold text-primary"
              >
                <ImagePlus className="h-4 w-4" /> {t.memoryChooseMedia}
              </button>
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 break-all">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`${t.memoryRemoveFile}: ${file.name}`}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                        className="shrink-0 p-1 text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
            <PrimaryButton className="w-full" disabled={saving} onClick={() => void save()}>
              {t.memorySave}
            </PrimaryButton>
          </Card>

          <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {t.memoryLocalOnly}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t.memoryTitle}</h2>
            {entries.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">{t.memoryEmpty}</p>
              </Card>
            ) : (
              entries.map((entry) => (
                <Card key={entry.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.date, settings.lang)}
                      </p>
                    </div>
                    <button
                      aria-label={`${t.delete} ${entry.title}`}
                      onClick={() =>
                        ask(t.memoryDeleteQ, t.memoryDeleteBody, t.delete, () => {
                          void removeMemory(entry.id);
                        })
                      }
                      className="p-2 text-muted-foreground"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  {entry.note && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                  {entry.files.length > 0 && (
                    <div className="grid gap-2">
                      {entry.files.map((file) => (
                        <LocalFilePreview key={file.id} file={file} display="memory" />
                      ))}
                    </div>
                  )}
                </Card>
              ))
            )}
          </section>
        </>
      )}
      {dialog}
    </>
  );
}
