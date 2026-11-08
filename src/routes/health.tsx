import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { CalendarCheck, FileDown, Scale, Stethoscope, Syringe, Trash2 } from "lucide-react";
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
import { printReport } from "@/lib/print";
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

          <Card className="space-y-3">
            <GhostButton
              className="w-full"
              onClick={() =>
                printReport(`${pet.name} — ${t.hReportTitle} ${todayISO()}`, () =>
                  toast.error(t.hPrintFail),
                )
              }
            >
              <FileDown className="h-4 w-4" /> {t.hExport}
            </GhostButton>
            <p className="text-center text-xs text-muted-foreground">{t.hExportHint}</p>
          </Card>

          <VetReport pet={pet} />
        </>
      )}
    </>
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
          <TextField
            label={t.date}
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErr("");
            }}
          />
          <TextField
            label={`${t.hWeightField} (${unit})`}
            type="number"
            inputMode="decimal"
            min={0}
            step={grams ? "1" : "0.01"}
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
          <TextField
            label={t.hVaccineDate}
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErr("");
            }}
          />
          <TextField
            label={t.hNextDue}
            type="date"
            min={date || undefined}
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
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
        <TextField
          label={t.hVisitDate}
          type="date"
          max={todayISO()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
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
          </Card>
        ))}
      </section>
      {dialog}
    </>
  );
}

/* --------------------------------------------------------- printable report */

const PRINT_CSS = `
@media screen { #vet-report { display: none; } }
@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; }
  body > *:not(#vet-report) { display: none !important; }
  #vet-report { display: block; }
}
#vet-report { color: #111; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
#vet-report h1 { font-size: 22px; margin: 0 0 2px; }
#vet-report h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #2f6b4f; color: #2f6b4f; }
#vet-report .meta { color: #555; font-size: 11px; margin: 0 0 10px; }
#vet-report dl { display: grid; grid-template-columns: 170px 1fr; gap: 3px 12px; margin: 0; }
#vet-report dt { font-weight: 700; }
#vet-report dd { margin: 0; white-space: pre-wrap; }
#vet-report table { width: 100%; border-collapse: collapse; }
#vet-report th, #vet-report td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
#vet-report th { background: #eef3ef; }
#vet-report tr { break-inside: avoid; }
#vet-report .empty { color: #666; font-style: italic; }
#vet-report .foot { margin-top: 22px; color: #666; font-size: 10px; border-top: 1px solid #ccc; padding-top: 6px; }
`;

/** Plain SVG weight chart for the printed report (no dependency on layout width). */
function PrintChart({ points, unit }: { points: { date: string; v: number }[]; unit: string }) {
  const W = 640;
  const H = 170;
  const L = 46;
  const R = 12;
  const T = 12;
  const B = 24;
  const times = points.map((p) => new Date(`${p.date}T00:00:00`).getTime());
  const t0 = times[0] ?? 0;
  const t1 = times[times.length - 1] ?? t0;
  let lo = Math.min(...points.map((p) => p.v));
  let hi = Math.max(...points.map((p) => p.v));
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const x = (i: number) =>
    t1 === t0 ? (L + W - R) / 2 : L + (((times[i] ?? t0) - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const pts = points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const fmt = (v: number) => String(Number(v.toFixed(2)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ maxHeight: 200 }}>
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="#999" />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#999" />
      <text x={L - 6} y={T + 4} fontSize="10" textAnchor="end" fill="#444">
        {fmt(hi)}
      </text>
      <text x={L - 6} y={H - B} fontSize="10" textAnchor="end" fill="#444">
        {fmt(lo)}
      </text>
      <text x={L - 6} y={(T + H - B) / 2 + 4} fontSize="10" textAnchor="end" fill="#444">
        {unit}
      </text>
      <polyline points={pts} fill="none" stroke="#2f6b4f" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.v)} r="3" fill="#2f6b4f" />
      ))}
      <text x={L} y={H - 6} fontSize="10" fill="#444">
        {points[0]?.date}
      </text>
      <text x={W - R} y={H - 6} fontSize="10" textAnchor="end" fill="#444">
        {points[points.length - 1]?.date}
      </text>
    </svg>
  );
}

function VetReport({ pet }: { pet: Pet }) {
  const { t, owner, weights, vaccines, visits, settings } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const locale = settings.lang;
  const grams = usesGrams(pet.species);
  const unit = grams ? t.hUnitG : t.hUnitKg;
  const wAsc = sortByDateAsc(weights.filter((w) => w.petId === pet.id));
  const wDesc = [...wAsc].reverse();
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

  const node = (
    <div id="vet-report">
      <style>{PRINT_CSS}</style>
      <h1>{t.hReportTitle}</h1>
      <p className="meta">
        {t.appName} · {t.hReportCreated}: {formatDate(todayISO(), locale)}
      </p>

      <dl>
        {info
          .filter(([, v]) => v.trim())
          .map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      <h2>{t.hTabWeight}</h2>
      {wAsc.length === 0 ? (
        <p className="empty">{t.hReportEmpty}</p>
      ) : (
        <>
          {wAsc.length > 1 && (
            <PrintChart
              points={wAsc.map((w) => ({ date: w.date, v: chartValue(w.kg, pet.species) }))}
              unit={unit}
            />
          )}
          <table>
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.hWeightField}</th>
              </tr>
            </thead>
            <tbody>
              {wDesc.slice(0, 15).map((w) => (
                <tr key={w.id}>
                  <td>{formatDate(w.date, locale)}</td>
                  <td>{formatWeight(w.kg, pet.species)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>{t.hTabVaccines}</h2>
      {vacc.length === 0 ? (
        <p className="empty">{t.hReportEmpty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.hVaccineDate}</th>
              <th>{t.hVaccineName}</th>
              <th>{t.hNextOn}</th>
              <th>{t.hVaccineNote}</th>
            </tr>
          </thead>
          <tbody>
            {vacc.map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.date, locale)}</td>
                <td>{v.name}</td>
                <td>{v.nextDue ? formatDate(v.nextDue, locale) : ""}</td>
                <td>{v.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t.hTabVisits}</h2>
      {vis.length === 0 ? (
        <p className="empty">{t.hReportEmpty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.hVisitDate}</th>
              <th>{t.hVisitReason}</th>
              <th>{t.hVisitClinic}</th>
              <th>{t.hVisitNotes}</th>
            </tr>
          </thead>
          <tbody>
            {vis.map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.date, locale)}</td>
                <td>{v.reason}</td>
                <td>{v.clinic ?? ""}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{v.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="foot">{t.hReportFooter}</p>
    </div>
  );

  // Rendered straight into <body> so the print stylesheet can hide the rest of the app.
  return createPortal(node, document.body);
}
