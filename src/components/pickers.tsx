import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { Lang } from "@/lib/i18n";

/**
 * Date / month / time pickers drawn by the app itself, so every label, month name and
 * weekday follows the language chosen in the app (not the phone's system language).
 */

const copy: Record<
  Lang,
  { set: string; cancel: string; today: string; pick: string; hour: string; minute: string }
> = {
  lv: {
    set: "Gatavs",
    cancel: "Atcelt",
    today: "Šodien",
    pick: "Izvēlies",
    hour: "Stundas",
    minute: "Minūtes",
  },
  en: {
    set: "Done",
    cancel: "Cancel",
    today: "Today",
    pick: "Select",
    hour: "Hours",
    minute: "Minutes",
  },
  ru: {
    set: "Готово",
    cancel: "Отмена",
    today: "Сегодня",
    pick: "Выберите",
    hour: "Часы",
    minute: "Минуты",
  },
  fr: {
    set: "Valider",
    cancel: "Annuler",
    today: "Aujourd’hui",
    pick: "Choisir",
    hour: "Heures",
    minute: "Minutes",
  },
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseISO(v: string | undefined | null): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(v ?? "");
  if (!r) return null;
  return { y: +r[1], m: +r[2] - 1, d: r[3] ? +r[3] : 1 };
}

function monthNames(lang: Lang, style: "long" | "short" = "long") {
  const f = new Intl.DateTimeFormat(lang, { month: style });
  return Array.from({ length: 12 }, (_, i) => cap(f.format(new Date(2021, i, 15))));
}

function weekdayNames(lang: Lang) {
  // Monday-first
  const f = new Intl.DateTimeFormat(lang, { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => cap(f.format(new Date(2021, 0, 4 + i))));
}

const triggerCls =
  "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border bg-background px-4 text-left text-base outline-none focus:ring-2 focus:ring-ring";

function Field({
  label,
  className,
  text,
  placeholder,
  icon,
  onOpen,
  ariaLabel,
}: {
  label?: string;
  className?: string;
  text: string;
  placeholder: string;
  icon: React.ReactNode;
  onOpen: () => void;
  ariaLabel?: string;
}) {
  return (
    <div className="block space-y-1.5">
      {label && <span className="block text-sm font-bold">{label}</span>}
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        onClick={onOpen}
        className={cn(triggerCls, className)}
      >
        <span className={cn("truncate", !text && "text-muted-foreground")}>
          {text || placeholder}
        </span>
        <span className="shrink-0 text-muted-foreground">{icon}</span>
      </button>
    </div>
  );
}

function Sheet({
  title,
  children,
  onClose,
  onOk,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onOk: () => void;
  extra?: React.ReactNode;
}) {
  const { settings } = useApp();
  const c = copy[settings.lang];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        lang={settings.lang}
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-4 text-foreground shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-primary">{title}</h2>
        {children}
        <div className="mt-4 flex items-center gap-2">
          {extra}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto min-h-11 rounded-2xl px-4 text-sm font-bold text-muted-foreground"
          >
            {c.cancel}
          </button>
          <button
            type="button"
            onClick={onOk}
            className="min-h-11 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {c.set}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const cellCls = (active: boolean, disabled?: boolean) =>
  cn(
    "flex h-10 items-center justify-center rounded-xl text-sm font-bold transition-colors",
    active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
    disabled && "pointer-events-none opacity-30",
  );

const navBtn =
  "flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary active:scale-95";

/* ------------------------------------------------------------------ month */

function MonthGrid({
  year,
  month,
  onYear,
  onMonth,
}: {
  year: number;
  month: number | null;
  onYear: (y: number) => void;
  onMonth: (m: number) => void;
}) {
  const { settings } = useApp();
  const names = useMemo(() => monthNames(settings.lang, "short"), [settings.lang]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" className={navBtn} onClick={() => onYear(year - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-bold">{year}</span>
        <button type="button" className={navBtn} onClick={() => onYear(year + 1)}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {names.map((n, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onMonth(i)}
            className={cellCls(month === i)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Value is "YYYY-MM". */
export function MonthField({
  label,
  value,
  onChange,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { settings } = useApp();
  const c = copy[settings.lang];
  const cur = parseISO(value);
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(cur?.y ?? now.getFullYear());
  const text = cur
    ? cap(
        new Intl.DateTimeFormat(settings.lang, { month: "long", year: "numeric" }).format(
          new Date(cur.y, cur.m, 1),
        ),
      )
    : "";
  return (
    <>
      <Field
        label={label}
        className={className}
        text={text}
        placeholder={c.pick}
        icon={<CalendarDays className="h-5 w-5" />}
        onOpen={() => {
          setYear(cur?.y ?? now.getFullYear());
          setOpen(true);
        }}
      />
      {open && (
        <Sheet title={label ?? c.pick} onClose={() => setOpen(false)} onOk={() => setOpen(false)}>
          <MonthGrid
            year={year}
            month={cur && cur.y === year ? cur.m : null}
            onYear={setYear}
            onMonth={(m) => {
              onChange(`${year}-${pad(m + 1)}`);
              setOpen(false);
            }}
          />
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- date */

/** Value is "YYYY-MM-DD". `min` / `max` are optional "YYYY-MM-DD" limits. */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  const { settings } = useApp();
  const lang = settings.lang;
  const c = copy[lang];
  const cur = parseISO(value);
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: cur?.y ?? now.getFullYear(), m: cur?.m ?? now.getMonth() });
  const [pickMonth, setPickMonth] = useState(false);
  const [draft, setDraft] = useState(value);

  const months = useMemo(() => monthNames(lang), [lang]);
  const weekdays = useMemo(() => weekdayNames(lang), [lang]);

  const text = cur
    ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(cur.y, cur.m, cur.d),
      )
    : "";

  const openIt = () => {
    const p = parseISO(value);
    setView({ y: p?.y ?? now.getFullYear(), m: p?.m ?? now.getMonth() });
    setDraft(value);
    setPickMonth(false);
    setOpen(true);
  };

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const outOfRange = (s: string) => (!!min && s < min) || (!!max && s > max);

  const done = () => {
    if (draft && !outOfRange(draft)) onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <Field
        label={label}
        className={className}
        text={text}
        placeholder={c.pick}
        icon={<CalendarDays className="h-5 w-5" />}
        onOpen={openIt}
      />
      {open && (
        <Sheet
          title={label ?? c.pick}
          onClose={() => setOpen(false)}
          onOk={done}
          extra={
            <button
              type="button"
              disabled={outOfRange(todayIso)}
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="min-h-11 rounded-2xl px-3 text-sm font-bold text-primary disabled:opacity-40"
            >
              {c.today}
            </button>
          }
        >
          {pickMonth ? (
            <MonthGrid
              year={view.y}
              month={view.m}
              onYear={(y) => setView((v) => ({ ...v, y }))}
              onMonth={(m) => {
                setView((v) => ({ ...v, m }));
                setPickMonth(false);
              }}
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button type="button" className={navBtn} onClick={() => shift(-1)}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPickMonth(true)}
                  className="rounded-xl px-3 py-2 text-base font-bold hover:bg-secondary"
                >
                  {months[view.m]} {view.y}
                </button>
                <button type="button" className={navBtn} onClick={() => shift(1)}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
                {weekdays.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }, (_, i) => (
                  <span key={`e${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const s = iso(view.y, view.m, d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDraft(s)}
                      className={cn(
                        cellCls(draft === s, outOfRange(s)),
                        s === todayIso && draft !== s && "ring-1 ring-primary",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- time */

/** Value is "HH:MM" (24-hour). */
export function TimeField({
  label,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const { settings } = useApp();
  const c = copy[settings.lang];
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(m ? +m[1] : 8);
  const [min, setMin] = useState(m ? +m[2] : 0);
  const text = m ? `${pad(+m[1])}:${m[2]}` : "";
  const step = (delta: number) => setMin((x) => (x + delta + 60) % 60);
  return (
    <>
      <Field
        label={label}
        className={className}
        ariaLabel={ariaLabel ?? label ?? c.pick}
        text={text}
        placeholder={c.pick}
        icon={<Clock className="h-5 w-5" />}
        onOpen={() => {
          setH(m ? +m[1] : 8);
          setMin(m ? +m[2] : 0);
          setOpen(true);
        }}
      />
      {open && (
        <Sheet
          title={label ?? c.pick}
          onClose={() => setOpen(false)}
          onOk={() => {
            onChange(`${pad(h)}:${pad(min)}`);
            setOpen(false);
          }}
        >
          <p className="mb-2 text-center text-3xl font-semibold text-primary">
            {pad(h)}:{pad(min)}
          </p>
          <p className="mb-1 text-xs font-bold text-muted-foreground">{c.hour}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 24 }, (_, i) => (
              <button key={i} type="button" onClick={() => setH(i)} className={cellCls(h === i)}>
                {pad(i)}
              </button>
            ))}
          </div>
          <p className="mb-1 mt-3 text-xs font-bold text-muted-foreground">{c.minute}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i * 5).map((v) => (
              <button key={v} type="button" onClick={() => setMin(v)} className={cellCls(min === v)}>
                {pad(v)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button type="button" className={navBtn} onClick={() => step(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="w-16 text-center text-sm font-bold">± 1 {c.minute.toLowerCase()}</span>
            <button type="button" className={navBtn} onClick={() => step(1)}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
