import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, PawPrint, Phone, Stethoscope } from "lucide-react";
import { decodeTag } from "@/lib/lost-tag";
import { telHref } from "@/lib/passport";
import { tagMedsDicts } from "@/lib/tagmeds-i18n";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/found")({
  validateSearch: (s: Record<string, unknown>) => ({ d: typeof s["d"] === "string" ? s["d"] : "" }),
  component: FoundPage,
});

function FoundPage() {
  const { d } = Route.useSearch();
  const { settings } = useApp();
  const tag = decodeTag(d);
  const t = tagMedsDicts[tag?.l ?? settings.lang];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-background px-5 py-8">
      <div className="flex items-center gap-2">
        <img src="/icon-192.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl" />
        <span className="font-display text-xl font-semibold text-primary">Ķepatiņa</span>
      </div>
      {!tag ? (
        <p className="rounded-3xl border bg-card p-5 text-center font-semibold">{t.foundInvalid}</p>
      ) : (
        <>
          <div className="rounded-3xl border bg-card p-6 text-center shadow-soft">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-peach text-accent-foreground">
              <PawPrint className="h-8 w-8" />
            </span>
            <p className="mt-3 text-sm text-muted-foreground">{t.foundHello}</p>
            <h1 className="text-4xl font-semibold text-primary">{tag.n}</h1>
            {(tag.s || tag.c) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {[tag.s, tag.c].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-4 font-semibold">{t.foundLost}</p>
          </div>
          {tag.m && (
            <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-bold text-warn">
              {tag.m}
            </p>
          )}
          {tag.p && (
            <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
              <p className="text-xs font-bold text-muted-foreground">{t.foundOwner}</p>
              <p className="text-lg font-semibold">{tag.o || "—"}</p>
              <p className="text-2xl font-bold tracking-wide">{tag.p}</p>
              <a
                href={telHref(tag.p)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-lg font-bold text-primary-foreground"
              >
                <Phone className="h-5 w-5" /> {t.foundCall}
              </a>
              <a
                href={`sms:${tag.p.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(`${t.foundSmsBody} ${tag.n}.`)}`}
                className="flex items-center justify-center gap-2 rounded-2xl border bg-secondary px-4 py-3 font-bold text-primary"
              >
                <MessageSquare className="h-5 w-5" /> {t.foundSms}
              </a>
            </div>
          )}
          {tag.v && (
            <a
              href={telHref(tag.v)}
              className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-soft"
            >
              <Stethoscope className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-xs font-bold text-muted-foreground">{t.foundVet}</span>
                <span className="font-semibold">{tag.v}</span>
              </span>
            </a>
          )}
        </>
      )}
    </div>
  );
}
