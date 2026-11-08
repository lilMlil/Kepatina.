import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Avatar, Card, Chip, GhostButton, PageHeading, SpeciesSelector } from "@/components/kit";
import { useApp } from "@/lib/store";
import type { Species } from "@/lib/reminders";
import foodData from "@/data/food-safety.json";
import foodI18n from "@/data/food-i18n.json";

const tr = foodI18n as Record<string, Record<string, string>>;
const tx = (v: string, lang: string) => (lang === "lv" || !v ? v : (tr[v]?.[lang] ?? v));

export const Route = createFileRoute("/food")({
  component: FoodPage,
});

interface Entry {
  name: string;
  animal: Species;
  status: "Droši" | "Uzmanīgi" | "Bīstami";
  notes: string;
  category: string;
  aliases: string;
  searchText: string;
}
const entries = foodData as Entry[];
const norm = (v: string) =>
  v
    .toLocaleLowerCase("lv-LV")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function FoodPage() {
  const { t, selectedPet, pets, selectPet, settings } = useApp();
  const lang = settings.lang;
  const [override, setOverride] = useState<Species | null>(null);
  const species = override ?? selectedPet?.species ?? "Suns";
  const [q, setQ] = useState("");
  const nq = norm(q);
  const results = useMemo(() => {
    if (!nq) return [];
    const rank = { Bīstami: 0, Uzmanīgi: 1, Droši: 2 };
    return entries
      .filter(
        (e) =>
          e.animal === species &&
          norm(
            `${e.name} ${e.aliases} ${e.searchText} ${e.category} ${tx(e.name, lang)} ${tx(e.aliases, lang)} ${tx(e.category, lang)}`,
          ).includes(nq),
      )
      .sort(
        (a, b) =>
          rank[a.status] - rank[b.status] || tx(a.name, lang).localeCompare(tx(b.name, lang), lang),
      )
      .slice(0, 60);
  }, [nq, species, lang]);

  const statusStyle = {
    Droši: { cls: "bg-safe-soft text-safe", label: t.statusSafe },
    Uzmanīgi: { cls: "bg-warn-soft text-warn", label: t.statusCaution },
    Bīstami: { cls: "bg-danger-soft text-danger", label: t.statusDanger },
  };

  return (
    <>
      <PageHeading eyebrow={t.foodEyebrow} title={t.foodHeroTitle} subtitle={t.foodSubtitle} />
      <div className="flex h-14 items-center gap-3 rounded-2xl border bg-card px-4 shadow-soft">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.foodPlaceholder}
          className="h-full flex-1 bg-transparent text-base outline-none"
          aria-label={t.foodPlaceholder}
        />
        {q && (
          <GhostButton
            onClick={() => setQ("")}
            aria-label={t.clearSearch}
            className="min-h-0 border-0 bg-transparent p-0"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </GhostButton>
        )}
      </div>
      {pets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.foodYourPets}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map((p) => {
              const active = !override && p.id === selectedPet?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    selectPet(p.id);
                    setOverride(null);
                  }}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 ${active ? "border-primary bg-secondary" : "bg-card"}`}
                >
                  <Avatar src={p.photo} size={30} />
                  <span className="text-sm font-bold">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-bold">{t.animal}</p>
        <SpeciesSelector value={species} onChange={setOverride} />
      </div>
      {!q && (
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.popular}</p>
          <div className="flex flex-wrap gap-2">
            {["šokolāde", "vīnogas", "sīpoli", "ksilitols"].map((x) => {
              const l = (
                {
                  lv: x,
                  en: {
                    šokolāde: "chocolate",
                    vīnogas: "grapes",
                    sīpoli: "onion",
                    ksilitols: "xylitol",
                  },
                  ru: {
                    šokolāde: "шоколад",
                    vīnogas: "виноград",
                    sīpoli: "лук",
                    ksilitols: "ксилит",
                  },
                  fr: {
                    šokolāde: "chocolat",
                    vīnogas: "raisin",
                    sīpoli: "oignon",
                    ksilitols: "xylitol",
                  },
                } as Record<string, string | Record<string, string>>
              )[lang];
              const label = typeof l === "string" ? l : (l?.[x] ?? x);
              return (
                <Chip key={x} onClick={() => setQ(label)}>
                  {label}
                </Chip>
              );
            })}
          </div>
        </div>
      )}
      {q ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground">
            {results.length ? `${results.length} ${t.results}` : t.notFound}
          </p>
          {results.length ? (
            results.map((e, i) => (
              <Card key={`${e.name}-${i}`} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{tx(e.name, lang)}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusStyle[e.status].cls}`}
                  >
                    {statusStyle[e.status].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{tx(e.category, lang)}</p>
                {e.notes && <p className="text-sm">{tx(e.notes, lang)}</p>}
                {e.status === "Bīstami" && (
                  <p className="rounded-xl bg-danger-soft p-2.5 text-xs font-bold text-danger">
                    {t.ateIt}
                  </p>
                )}
              </Card>
            ))
          ) : (
            <Card className="space-y-2">
              <h3 className="font-semibold">{t.notFound}</h3>
              <p className="text-sm text-muted-foreground">{t.notFoundBody}</p>
            </Card>
          )}
        </div>
      ) : null}
    </>
  );
}
