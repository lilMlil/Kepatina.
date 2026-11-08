import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  PawPrint,
  Pencil,
  Phone,
  Printer,
  Share2,
} from "lucide-react";
import { Avatar, Card, GhostButton, PageHeading, PrimaryButton } from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import {
  dueStatus,
  formatDate,
  formatWeight,
  latestWeight,
  sortByDateDesc,
  todayISO,
} from "@/lib/health";
import {
  ageText,
  passportMissing,
  passportText,
  telHref,
  type PassportMissing,
} from "@/lib/passport";
import { printReport } from "@/lib/print";
import { shareText } from "@/lib/native/platform";
import type { Pet } from "@/lib/reminders";
import type { Dict } from "@/lib/i18n";

export const Route = createFileRoute("/passport")({
  component: PassportPage,
});

/** Everything the screen, the print layout and the share text show, computed once. */
function usePassport(pet: Pet) {
  const { t, owner, weights, vaccines, visits, settings } = useApp();
  const locale = settings.lang;
  const lastW = latestWeight(weights, pet.id);
  const weightNow = lastW
    ? formatWeight(lastW.kg, pet.species)
    : pet.weightKg
      ? `${pet.weightKg} kg`
      : "";
  const age = ageText(t, pet.birthDate);
  const vacc = sortByDateDesc(vaccines.filter((v) => v.petId === pet.id));
  const vis = sortByDateDesc(visits.filter((v) => v.petId === pet.id));
  const neutered = pet.neutered === true ? t.ppYes : pet.neutered === false ? t.ppNo : "";
  const identity: [string, string][] = [
    [t.species, speciesLabel(t, pet.species)],
    [t.medBreed, pet.breed ?? ""],
    [t.medSex, pet.sex === "m" ? t.sexM : pet.sex === "f" ? t.sexF : ""],
    [
      t.medBirth,
      pet.birthDate ? `${formatDate(pet.birthDate, locale)}${age ? ` (${age})` : ""}` : "",
    ],
    [t.ppColor, pet.color ?? ""],
    [t.ppNeutered, neutered],
    [t.hWeightField, weightNow],
    [t.medChip, pet.chipNumber ?? ""],
  ];
  const contacts: [string, string][] = [
    [t.hReportOwner, owner.name],
    [t.ppOwnerPhone, owner.phone ?? ""],
    [t.ppVetName, pet.vetName ?? ""],
    [t.medVet, pet.vetPhone ?? ""],
  ];
  const vaccLine = (v: (typeof vacc)[number]) =>
    `${formatDate(v.date, locale)} — ${v.name}${v.nextDue ? ` → ${t.hNextOn.toLowerCase()} ${formatDate(v.nextDue, locale)}` : ""}`;
  const visitLine = (v: (typeof vis)[number]) =>
    `${formatDate(v.date, locale)} — ${v.reason}${v.clinic ? ` (${v.clinic})` : ""}`;
  const text = passportText(
    `${t.ppTitle}: ${pet.name}`,
    [...identity, ...contacts, [t.medNotes, pet.notes ?? ""]],
    [
      { title: t.hTabVaccines, lines: vacc.slice(0, 12).map(vaccLine) },
      { title: t.hTabVisits, lines: vis.slice(0, 8).map(visitLine) },
    ],
    `${t.appName} · ${t.ppUpdated}: ${formatDate(todayISO(), locale)}`,
  );
  return { t, owner, locale, identity, contacts, vacc, vis, text, vaccLine, visitLine };
}

function PassportPage() {
  const { t, pets, selectedPetId, selectPet } = useApp();
  const pet = pets.find((p) => p.id === selectedPetId) ?? pets[0];

  return (
    <>
      <PageHeading back="/" eyebrow={t.ppEyebrow} title={t.ppTitle} subtitle={t.ppSubtitle} />
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
          {pets.length > 1 && (
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
          )}
          <PassportView pet={pet} />
        </>
      )}
    </>
  );
}

const missingLabels = (t: Dict): Record<PassportMissing, string> => ({
  breed: t.medBreed,
  birthDate: t.medBirth,
  sex: t.medSex,
  chipNumber: t.medChip,
  ownerName: t.hReportOwner,
  ownerPhone: t.ppOwnerPhone,
  vetPhone: t.medVet,
});

function PassportView({ pet }: { pet: Pet }) {
  const { vaccines } = useApp();
  const { t, owner, identity, vacc, contacts, vis, text, vaccLine, visitLine } = usePassport(pet);
  const today = todayISO();
  const missing = passportMissing(pet, owner);
  const labels = missingLabels(t);
  const title = `${t.ppTitle}: ${pet.name}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.ppCopied);
    } catch {
      toast.error(t.ppCopyFail);
    }
  };
  const share = async () => {
    if (await shareText(title, text)) return;
    await copy();
  };

  const wide = new Set([t.medChip, t.ppColor]);
  const phoneLabels = new Set([t.ppOwnerPhone, t.medVet]);

  return (
    <>
      <article className="overflow-hidden rounded-3xl border bg-card shadow-soft">
        <div className="flex items-center gap-2 bg-hero px-4 py-3 text-meadow-foreground">
          <PawPrint className="h-5 w-5" />
          <span className="font-display text-lg font-semibold">{t.ppTitle}</span>
          <span className="ml-auto text-xs font-bold opacity-90">{t.appName}</span>
        </div>

        <div className="flex items-center gap-4 p-4">
          <Avatar src={pet.photo} size={84} />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold leading-tight text-primary">
              {pet.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {[identity[0]?.[1], identity[1]?.[1]].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4">
          <section className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-accent-foreground/80 dark:text-accent">
              {t.ppPetData}
            </h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
              {identity.slice(2).map(([k, v]) => (
                <div key={k} className={wide.has(k) ? "col-span-2" : ""}>
                  <dt className="text-xs font-bold text-muted-foreground">{k}</dt>
                  <dd
                    className={`text-sm font-bold ${k === t.medChip ? "font-mono tracking-wide" : ""}`}
                  >
                    {v || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {pet.notes?.trim() && (
            <section className="rounded-2xl bg-warn-soft px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-warn">
                <AlertTriangle className="h-4 w-4" /> {t.medNotes}
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{pet.notes}</p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-accent-foreground/80 dark:text-accent">
              {t.ppContacts}
            </h3>
            <dl className="space-y-2">
              {contacts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-muted-foreground">{k}</dt>
                    <dd className="truncate text-sm font-bold">{v || "—"}</dd>
                  </div>
                  {v && phoneLabels.has(k) && (
                    <a
                      href={telHref(v)}
                      aria-label={`${t.medCall} ${v}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-accent-foreground/80 dark:text-accent">
              {t.ppLastVaccines}
            </h3>
            {vacc.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.hReportEmpty}</p>
            ) : (
              <ul className="divide-y rounded-2xl border">
                {vacc.slice(0, 4).map((v) => {
                  const st = dueStatus(v, vaccines, today);
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate font-semibold">{vaccLine(v)}</span>
                      {st === "overdue" && (
                        <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                          {t.hOverdueOn}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-accent-foreground/80 dark:text-accent">
              {t.ppLastVisits}
            </h3>
            {vis.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.hReportEmpty}</p>
            ) : (
              <ul className="divide-y rounded-2xl border">
                {vis.slice(0, 3).map((v) => (
                  <li key={v.id} className="px-3 py-2 text-sm font-semibold">
                    {visitLine(v)}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/health" className="inline-block text-xs font-bold text-primary">
              {t.ppFullHistory} →
            </Link>
          </section>
        </div>
      </article>

      {missing.length ? (
        <Card className="space-y-2">
          <p className="text-sm font-bold">{t.ppMissing}</p>
          <p className="text-sm text-muted-foreground">
            {missing.map((m) => labels[m]).join(", ")}
          </p>
          <Link
            to="/pets"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            <Pencil className="h-4 w-4" /> {t.ppEdit}
          </Link>
        </Card>
      ) : (
        <p className="flex items-center gap-2 text-sm font-semibold text-safe">
          <CheckCircle2 className="h-4 w-4" /> {t.ppComplete}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <PrimaryButton
          className="col-span-2"
          onClick={() =>
            printReport(`${pet.name} — ${t.ppTitle} ${todayISO()}`, () => toast.error(t.hPrintFail))
          }
        >
          <Printer className="h-4 w-4" /> {t.ppPrint}
        </PrimaryButton>
        <GhostButton onClick={() => void share()}>
          <Share2 className="h-4 w-4" /> {t.ppShare}
        </GhostButton>
        <GhostButton onClick={() => void copy()}>
          <Copy className="h-4 w-4" /> {t.ppCopy}
        </GhostButton>
      </div>

      <p className="text-xs text-muted-foreground">{t.ppDisclaimer}</p>
      <PassportPrint pet={pet} />
    </>
  );
}

/* ----------------------------------------------------------- printable page */

const PRINT_CSS = `
@media screen { #pet-passport { display: none; } }
@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; }
  body > *:not(#pet-passport) { display: none !important; }
  #pet-passport { display: block; }
}
#pet-passport { color: #111; background: #fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
#pet-passport .top { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #2f6b4f; padding-bottom: 10px; }
#pet-passport .top img { width: 74px; height: 74px; border-radius: 50%; object-fit: cover; }
#pet-passport h1 { font-size: 24px; margin: 0; color: #2f6b4f; }
#pet-passport .sub { color: #555; font-size: 11px; margin: 2px 0 0; }
#pet-passport h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #2f6b4f; color: #2f6b4f; }
#pet-passport dl { display: grid; grid-template-columns: 170px 1fr; gap: 3px 12px; margin: 0; }
#pet-passport dt { font-weight: 700; }
#pet-passport dd { margin: 0; white-space: pre-wrap; }
#pet-passport table { width: 100%; border-collapse: collapse; }
#pet-passport th, #pet-passport td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
#pet-passport th { background: #eef3ef; }
#pet-passport tr { break-inside: avoid; }
#pet-passport .empty { color: #666; font-style: italic; }
#pet-passport .alert { border: 1.5px solid #b7791f; background: #fff7e6; padding: 6px 10px; margin-top: 12px; border-radius: 6px; white-space: pre-wrap; }
#pet-passport .foot { margin-top: 22px; color: #666; font-size: 10px; border-top: 1px solid #ccc; padding-top: 6px; }
`;

function PassportPrint({ pet }: { pet: Pet }) {
  const { t, locale, identity, contacts, vacc, vis } = usePassport(pet);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const node = (
    <div id="pet-passport">
      <style>{PRINT_CSS}</style>
      <div className="top">
        {pet.photo && <img src={pet.photo} alt="" />}
        <div>
          <h1>{pet.name}</h1>
          <p className="sub">
            {t.ppTitle} · {t.appName} · {t.ppUpdated}: {formatDate(todayISO(), locale)}
          </p>
        </div>
      </div>

      <h2>{t.ppPetData}</h2>
      <dl>
        {identity
          .filter(([, v]) => v.trim())
          .map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {pet.notes?.trim() && (
        <div className="alert">
          <b>{t.medNotes}:</b> {pet.notes}
        </div>
      )}

      <h2>{t.ppContacts}</h2>
      <dl>
        {contacts
          .filter(([, v]) => v.trim())
          .map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

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
            {vis.slice(0, 15).map((v) => (
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

      <p className="foot">{t.ppDisclaimer}</p>
    </div>
  );
  // Rendered straight into <body> so the print stylesheet can hide the rest of the app.
  return createPortal(node, document.body);
}
