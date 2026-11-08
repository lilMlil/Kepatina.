import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  BookUser,
  Bell,
  ClipboardCheck,
  HeartPulse,
  Info,
  Plus,
  Stethoscope,
  Syringe,
  Pill,
  QrCode,
  UtensilsCrossed,
  Wallet,
  Leaf,
} from "lucide-react";
import { Avatar, Card } from "@/components/kit";
import { Carousel } from "@/components/Carousel";
import { speciesLabel, useApp } from "@/lib/store";
import { seasonFor, tipsFor } from "@/lib/seasonal";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { t, pets, reminders, selectedPetId, selectedPet, selectPet, owner, settings } = useApp();
  const season = seasonFor();
  const seasonalTip = tipsFor(season, selectedPet?.species)[0];
  const checklistText = {
    lv: ["Jaunā mīluļa kontrolsaraksts", "Ko sagatavot pirms mājās, pirmajā nedēļā un mēnesī"],
    en: ["New pet checklist", "What to prepare before, in week one and month one"],
    ru: ["Чек-лист для нового питомца", "Что подготовить до, в первую неделю и месяц"],
    fr: ["Check-list du nouvel animal", "À préparer avant, la première semaine et le premier mois"],
  }[settings.lang];
  const carouselLabels = {
    lv: ["Iepriekšējais bloks", "Nākamais bloks"],
    en: ["Previous card", "Next card"],
    ru: ["Предыдущая карточка", "Следующая карточка"],
    fr: ["Carte précédente", "Carte suivante"],
  }[settings.lang];
  const slides = [
    { to: "/checklist", icon: ClipboardCheck, title: checklistText[0], text: checklistText[1] },
    { to: "/care", icon: BookOpen, title: t.careGuides, text: t.careGuidesTool },
    { to: "/tag", icon: QrCode, title: t.tagTitle, text: t.tagTool },
    { to: "/vaccines", icon: Syringe, title: t.vsTitle, text: t.vsTool },
    { to: "/passport", icon: BookUser, title: t.ppTitle, text: t.ppTool },
    { to: "/meds", icon: Pill, title: t.medsTitle, text: t.medsTool },
    { to: "/health", icon: HeartPulse, title: t.hTitle, text: t.hToolText },
  ] as const;
  const next = [...reminders]
    .filter((r) => new Date(r.dueAt).getTime() >= Date.now())
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border bg-welcome p-5 shadow-soft">
        <p className="relative text-sm font-bold text-muted-foreground">
          {owner.name ? `${t.greeting.replace("!", "")}, ${owner.name}!` : t.greeting}
        </p>
        <h1 className="relative mt-1 text-3xl font-semibold leading-tight text-primary">
          {t.heroTitle}
        </h1>
        <p className="relative mt-2 text-sm text-muted-foreground">{t.heroBody}</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t.yourPets}</h2>
          <Link to="/pets" className="text-sm font-bold text-primary">
            {t.manage}
          </Link>
        </div>
        {pets.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pets.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPet(p.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 ${p.id === selectedPetId ? "border-primary bg-secondary" : "bg-card"}`}
              >
                <Avatar src={p.photo} size={36} />
                <span className="text-sm font-bold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{speciesLabel(t, p.species)}</span>
              </button>
            ))}
          </div>
        ) : (
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold">{t.noPetsTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.noPetsBody}</p>
            <Link
              to="/pets"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> {t.addPet}
            </Link>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-center text-xl font-semibold">{t.tools}</h2>
        <Link
          to="/expenses"
          className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-soft"
        >
          <Wallet className="h-5 w-5 shrink-0 text-accent-foreground" />
          <span className="font-semibold">{t.exTitle}</span>
        </Link>
        <Link to="/seasonal" className="block rounded-3xl border bg-card p-4 shadow-soft">
          <span className="flex items-center gap-2 font-semibold">
            <Leaf className="h-5 w-5 text-primary" />
            {t.seasonTitle} · {t.seasonNames[season]}
          </span>
          {seasonalTip && (
            <span className="mt-2 block text-sm text-muted-foreground">
              {seasonalTip.copy[settings.lang][1]}
            </span>
          )}
        </Link>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/food" className="rounded-3xl border bg-card p-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold">{t.tabFood}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.foodHeroBody}</p>
          </Link>
          <Link to="/symptoms" className="rounded-3xl border bg-card p-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold">{t.tabSymptoms}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.symptomsTool}</p>
          </Link>
          <Link to="/reminders" className="rounded-3xl border bg-card p-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <Bell className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold">{t.tabReminders}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.remindersTool}</p>
          </Link>
        </div>
        <Carousel
          prevLabel={carouselLabels[0]}
          nextLabel={carouselLabels[1]}
          items={slides.map((x) => (
            <Link
              key={x.to}
              to={x.to}
              className="flex h-full min-h-[11rem] flex-col gap-3 rounded-3xl border bg-card p-5 shadow-soft"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
                <x.icon className="h-6 w-6" />
              </span>
              <span className="block text-lg font-semibold leading-tight">{x.title}</span>
              <span className="block text-sm text-muted-foreground">{x.text}</span>
            </Link>
          ))}
        />
      </section>

      {next && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t.nextReminder}</h2>
          <Card>
            <p className="font-bold">{next.title}</p>
            <p className="text-sm text-muted-foreground">
              {pets.find((p) => p.id === next.petId)?.name} ·{" "}
              {new Date(next.dueAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </Card>
        </section>
      )}

      <div className="flex gap-2 text-xs font-semibold text-warn">
        <Info className="h-4 w-4 shrink-0" /> {t.disclaimer}
      </div>
    </>
  );
}
