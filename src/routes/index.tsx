import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  BookUser,
  Bell,
  ClipboardCheck,
  HeartPulse,
  Info,
  ImagePlus,
  FileText,
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
import { expenseCategories, expenseTotal } from "@/lib/expenses";
import { localDate, nextDoses } from "@/lib/meds";
import { seasonFor, tipsFor } from "@/lib/seasonal";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const {
    t,
    pets,
    reminders,
    meds = [],
    expenses = [],
    selectedPetId,
    selectedPet,
    selectPet,
    owner,
    settings,
  } = useApp();
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
    { to: "/memories", icon: ImagePlus, title: t.memoryTitle, text: t.memoriesToolText },
    { to: "/documents", icon: FileText, title: t.documentsTitle, text: t.documentsToolText },
  ] as const;
  const petName = (petId: string) => pets.find((p) => p.id === petId)?.name;
  // Pet reminders and the next dose of each medication course share one card format,
  // sorted together by time.
  const reminderCards = [
    ...reminders
      .filter((r) => !selectedPetId || r.petId === selectedPetId)
      .map((r) => ({
        key: r.id,
        at: new Date(r.dueAt),
        to: "/reminders" as const,
        title: r.title,
        meta: `${petName(r.petId)} · ${r.category}`,
      })),
    ...nextDoses(meds, localDate(), selectedPetId).map((d) => ({
      key: `${d.courseId}|${d.key}`,
      at: d.at,
      to: "/meds" as const,
      title: d.dose ? `${d.name} · ${d.dose}` : d.name,
      meta: `${petName(d.petId)} · ${t.medsTitle}`,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const monthKey = localDate().slice(0, 7);
  const monthRows = expenses.filter(
    (e) => (!selectedPetId || e.petId === selectedPetId) && e.date.startsWith(monthKey),
  );
  const money = (cents: number) =>
    new Intl.NumberFormat(settings.lang, { style: "currency", currency: "EUR" }).format(
      cents / 100,
    );
  // The newest expense of the month is shown as a card like the reminders; the month total sits in its header.
  const latestExpense = [...monthRows].sort((a, b) => b.date.localeCompare(a.date))[0];
  const infoSlides = [
    ...reminderCards.map((r) => {
      const late = r.at.getTime() < Date.now();
      return (
        <Link
          key={r.key}
          to={r.to}
          className="flex h-full min-h-[8rem] flex-col gap-1 rounded-3xl border bg-card p-4 shadow-soft"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-primary">
            <Bell className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.tabReminders}</span>
            {late && <span className="ml-auto text-xs text-danger">{t.overdue}</span>}
          </span>
          <span className="block break-words text-lg font-semibold leading-tight">{r.title}</span>
          <span className="block text-xs text-muted-foreground">{r.meta}</span>
          <span className="mt-auto block text-sm font-bold text-primary">
            {r.at.toLocaleString(settings.lang, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </Link>
      );
    }),
    ...(latestExpense
      ? [
          <Link
            key="expenses"
            to="/expenses"
            className="flex h-full min-h-[8rem] flex-col gap-1 rounded-3xl border bg-card p-4 shadow-soft"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-primary">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.exTitle}</span>
              <span className="ml-auto text-xs font-semibold text-muted-foreground">
                {money(expenseTotal(monthRows))}
              </span>
            </span>
            <span className="block break-words text-lg font-semibold leading-tight">
              {latestExpense.note ||
                t.exCategories[expenseCategories.indexOf(latestExpense.category)]}
            </span>
            <span className="block text-xs text-muted-foreground">
              {petName(latestExpense.petId)} ·{" "}
              {t.exCategories[expenseCategories.indexOf(latestExpense.category)]}
            </span>
            <span className="mt-auto block text-sm font-bold text-primary">
              {money(latestExpense.amountCents)} · {latestExpense.date}
            </span>
          </Link>,
        ]
      : []),
  ];

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

      {infoSlides.length > 0 && (
        <section>
          <Carousel prevLabel={carouselLabels[0]} nextLabel={carouselLabels[1]} items={infoSlides} />
        </section>
      )}

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
        <div className="grid grid-cols-3 gap-2 [&>a]:min-w-0 [&>a]:break-words [&>a]:[hyphens:auto] [&>a]:[overflow-wrap:anywhere]">
          <Link to="/food" className="min-w-0 rounded-3xl border bg-card px-2 py-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-[clamp(0.8rem,3.4vw,1rem)] font-semibold leading-tight">{t.tabFood}</h3>
            <p className="mt-1 text-[clamp(0.65rem,2.8vw,0.75rem)] leading-snug text-muted-foreground">{t.foodHeroBody}</p>
          </Link>
          <Link to="/symptoms" className="min-w-0 rounded-3xl border bg-card px-2 py-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-[clamp(0.8rem,3.4vw,1rem)] font-semibold leading-tight">{t.tabSymptoms}</h3>
            <p className="mt-1 text-[clamp(0.65rem,2.8vw,0.75rem)] leading-snug text-muted-foreground">{t.symptomsTool}</p>
          </Link>
          <Link to="/reminders" className="min-w-0 rounded-3xl border bg-card px-2 py-4 text-center shadow-soft">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
              <Bell className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-[clamp(0.8rem,3.4vw,1rem)] font-semibold leading-tight">{t.tabReminders}</h3>
            <p className="mt-1 text-[clamp(0.65rem,2.8vw,0.75rem)] leading-snug text-muted-foreground">{t.remindersTool}</p>
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

      <div className="flex gap-2 text-xs font-semibold text-warn">
        <Info className="h-4 w-4 shrink-0" /> {t.disclaimer}
      </div>
    </>
  );
}
