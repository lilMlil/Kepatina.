import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Heart,
  ThermometerSun,
  UtensilsCrossed,
  Volume2,
} from "lucide-react";
import { GhostButton, PageHeading } from "@/components/kit";
import { careGuides } from "@/lib/i18n";
import type { CareTopic } from "@/lib/care-guides";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/care")({
  component: CarePage,
});

const icons = {
  feeding: UtensilsCrossed,
  parasites: Bug,
  weather: ThermometerSun,
  noise: Volume2,
  teeth: Heart,
  routine: Activity,
};

function CarePage() {
  const { t, settings } = useApp();
  const [open, setOpen] = useState<CareTopic | null>(null);
  return (
    <>
      <PageHeading title={t.careGuides} back="/" />
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t.careScope}</p>
      </div>
      <section className="divide-y border-y">
        {careGuides.map((guide) => {
          const copy = guide.copy[settings.lang];
          const Icon = icons[guide.id];
          const expanded = open === guide.id;
          return (
            <article key={guide.id} className="py-2">
              <GhostButton
                aria-expanded={expanded}
                aria-controls={`guide-${guide.id}`}
                onClick={() => setOpen(expanded ? null : guide.id)}
                className="h-auto w-full justify-start rounded-xl border-0 bg-transparent px-0 py-3 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-peach text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold text-primary">
                    {copy.title}
                  </span>
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {copy.summary}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-primary transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                />
              </GhostButton>
              {expanded && (
                <div id={`guide-${guide.id}`} className="space-y-4 pb-4 pt-1">
                  <ul className="space-y-3 text-sm leading-relaxed">
                    {copy.tips.map((tip, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-extrabold text-primary">
                          {i + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold leading-relaxed text-warn">
                    {copy.warning}
                  </p>
                  <Link
                    to="/symptoms"
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary"
                  >
                    {t.tabSymptoms}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-bold">{t.careSources}</p>
                    {guide.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 py-1 underline underline-offset-2"
                      >
                        {source.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <p className="text-xs font-semibold text-warn">{t.disclaimer}</p>
    </>
  );
}
