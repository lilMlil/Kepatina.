import { useId, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, ChevronLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToAvatar } from "@/lib/image";
import { SPECIES, speciesLabel, useApp } from "@/lib/store";
import type { Species } from "@/lib/reminders";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-4 shadow-soft", className)}>{children}</div>
  );
}

const backLabel = { lv: "Atpakaļ", en: "Back", ru: "Назад", fr: "Retour" } as const;

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  back,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  back?: string;
}) {
  const { settings } = useApp();
  return (
    <div className="space-y-1">
      {back && (
        <Link
          to={back}
          aria-label={backLabel[settings.lang]}
          className="mb-2 inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-bold text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      {eyebrow && (
        <p className="text-xs font-extrabold uppercase tracking-wider text-accent-foreground/80 dark:text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-semibold leading-tight text-primary">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function SpeciesSelector({
  value,
  onChange,
}: {
  value: Species;
  onChange: (s: Species) => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t.animal}>
      {SPECIES.map((s) => (
        <Chip key={s} active={s === value} onClick={() => onChange(s)}>
          {speciesLabel(t, s)}
        </Chip>
      ))}
    </div>
  );
}

export function PrimaryButton({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    />
  );
}

export function GhostButton({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border bg-card px-4 font-bold text-foreground hover:bg-secondary",
        className,
      )}
    />
  );
}

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = props;
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold">{label}</span>
      <input
        {...rest}
        className={cn(
          "h-12 w-full rounded-2xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring",
          className,
        )}
      />
    </label>
  );
}

/** A paw that stands upright: four toes on top, the pad below (symmetric, no tilt). */
export function PawIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={style}>
      <ellipse cx="5.5" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="9.5" cy="5.2" rx="2.3" ry="2.9" />
      <ellipse cx="14.5" cy="5.2" rx="2.3" ry="2.9" />
      <ellipse cx="18.5" cy="10" rx="2.2" ry="2.8" />
      <path d="M12 12.2c-3.3 0-6.6 4.3-6.6 7.2 0 1.9 1.4 2.6 3 2.6 1.3 0 2.1-.7 3.6-.7s2.3.7 3.6.7c1.6 0 3-.7 3-2.6 0-2.9-3.3-7.2-6.6-7.2z" />
    </svg>
  );
}

/** Yellow hint for screens that need a pet first, with the button to add one. */
export function NeedPetHint() {
  const { t } = useApp();
  return (
    <Card className="space-y-3">
      {/* The fallback keeps the hint yellow even where the theme variable is not set. */}
      <p
        className="text-sm font-semibold text-warn"
        style={{ color: "var(--warn, #f0b35a)" }}
      >
        {t.hNeedPet}
      </p>
      <Link
        to="/pets"
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
      >
        {t.addPet}
      </Link>
    </Card>
  );
}

export function Avatar({
  src,
  size = 44,
  className,
  fallback = "pet",
}: {
  src?: string | null | undefined;
  size?: number;
  className?: string;
  /** Icon shown when there is no photo: a paw for pets, a person for the owner. */
  fallback?: "pet" | "person";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-primary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        fallback === "person" ? (
          <User aria-hidden="true" style={{ width: size * 0.45, height: size * 0.45 }} />
        ) : (
          <PawIcon style={{ width: size * 0.45, height: size * 0.45 }} />
        )
      )}
    </div>
  );
}

export function AvatarPicker({
  value,
  onChange,
  size = 96,
  fallback = "pet",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  size?: number;
  fallback?: "pet" | "person";
}) {
  const { t } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative"
        aria-label={value ? t.changePhoto : t.addPhoto}
      >
        <Avatar src={value} size={size} fallback={fallback} className="ring-4 ring-peach-soft" />
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-soft">
          <Camera className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-sm font-bold text-primary"
        >
          {value ? t.changePhoto : t.addPhoto}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-semibold text-muted-foreground"
          >
            {t.removePhoto}
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onChange(await fileToAvatar(f));
        }}
      />
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const titleId = useId();
  const bodyId = useId();
  if (!open) return null;
  // Both buttons share exactly the same size and shape; the red one differs only by colour.
  const btn = "min-h-11 min-w-0 px-3 py-2 text-center text-sm leading-tight";
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-5"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-semibold text-primary">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm text-muted-foreground">
          {body}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <GhostButton className={btn} onClick={onClose}>
            {t.cancel}
          </GhostButton>
          <GhostButton
            className={cn(
              btn,
              "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<null | {
    title: string;
    body: string;
    label: string;
    run: () => void;
  }>(null);
  const dialog = (
    <ConfirmDialog
      open={!!state}
      title={state?.title ?? ""}
      body={state?.body ?? ""}
      confirmLabel={state?.label ?? ""}
      onConfirm={() => state?.run()}
      onClose={() => setState(null)}
    />
  );
  return {
    ask: (title: string, body: string, label: string, run: () => void) =>
      setState({ title, body, label, run }),
    dialog,
  };
}
