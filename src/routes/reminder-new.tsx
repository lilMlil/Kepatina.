import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, Chip, PageHeading, PrimaryButton, TextField } from "@/components/kit";
import { useApp } from "@/lib/store";
import { repeatDailyLabel } from "@/lib/reminders";
import { DateField, TimeField } from "@/components/pickers";

export const Route = createFileRoute("/reminder-new")({
  component: NewReminder,
});

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function NewReminder() {
  const { t, pets, selectedPetId, addReminder, settings } = useApp();
  const nav = useNavigate();
  const cats = [t.catVaccine, t.catDeworm, t.catNails, t.catOther];
  const reps = [
    { l: t.once, d: null },
    { l: repeatDailyLabel[settings.lang], d: 1 },
    { l: t.rep30, d: 30 },
    { l: t.rep90, d: 90 },
    { l: t.rep180, d: 180 },
    { l: t.rep365, d: 365 },
  ];
  const [petId, setPetId] = useState<string | null>(null);
  const [cat, setCat] = useState(0);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(inDays(7));
  const [time, setTime] = useState("09:00");
  const [rep, setRep] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const active = petId ?? selectedPetId ?? pets[0]?.id ?? null;

  const save = () => {
    if (!active) return setErr(t.needPetFirst);
    const due = new Date(`${date}T${time}`);
    if (isNaN(due.getTime()) || due.getTime() <= Date.now()) return setErr(t.futureDate);
    const finalTitle = title.trim() || (cat === 3 ? "" : (cats[cat] ?? ""));
    if (!finalTitle) return setErr(t.needTitle);
    addReminder({
      petId: active,
      category: cats[cat] ?? "",
      title: finalTitle,
      dueAt: due.toISOString(),
      repeatDays: rep,
    });
    toast.success(t.saved);
    void nav({ to: "/reminders" });
  };

  return (
    <>
      <PageHeading back="/reminders" title={t.newReminder} subtitle={t.newReminderSub} />
      {!pets.length ? (
        <p className="rounded-2xl bg-warn-soft p-3 text-sm font-semibold text-warn">
          {t.needPetFirst}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.pet}</p>
          <div className="flex flex-wrap gap-2">
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => setPetId(p.id)}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-bold ${p.id === active ? "border-primary bg-secondary" : "bg-card"}`}
              >
                <Avatar src={p.photo} size={30} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-bold">{t.category}</p>
        <div className="flex flex-wrap gap-2">
          {cats.map((c, i) => (
            <Chip key={c} active={i === cat} onClick={() => setCat(i)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <TextField
        label={cat === 3 ? t.title : t.titleOptional}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
      />
      <div className="grid grid-cols-2 gap-3">
        <DateField label={t.date} value={date} onChange={setDate} />
        <TimeField label={t.time} value={time} onChange={setTime} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold">{t.repeat}</p>
        <div className="flex flex-wrap gap-2">
          {reps.map((r) => (
            <Chip key={r.l} active={r.d === rep} onClick={() => setRep(r.d)}>
              {r.l}
            </Chip>
          ))}
        </div>
      </div>
      {err && <p className="text-sm font-bold text-destructive">{err}</p>}
      <PrimaryButton className="w-full" onClick={save}>
        {t.save}
      </PrimaryButton>
    </>
  );
}
