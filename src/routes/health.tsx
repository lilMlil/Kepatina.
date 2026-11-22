import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  FileDown,
  FileText,
  ImagePlus,
  Loader2,
  Paperclip,
  Scale,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Card,
  Chip,
  GhostButton,
  PageHeading,
  PrimaryButton,
  TextField,
  useConfirm,
} from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import { createReportPdf, deliverPdf, safeFileName, type ReportBlock } from "@/lib/print";
import { MAX_LOCAL_FILE_BYTES, saveLocalFiles } from "@/lib/media";
import type { DocumentEntry } from "@/lib/memories";
import { NoAppError, openStoredFile } from "@/lib/native/open-file";
import { petAge, type Pet } from "@/lib/reminders";
import type { Dict } from "@/lib/i18n";
import {
  VACCINE_SUGGESTIONS,
  usesGrams,
  chartValue,
  dueStatus,
  formatDate,
  formatWeight,
  formatWeightDelta,
  latestWeight,
  parseNumber,
  sortByDateAsc,
  sortByDateDesc,
  todayISO,
} from "@/lib/health";
import { DateField } from "@/components/pickers";

export const Route = createFileRoute("/health")({
  component: HealthPage,
});

type Tab = "weight" | "vaccines" | "visits";

function ageText(t: Dict, birthDate?: string) {
  const a = petAge(birthDate);
  if (!a) return "";
  const parts = [
    a.years ? `${a.years} ${t.ageY}` : "",
    a.months ? `${a.months} ${t.ageM}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : t.ageLess;
}

function HealthPage() {
  const { t, pets, selectedPetId, selectPet } = useApp();
  const [tab, setTab] = useState<Tab>("weight");
  const pet = pets.find((p) => p.id === selectedPetId) ?? pets[0];
  const tabs: { id: Tab; label: string; icon: typeof Scale }[] = [
    { id: "weight", label: t.hTabWeight, icon: Scale },
    { id: "vaccines", label: t.hTabVaccines, icon: Syringe },
    { id: "visits", label: t.hTabVisits, icon: CalendarCheck },
  ];

  return (
    <>
      <PageHeading back="/" eyebrow={t.hEyebrow} title={t.hTitle} subtitle={t.hSubtitle} />
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/documents"
          className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-3 py-3 text-center text-sm font-bold text-primary"
        >
          <FileText className="h-4 w-4 shrink-0" /> {t.documentsTitle}
        </Link>
        <Link
          to="/memories"
          className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-3 py-3 text-center text-sm font-bold text-primary"
        >
          <ImagePlus className="h-4 w-4 shrink-0" /> {t.memoryTitle}
        </Link>
      </div>

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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPet(p.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-bold ${p.id === pet.id ? "border-primary bg-secondary" : "bg-card"}`}
              >
                <Avatar src={p.photo} size={30} /> {p.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-sm font-bold transition-colors ${tab === id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-secondary"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "weight" && <WeightTab pet={pet} />}
          {tab === "vaccines" && <VaccinesTab pet={pet} />}
          {tab === "visits" && <VisitsTab pet={pet} />}

          <ExportCard pet={pet} />
        </>
      )}
    </>
  );
}

function RecordDocuments({
  petId,
  recordKind,
  recordId,
  recordDate,
}: {
  petId: string;
  recordKind: "visit" | "vaccine";
  recordId: string;
  recordDate: string;
}) {
  const { t, documents, addDocument, removeDocument } = useApp();
  const { ask, dialog } = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const attached = documents.filter(
    (document) =>
      document.petId === petId &&
      document.recordKind === recordKind &&
      document.recordId === recordId,
  );

  const open = async (entry: DocumentEntry) => {
    try {
      const result = await openStoredFile(entry.file);
      if (result === "downloaded") toast.success(t.documentsDownloaded);
    } catch (error) {
      if (error instanceof NoAppError) toast.error(t.documentsNoApp);
      else if ((error as Error | undefined)?.message === "missing") toast.error(t.documentsMissing);
      else toast.error(t.documentsOpenError);
    }
  };

  const remove = async (entry: DocumentEntry) => {
    const removed = await removeDocument(entry.id);
    if (!removed) toast.error(t.documentsDeleteError);
  };

  const pick = async (file: File | null) => {
    if (!file) return;
    if (!file.size || file.size > MAX_LOCAL_FILE_BYTES) return void toast.error(t.memoryFileLimit);
    setBusy(true);
    try {
      const [stored] = await saveLocalFiles([file]);
      if (!stored) throw new Error("not saved");
      addDocument({
        petId,
        date: recordDate,
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        category: recordKind === "vaccine" ? "vaccination" : "medical",
        file: stored,
        recordKind,
        recordId,
      });
      toast.success(t.hAttachSaved);
    } catch {
      toast.error(t.documentsStorageError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1 pt-2">
      {attached.length > 0 && (
        <p className="text-xs font-bold text-muted-foreground">{t.documentsAttachments}</p>
      )}
      {attached.map((document) => (
        <div key={document.id} className="flex items-center gap-1 rounded-xl bg-secondary">
          <button
            type="button"
            onClick={() => void open(document)}
            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-bold text-primary"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-all">{document.title}</span>
          </button>
          <button
            type="button"
            aria-label={`${t.delete} ${document.title}`}
            onClick={() =>
              ask(t.documentsDeleteQ, t.documentsDeleteBody, t.delete, () => void remove(document))
            }
            className="p-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void pick(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm font-bold text-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {t.hAttach}
      </button>
      {dialog}
    </div>
  );
}

/* ------------------------------------------------------------------ weight */

function WeightTab({ pet }: { pet: Pet }) {
  const { t, weights, addWeight, removeWeight, settings } = useApp();
  const { ask, dialog } = useConfirm();
  const [date, setDate] = useState(todayISO());
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const grams = usesGrams(pet.species);
  const unit = grams ? t.hUnitG : t.hUnitKg;
  const locale = settings.lang;

  const entries = useMemo(
    () => sortByDateAsc(weights.filter((w) => w.petId === pet.id)),
    [weights, pet.id],
  );
  const history = useMemo(() => sortByDateDesc(entries), [entries]);
  const last = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const first = entries[0];

  const data = entries.map((w) => ({
    date: w.date,
    label: new Date(`${w.date}T00:00:00`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    }),
    v: chartValue(w.kg, pet.species),
  }));
  const vs = data.map((d) => d.v);
  const lo = vs.length ? Math.min(...vs) : 0;
  const hi = vs.length ? Math.max(...vs) : 1;
  const pad = hi === lo ? Math.max(hi * 0.05, grams ? 5 : 0.5) : (hi - lo) * 0.25;
  const domain: [number, number] = [
    Math.max(0, Number((lo - pad).toFixed(2))),
    Number((hi + pad).toFixed(2)),
  ];

  const submit = () => {
    const n = parseNumber(value);
    const kg = grams ? n / 1000 : n;
    if (!Number.isFinite(kg) || kg > 200) return setErr(t.hNeedValue);
    if (!date) return setErr(t.hNeedDate);
    if (date > todayISO()) return setErr(t.hDateInFuture);
    addWeight(pet.id, date, kg);
    toast.success(t.hSaved);
    setValue("");
    setErr("");
  };

  const delta = (a: number, b: number) => formatWeightDelta(a - b, pet.species);

  return (
    <>
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Scale className="h-5 w-5 text-primary" /> {t.hAdd}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label={t.date}
            max={todayISO()}
            value={date}
            onChange={(v) => {
              setDate(v);
              setErr("");
            }}
          />
          <TextField
            label={`${t.hWeightField} (${unit})`}
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErr("");
            }}
          />
        </div>
        {err && <p className="text-sm font-bold text-destructive">{err}</p>}
        <PrimaryButton className="w-full" onClick={submit}>
          {t.hSave}
        </PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t.hWeightTitle}</h2>
        {!last ? (
          <p className="text-sm text-muted-foreground">{t.hNoWeights}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={t.hCurrent} value={formatWeight(last.kg, pet.species)} />
              <Stat label={t.hSincePrev} value={prev ? delta(last.kg, prev.kg) : "—"} />
              <Stat
                label={t.hSinceFirst}
                value={first && first !== last ? delta(last.kg, first.kg) : "—"}
              />
            </div>
            <div
              className="h-56 w-full text-muted-foreground [&_.recharts-line-curve]:stroke-primary [&_.recharts-line-dot]:fill-primary [&_.recharts-line-dot]:stroke-primary"
              role="img"
              aria-label={`${t.hWeightTitle}: ${pet.name}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    stroke="currentColor"
                    strokeOpacity={0.4}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={domain}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    stroke="currentColor"
                    strokeOpacity={0.4}
                    width={44}
                    allowDecimals={!grams}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} ${unit}`, t.hWeightField] as [string, string]}
                    labelFormatter={(_, p) =>
                      formatDate(String(p?.[0]?.payload?.date ?? ""), locale)
                    }
                    contentStyle={{ borderRadius: 16, fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {entries.length < 2 && <p className="text-xs text-muted-foreground">{t.hNeedTwo}</p>}
          </>
        )}
      </Card>

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t.hHistory}</h2>
          {history.map((w) => {
            const i = entries.findIndex((e) => e.id === w.id);
            const before = i > 0 ? entries[i - 1] : undefined;
            return (
              <Card key={w.id} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-bold">{formatWeight(w.kg, pet.species)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(w.date, locale)}</p>
                </div>
                {before && (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {delta(w.kg, before.kg)}
                  </span>
                )}
                <button
                  aria-label={t.delete}
                  onClick={() =>
                    ask(
                      t.hDeleteQ,
                      `${formatWeight(w.kg, pet.species)} · ${formatDate(w.date, locale)}`,
                      t.delete,
                      () => removeWeight(w.id),
                    )
                  }
                  className="p-2 text-muted-foreground"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </Card>
            );
          })}
        </section>
      )}
      {dialog}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-2.5">
      <p className="text-base font-bold text-primary">{value}</p>
      <p className="text-[11px] font-semibold leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- vaccines */

function VaccinesTab({ pet }: { pet: Pet }) {
  const { t, vaccines, addVaccine, removeVaccine, addReminder, settings } = useApp();
  const { ask, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [nextDue, setNextDue] = useState("");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(true);
  const [err, setErr] = useState("");
  const locale = settings.lang;

  const mine = vaccines.filter((v) => v.petId === pet.id);
  const list = sortByDateDesc(mine);
  const canRemind = !!nextDue && nextDue > todayISO();
  const overdue = list.filter((v) => dueStatus(v, mine) === "overdue");
  const nextUp = mine
    .filter((v) => v.nextDue && dueStatus(v, mine) === "upcoming")
    .sort((a, b) => (a.nextDue ?? "").localeCompare(b.nextDue ?? ""))[0];

  const submit = () => {
    if (!name.trim()) return setErr(t.hNeedName);
    if (!date) return setErr(t.hNeedDate);
    if (date > todayISO()) return setErr(t.hDateInFuture);
    addVaccine({
      petId: pet.id,
      name: name.trim(),
      date,
      nextDue: nextDue || undefined,
      note: note.trim() || undefined,
    });
    if (remind && canRemind) {
      const due = new Date(`${nextDue}T09:00`);
      if (!Number.isNaN(due.getTime()) && due.getTime() > Date.now()) {
        addReminder({
          petId: pet.id,
          category: t.catVaccine,
          title: `${t.catVaccine}: ${name.trim()}`,
          dueAt: due.toISOString(),
          repeatDays: null,
        });
        toast.success(t.hReminderAdded);
      }
    } else {
      toast.success(t.hSaved);
    }
    setName("");
    setNextDue("");
    setNote("");
    setErr("");
  };

  return (
    <>
      {(overdue.length > 0 || nextUp) && (
        <Card className="space-y-3 py-3">
          {overdue.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-danger">{t.hOverdueTitle}</p>
              {overdue.map((v) => (
                <p key={v.id} className="text-sm">
                  {v.name} · {formatDate(v.nextDue ?? "", locale)}
                </p>
              ))}
            </div>
          )}
          {nextUp && (
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-safe">{t.hUpcomingTitle}</p>
              <p className="text-sm">
                {nextUp.name} · {formatDate(nextUp.nextDue ?? "", locale)}
              </p>
            </div>
          )}
        </Card>
      )}
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Syringe className="h-5 w-5 text-primary" /> {t.hAdd}
        </h2>
        <TextField
          label={t.hVaccineName}
          placeholder={t.hVaccineNamePh}
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
        />
        <div className="flex flex-wrap gap-2">
          {VACCINE_SUGGESTIONS[pet.species].map((s) => (
            <Chip key={s} active={name === s} onClick={() => setName(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label={t.hVaccineDate}
            max={todayISO()}
            value={date}
            onChange={(v) => {
              setDate(v);
              setErr("");
            }}
          />
          <DateField
            label={t.hNextDue}
            min={date || undefined}
            value={nextDue}
            onChange={setNextDue}
          />
        </div>
        {canRemind && (
          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={remind}
              onChange={(e) => setRemind(e.target.checked)}
            />
            {t.hRemindMe}
          </label>
        )}
        <TextField
          label={t.hVaccineNote}
          maxLength={120}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {err && <p className="text-sm font-bold text-destructive">{err}</p>}
        <PrimaryButton className="w-full" onClick={submit}>
          {t.hSave}
        </PrimaryButton>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t.hHistory}</h2>
        {list.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">{t.hNoVaccines}</p>
          </Card>
        )}
        {list.map((v) => {
          const status = dueStatus(v, mine);
          return (
            <Card key={v.id} className="space-y-1 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-bold">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(v.date, locale)}</p>
                </div>
                <button
                  aria-label={t.delete}
                  onClick={() =>
                    ask(t.hDeleteQ, `${v.name} · ${formatDate(v.date, locale)}`, t.delete, () =>
                      removeVaccine(v.id),
                    )
                  }
                  className="p-2 text-muted-foreground"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              {v.nextDue && (
                <p
                  className={`text-sm font-bold ${status === "overdue" ? "text-danger" : status === "upcoming" ? "text-safe" : "text-muted-foreground"}`}
                >
                  {status === "overdue" ? t.hOverdueOn : t.hNextOn}: {formatDate(v.nextDue, locale)}
                </p>
              )}
              {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
              <RecordDocuments
                petId={pet.id}
                recordKind="vaccine"
                recordId={v.id}
                recordDate={v.date}
              />
            </Card>
          );
        })}
      </section>
      {dialog}
    </>
  );
}

/* ------------------------------------------------------------------ visits */

function VisitsTab({ pet }: { pet: Pet }) {
  const { t, visits, addVisit, removeVisit, settings } = useApp();
  const { ask, dialog } = useConfirm();
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const locale = settings.lang;
  const list = sortByDateDesc(visits.filter((v) => v.petId === pet.id));

  const submit = () => {
    if (!reason.trim()) return setErr(t.hNeedReason);
    if (!date) return setErr(t.hNeedDate);
    if (date > todayISO()) return setErr(t.hDateInFuture);
    addVisit({
      petId: pet.id,
      date,
      reason: reason.trim(),
      clinic: clinic.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    toast.success(t.hSaved);
    setReason("");
    setClinic("");
    setNotes("");
    setErr("");
  };

  return (
    <>
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Stethoscope className="h-5 w-5 text-primary" /> {t.hAdd}
        </h2>
        <DateField
          label={t.hVisitDate}
          max={todayISO()}
          value={date}
          onChange={(v) => {
            setDate(v);
            setErr("");
          }}
        />
        <TextField
          label={t.hVisitReason}
          placeholder={t.hVisitReasonPh}
          maxLength={80}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setErr("");
          }}
        />
        <TextField
          label={t.hVisitClinic}
          maxLength={80}
          value={clinic}
          onChange={(e) => setClinic(e.target.value)}
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">{t.hVisitNotes}</span>
          <textarea
            value={notes}
            rows={3}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {err && <p className="text-sm font-bold text-destructive">{err}</p>}
        <PrimaryButton className="w-full" onClick={submit}>
          {t.hSave}
        </PrimaryButton>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t.hHistory}</h2>
        {list.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">{t.hNoVisits}</p>
          </Card>
        )}
        {list.map((v) => (
          <Card key={v.id} className="space-y-1 py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold">{v.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {[formatDate(v.date, locale), v.clinic].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                aria-label={t.delete}
                onClick={() =>
                  ask(t.hDeleteQ, `${v.reason} · ${formatDate(v.date, locale)}`, t.delete, () =>
                    removeVisit(v.id),
                  )
                }
                className="p-2 text-muted-foreground"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            {v.notes && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{v.notes}</p>
            )}
            <RecordDocuments
              petId={pet.id}
              recordKind="visit"
              recordId={v.id}
              recordDate={v.date}
            />
          </Card>
        ))}
      </section>
      {dialog}
    </>
  );
}

/* ------------------------------------------------------------- PDF export */

type Owner = { name: string };

function buildReportBlocks(
  t: Dict,
  pet: Pet,
  owner: Owner,
  weights: ReturnType<typeof useApp>["weights"],
  vaccines: ReturnType<typeof useApp>["vaccines"],
  visits: ReturnType<typeof useApp>["visits"],
  documents: DocumentEntry[],
  locale: string,
): ReportBlock[] {
  const grams = usesGrams(pet.species);
  const unit = grams ? t.hUnitG : t.hUnitKg;
  const wAsc = sortByDateAsc(weights.filter((w) => w.petId === pet.id));
  const vacc = sortByDateDesc(vaccines.filter((v) => v.petId === pet.id));
  const vis = sortByDateDesc(visits.filter((v) => v.petId === pet.id));
  const lastW = latestWeight(weights, pet.id);
  const weightNow = lastW
    ? formatWeight(lastW.kg, pet.species)
    : pet.weightKg
      ? `${pet.weightKg} kg`
      : "";
  const age = ageText(t, pet.birthDate);
  const info: [string, string][] = [
    [t.petName, pet.name],
    [t.species, speciesLabel(t, pet.species)],
    [t.medBreed, pet.breed ?? ""],
    [t.medSex, pet.sex === "m" ? t.sexM : pet.sex === "f" ? t.sexF : ""],
    [
      t.medBirth,
      pet.birthDate ? `${formatDate(pet.birthDate, locale)}${age ? ` (${age})` : ""}` : "",
    ],
    [t.medChip, pet.chipNumber ?? ""],
    [t.hCurrent + " — " + t.hWeightField.toLowerCase(), weightNow],
    [t.hReportOwner, owner.name],
    [t.medVet, pet.vetPhone ?? ""],
    [t.medNotes, pet.notes ?? ""],
  ];

  const docNames = (kind: "visit" | "vaccine", id: string) =>
    documents
      .filter((d) => d.petId === pet.id && d.recordKind === kind && d.recordId === id)
      .map((d) => d.title)
      .join("\n");

  const empty: ReportBlock = { type: "text", text: t.hReportEmpty, muted: true };
  const blocks: ReportBlock[] = [
    {
      type: "title",
      text: t.hReportTitle,
      meta: `${t.appName} · ${t.hReportCreated}: ${formatDate(todayISO(), locale)}`,
    },
    { type: "kv", rows: info },
    { type: "heading", text: t.hTabWeight },
  ];

  if (wAsc.length === 0) {
    blocks.push(empty);
  } else {
    if (wAsc.length > 1) {
      blocks.push({
        type: "chart",
        points: wAsc.map((w) => ({ date: w.date, v: chartValue(w.kg, pet.species) })),
        unit,
      });
    }
    blocks.push({
      type: "table",
      head: [t.date, t.hWeightField, t.hSincePrev],
      widths: [0.34, 0.33, 0.33],
      rows: wAsc
        .map((w, i) => {
          const before = wAsc[i - 1];
          return [
            formatDate(w.date, locale),
            formatWeight(w.kg, pet.species),
            before ? formatWeightDelta(w.kg - before.kg, pet.species) : "",
          ];
        })
        .reverse()
        .slice(0, 30),
    });
  }

  blocks.push({ type: "heading", text: t.hTabVaccines });
  if (vacc.length === 0) {
    blocks.push(empty);
  } else {
    const withDocs = vacc.some((v) => docNames("vaccine", v.id));
    blocks.push({
      type: "table",
      head: [
        t.hVaccineDate,
        t.hVaccineName,
        t.hNextOn,
        t.hVaccineNote,
        ...(withDocs ? [t.documentsTitle] : []),
      ],
      widths: withDocs ? [0.16, 0.22, 0.2, 0.22, 0.2] : [0.18, 0.3, 0.24, 0.28],
      rows: vacc.map((v) => [
        formatDate(v.date, locale),
        v.name,
        v.nextDue
          ? `${formatDate(v.nextDue, locale)}${dueStatus(v, vacc) === "overdue" ? ` (${t.hOverdueOn})` : ""}`
          : "",
        v.note ?? "",
        ...(withDocs ? [docNames("vaccine", v.id)] : []),
      ]),
    });
  }

  blocks.push({ type: "heading", text: t.hTabVisits });
  if (vis.length === 0) {
    blocks.push(empty);
  } else {
    const withDocs = vis.some((v) => docNames("visit", v.id));
    blocks.push({
      type: "table",
      head: [
        t.hVisitDate,
        t.hVisitReason,
        t.hVisitClinic,
        t.hVisitNotes,
        ...(withDocs ? [t.documentsTitle] : []),
      ],
      widths: withDocs ? [0.15, 0.2, 0.17, 0.3, 0.18] : [0.17, 0.23, 0.2, 0.4],
      rows: vis.map((v) => [
        formatDate(v.date, locale),
        v.reason,
        v.clinic ?? "",
        v.notes ?? "",
        ...(withDocs ? [docNames("visit", v.id)] : []),
      ]),
    });
  }

  blocks.push({ type: "note", text: t.hReportFooter });
  return blocks;
}

function ExportCard({ pet }: { pet: Pet }) {
  const { t, owner, weights, vaccines, visits, documents, settings } = useApp();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const title = `${pet.name} — ${t.hReportTitle}`;
      const blocks = buildReportBlocks(
        t,
        pet,
        owner,
        weights,
        vaccines,
        visits,
        documents,
        settings.lang,
      );
      const pdf = await createReportPdf(blocks, {
        title,
        appName: t.appName,
        pageLabel: (page, total) => `${t.hReportPage} ${page} / ${total}`,
      });
      const result = await deliverPdf(
        pdf,
        safeFileName(`${pet.name}-${t.hReportTitle}-${todayISO()}`, "pdf"),
        title,
      );
      if (result === "downloaded") toast.success(t.hExportDownloaded);
    } catch {
      toast.error(t.hExportFail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <GhostButton className="w-full" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}{" "}
        {busy ? t.hExporting : t.hExport}
      </GhostButton>
      <p className="text-center text-xs text-muted-foreground">{t.hExportHint}</p>
    </Card>
  );
}
