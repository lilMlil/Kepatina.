import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import { LocalFilePreview } from "@/components/LocalFilePreview";
import { DateField } from "@/components/pickers";
import { Card, PageHeading, PrimaryButton, TextField, useConfirm } from "@/components/kit";
import { formatDate, todayISO } from "@/lib/health";
import { type DocumentCategory, sortMemories } from "@/lib/memories";
import { saveLocalFiles, MAX_LOCAL_FILE_BYTES } from "@/lib/media";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const {
    t,
    pets,
    selectedPetId,
    selectPet,
    documents,
    visits,
    vaccines,
    addDocument,
    removeDocument,
    settings,
  } = useApp();
  const { ask, dialog } = useConfirm();
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("medical");
  const [recordValue, setRecordValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const records = pet
    ? [
        ...visits
          .filter((visit) => visit.petId === pet.id)
          .map((visit) => ({
            kind: "visit" as const,
            id: visit.id,
            label: `${formatDate(visit.date, settings.lang)} · ${visit.reason}`,
          })),
        ...vaccines
          .filter((vaccine) => vaccine.petId === pet.id)
          .map((vaccine) => ({
            kind: "vaccine" as const,
            id: vaccine.id,
            label: `${formatDate(vaccine.date, settings.lang)} · ${vaccine.name}`,
          })),
      ].sort((a, b) => a.label.localeCompare(b.label, settings.lang))
    : [];
  const chosenRecord = records.find((record) => `${record.kind}:${record.id}` === recordValue);
  const entries = pet
    ? sortMemories(documents.filter((document) => document.petId === pet.id))
    : [];

  const save = async () => {
    if (!pet) return;
    if (!title.trim()) return setError(t.documentsNeedName);
    if (!date) return setError(t.memoryNeedDate);
    if (!file) return setError(t.documentsNeedFile);
    if (!file.size || file.size > MAX_LOCAL_FILE_BYTES) return setError(t.memoryFileLimit);
    setSaving(true);
    try {
      const [storedFile] = await saveLocalFiles([file]);
      if (!storedFile) throw new Error("The selected file could not be saved.");
      addDocument({
        petId: pet.id,
        date,
        title: title.trim(),
        category,
        file: storedFile,
        recordKind: chosenRecord?.kind,
        recordId: chosenRecord?.id,
      });
      setTitle("");
      setCategory("medical");
      setRecordValue("");
      setFile(null);
      setDate(todayISO());
      setError("");
      toast.success(t.documentsSaved);
    } catch {
      setError(t.documentsStorageError);
    } finally {
      setSaving(false);
    }
  };

  const recordTitle = (kind?: "visit" | "vaccine", id?: string) => {
    if (!kind || !id) return null;
    if (kind === "visit") {
      const visit = visits.find((item) => item.id === id);
      return visit ? `${formatDate(visit.date, settings.lang)} · ${visit.reason}` : null;
    }
    const vaccine = vaccines.find((item) => item.id === id);
    return vaccine ? `${formatDate(vaccine.date, settings.lang)} · ${vaccine.name}` : null;
  };

  return (
    <>
      <PageHeading
        back="/"
        eyebrow={t.documentsTitle}
        title={t.documentsTitle}
        subtitle={t.documentsSubtitle}
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
              <FileText className="h-5 w-5 text-primary" /> {t.documentsAdd}
            </h2>
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
                className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              >
                {(["medical", "vaccination", "adoption", "other"] as const).map((value, index) => (
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
                className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t.documentsNoRecord}</option>
                {records.map((record) => (
                  <option key={`${record.kind}:${record.id}`} value={`${record.kind}:${record.id}`}>
                    {record.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold">{t.documentsFile}</p>
              <input
                id="document-file"
                type="file"
                className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-bold file:text-primary"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setFile(picked);
                  if (picked && !title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, ""));
                  setError("");
                  event.target.value = "";
                }}
              />
              {file && <p className="break-all text-xs text-muted-foreground">{file.name}</p>}
            </div>
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
            <PrimaryButton className="w-full" disabled={saving} onClick={() => void save()}>
              {t.documentsSave}
            </PrimaryButton>
          </Card>

          <p className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            {t.documentsLocalOnly}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t.documentsTitle}</h2>
            {entries.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">{t.documentsEmpty}</p>
              </Card>
            ) : (
              entries.map((entry) => (
                <Card key={entry.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {
                          t.documentsCategories[
                            (["medical", "vaccination", "adoption", "other"] as const).indexOf(
                              entry.category,
                            )
                          ]
                        }{" "}
                        · {formatDate(entry.date, settings.lang)}
                      </p>
                    </div>
                    <button
                      aria-label={`${t.delete} ${entry.title}`}
                      onClick={() =>
                        ask(t.documentsDeleteQ, t.documentsDeleteBody, t.delete, () => {
                          void removeDocument(entry.id);
                        })
                      }
                      className="p-2 text-muted-foreground"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  {recordTitle(entry.recordKind, entry.recordId) && (
                    <p className="text-xs text-muted-foreground">
                      {t.documentsRecord}: {recordTitle(entry.recordKind, entry.recordId)}
                    </p>
                  )}
                  <LocalFilePreview file={entry.file} display="document" />
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
