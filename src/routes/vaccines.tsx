import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, CheckCircle2, Syringe } from "lucide-react";
import { Avatar, Card, NeedPetHint, PageHeading } from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import { formatDate, todayISO } from "@/lib/health";
import { petAge } from "@/lib/reminders";
import { VACCINE_SCHEDULE, vaccinationPlan, type PlanStatus } from "@/lib/vaccine-schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vaccines")({
  component: VaccinesPage,
});

const statusCls: Record<PlanStatus, string> = {
  done: "bg-safe-soft text-safe",
  overdue: "bg-danger-soft text-danger",
  soon: "bg-warn-soft text-warn",
  upcoming: "bg-secondary text-primary",
};

function VaccinesPage() {
  const {
    t,
    pets,
    selectedPet,
    selectPet,
    vaccines,
    addVaccine,
    addReminder,
    reminders,
    settings,
  } = useApp();
  const pet = selectedPet ?? pets[0];
  const today = todayISO();
  const statusLabel: Record<PlanStatus, string> = {
    done: t.vsDone,
    overdue: t.vsOverdue,
    soon: t.vsSoon,
    upcoming: t.vsUpcoming,
  };

  const ageLabel = (weeks: number) =>
    weeks < 20
      ? `${weeks} ${t.vsWeeks}`
      : weeks < 104
        ? `${Math.round(weeks / 4.345)} ${t.vsMonths}`
        : `${Math.round(weeks / 52)} ${t.vsYears}`;

  if (!pet) {
    return (
      <>
        <PageHeading back="/" title={t.vsTitle} subtitle={t.vsSubtitle} />
        <NeedPetHint />
      </>
    );
  }

  const items = VACCINE_SCHEDULE[pet.species];
  const plan = vaccinationPlan(
    pet.species,
    pet.birthDate,
    vaccines.filter((v) => v.petId === pet.id),
    today,
  );
  const age = petAge(pet.birthDate);

  return (
    <>
      <PageHeading back="/" eyebrow={t.hTabVaccines} title={t.vsTitle} subtitle={t.vsSubtitle} />

      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPet(p.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4",
                p.id === pet.id ? "border-primary bg-secondary" : "bg-card",
              )}
            >
              <Avatar src={p.photo} size={32} />
              <span className="text-sm font-bold">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <Card className="flex items-center gap-3">
        <Avatar src={pet.photo} size={48} />
        <div>
          <p className="font-bold">{pet.name}</p>
          <p className="text-xs text-muted-foreground">
            {speciesLabel(t, pet.species)}
            {age &&
              ` · ${t.vsAge}: ${age.years ? `${age.years} ${t.vsYears} ` : ""}${age.months} ${t.vsMonths}`}
          </p>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm">{t.vsNone}</p>
        </Card>
      ) : (
        <>
          <section className="space-y-2">
            {items.map((it) => (
              <Card key={it.id} className="space-y-1 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Syringe className="h-4 w-4 text-primary" /> {it.vaccine}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                      it.core ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {it.core ? t.vsCore : t.vsOptional}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{it.what[settings.lang]}</p>
                <p className="text-xs font-semibold">
                  {it.doses.map(ageLabel).join(" · ")} · {t.vsEvery}{" "}
                  {it.repeatMonths >= 12
                    ? `${it.repeatMonths / 12} ${t.vsYears}`
                    : `${it.repeatMonths} ${t.vsMonths}`}
                </p>
              </Card>
            ))}
          </section>

          {!pet.birthDate ? (
            <Card className="space-y-3">
              <p className="text-sm">{t.vsNeedBirth}</p>
              <Link
                to="/pets"
                className="inline-flex rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                {t.vsOpenCard}
              </Link>
            </Card>
          ) : (
            <section className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.vsMatchHint}</p>
              {plan.map((r) => {
                const reminded = reminders.some(
                  (x) =>
                    x.petId === pet.id &&
                    x.title === `${t.catVaccine}: ${r.vaccine}` &&
                    x.dueAt.slice(0, 10) === r.due,
                );
                return (
                  <Card key={`${r.itemId}-${r.dose}`} className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {r.vaccine}{" "}
                          <span className="text-xs font-semibold text-muted-foreground">
                            #{r.dose}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.doneOn ?? r.due, settings.lang)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-extrabold",
                          statusCls[r.status],
                        )}
                      >
                        {statusLabel[r.status]}
                      </span>
                    </div>
                    {r.status !== "done" && (
                      <div className="flex flex-wrap gap-2">
                        {r.due <= today && (
                          <button
                            onClick={() => {
                              addVaccine({ petId: pet.id, name: r.vaccine, date: today });
                              toast.success(t.vsLogged);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold text-primary"
                          >
                            <CheckCircle2 className="h-4 w-4" /> {t.vsLog}
                          </button>
                        )}
                        {r.due > today && !reminded && (
                          <button
                            onClick={() => {
                              addReminder({
                                petId: pet.id,
                                category: t.catVaccine,
                                title: `${t.catVaccine}: ${r.vaccine}`,
                                dueAt: new Date(`${r.due}T09:00`).toISOString(),
                                repeatDays: null,
                              });
                              toast.success(t.hReminderAdded);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold text-primary"
                          >
                            <Bell className="h-4 w-4" /> {t.vsRemind}
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}
      <p className="text-xs font-semibold text-warn">{t.disclaimer}</p>
    </>
  );
}
