import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  Avatar,
  Card,
  GhostButton,
  PageHeading,
  PrimaryButton,
  TextField,
  useConfirm,
} from "@/components/kit";
import { useApp } from "@/lib/store";
import {
  courseDay,
  doseKey,
  isFinished,
  localDate,
  normalizeTimes,
  progress,
  type MedCourse,
} from "@/lib/meds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meds")({
  component: MedsPage,
});

function MedsPage() {
  const { t, pets, meds = [], selectedPet } = useApp();
  const [adding, setAdding] = useState(false);
  const today = localDate();
  const active = meds.filter((m) => !isFinished(m, today));
  const finished = meds.filter((m) => isFinished(m, today));

  return (
    <>
      <PageHeading title={t.medsTitle} subtitle={t.medsTool} back="/" />
      {!pets.length ? (
        <Card>
          <p className="text-sm">{t.tagNoPet}</p>
        </Card>
      ) : adding ? (
        <NewCourse petId={selectedPet?.id ?? pets[0]?.id ?? ""} onClose={() => setAdding(false)} />
      ) : (
        <PrimaryButton className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t.medsNew}
        </PrimaryButton>
      )}
      <h2 className="text-xl font-semibold">{t.medsToday}</h2>
      {active.length ? (
        active.map((m) => <CourseCard key={m.id} c={m} today={today} />)
      ) : (
        <p className="text-sm text-muted-foreground">{t.medsEmpty}</p>
      )}
      {finished.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">{t.medsFinished}</h2>
          {finished.map((m) => (
            <CourseCard key={m.id} c={m} today={today} />
          ))}
        </>
      )}
    </>
  );
}

function CourseCard({ c, today }: { c: MedCourse; today: string }) {
  const { t, pets, toggleDose, removeMed } = useApp();
  const { ask, dialog } = useConfirm();
  const pet = pets.find((p) => p.id === c.petId);
  const day = courseDay(c, today);
  const pr = progress(c);
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar src={pet?.photo} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {c.name}
            {c.dose && <span className="font-semibold text-muted-foreground"> · {c.dose}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {pet?.name} · {day ? `${t.medsDay} ${day} ${t.medsOf} ${c.days}` : `${c.days} d`} ·{" "}
            {pr.done}/{pr.total}
          </p>
        </div>
        <button
          aria-label={t.medsDelete}
          onClick={() => ask(t.medsDelete, t.medsDeleteQ, t.medsDelete, () => removeMed(c.id))}
          className="text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(pr.done / pr.total) * 100}%` }}
        />
      </div>
      {day ? (
        <div className="flex flex-wrap gap-2">
          {c.times.map((time) => {
            const k = doseKey(today, time);
            const done = !!c.done[k];
            return (
              <button
                key={time}
                onClick={() => toggleDose(c.id, k)}
                aria-pressed={done}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold",
                  done ? "border-safe bg-safe text-primary-foreground" : "bg-card text-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2" />
                )}
                {time}
                {done && ` · ${t.medsDone}`}
              </button>
            );
          })}
        </div>
      ) : null}
      {dialog}
    </Card>
  );
}

function NewCourse({ petId: initialPet, onClose }: { petId: string; onClose: () => void }) {
  const { t, pets, addMed } = useApp();
  const [petId, setPetId] = useState(initialPet);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00", "20:00"]);
  const [start, setStart] = useState(localDate());
  const [days, setDays] = useState("7");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const tm = normalizeTimes(times);
    const n = Math.min(365, Math.max(1, parseInt(days, 10) || 1));
    if (!name.trim() || !tm.length) return;
    addMed({ petId, name: name.trim(), dose: dose.trim(), times: tm, startDate: start, days: n });
    toast.success(t.medsSaved);
    onClose();
  };

  return (
    <Card>
      <form onSubmit={save} className="space-y-3">
        {pets.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {pets.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPetId(p.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-bold",
                  p.id === petId ? "border-primary bg-secondary text-primary" : "bg-card",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <TextField
          label={t.medsName}
          placeholder={t.medsNamePh}
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label={t.medsDose}
          placeholder={t.medsDosePh}
          maxLength={40}
          value={dose}
          onChange={(e) => setDose(e.target.value)}
        />
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.medsTimes}</p>
          {times.map((tm, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                required
                value={tm}
                onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                className="flex-1 rounded-2xl border bg-background px-4 py-3"
              />
              {times.length > 1 && (
                <button
                  type="button"
                  aria-label="×"
                  onClick={() => setTimes(times.filter((_, j) => j !== i))}
                  className="text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          {times.length < 8 && (
            <button
              type="button"
              onClick={() => setTimes([...times, "12:00"])}
              className="text-sm font-bold text-primary"
            >
              + {t.medsAddTime}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t.medsStart}
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            label={t.medsDays}
            type="number"
            min={1}
            max={365}
            required
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton type="button" onClick={onClose}>
            ✕
          </GhostButton>
          <PrimaryButton type="submit">{t.medsSave}</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
