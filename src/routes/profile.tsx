import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Cloud, Copy, Eye, EyeOff, LogOut, PawPrint, Settings, Trash2, Users } from "lucide-react";
import {
  AvatarPicker,
  Card,
  GhostButton,
  PageHeading,
  PrimaryButton,
  TextField,
  useConfirm,
} from "@/components/kit";
import { useApp } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "@/lib/native/platform";
import { accountCopy } from "@/lib/account-i18n";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t, owner, setOwner, user, signOut, pets, settings, family, deleteAccount, recovery } =
    useApp();
  const c = accountCopy[settings.lang];
  const { ask, dialog } = useConfirm();
  const ownsSharedFamily = !!family && family.ownerId === user?.id && family.members.length > 1;
  return (
    <>
      <PageHeading title={t.profileTitle} />
      <Card className="space-y-4">
        <AvatarPicker value={owner.photo} onChange={(photo) => setOwner({ photo })} size={104} />
        <TextField
          label={t.yourName}
          placeholder={t.yourNamePh}
          value={owner.name}
          maxLength={40}
          onChange={(e) => setOwner({ name: e.target.value })}
        />
        <TextField
          label={t.ppOwnerPhone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={25}
          value={owner.phone ?? ""}
          onChange={(e) => setOwner({ phone: e.target.value })}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/pets"
          className="flex items-center gap-2 rounded-3xl border bg-card p-4 font-bold shadow-soft"
        >
          <PawPrint className="h-5 w-5 text-primary" /> {t.yourPets} ({pets.length})
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-3xl border bg-card p-4 font-bold shadow-soft"
        >
          <Settings className="h-5 w-5 text-primary" /> {t.settings}
        </Link>
      </div>

      {recovery && user && <NewPasswordCard />}

      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{t.accountTitle}</h2>
          <p className="text-xs text-muted-foreground">{t.accountNote}</p>
        </div>
        {user ? (
          <>
            <p className="text-sm">
              {t.signedInAs} <b>{user.email}</b>
            </p>
            <p className="flex items-center gap-2 text-sm font-semibold text-safe">
              <Cloud className="h-4 w-4" /> {t.synced}
            </p>
            <GhostButton onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" /> {t.signOut}
            </GhostButton>
            <GhostButton
              className="text-destructive"
              onClick={() =>
                ask(
                  c.deleteTitle,
                  c.deleteBody + (ownsSharedFamily ? c.deleteFamilyNote : ""),
                  c.deleteConfirm,
                  () =>
                    void deleteAccount().then((err) => {
                      if (err) toast.error(`${c.deleteFail}: ${err}`);
                      else toast.success(c.deleted);
                    }),
                )
              }
            >
              <Trash2 className="h-4 w-4" /> {c.deleteBtn}
            </GhostButton>
          </>
        ) : (
          <AuthForm />
        )}
      </Card>

      <FamilyCard />
      {dialog}
    </>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const { settings } = useApp();
  const c = accountCopy[settings.lang];
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-2xl border bg-background pl-4 pr-12 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? c.hidePw : c.showPw}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-muted-foreground"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

/** Shown after the password-reset link from the e-mail was opened. */
function NewPasswordCard() {
  const { settings, clearRecovery } = useApp();
  const c = accountCopy[settings.lang];
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(c.pwSaved);
    setPw("");
    clearRecovery();
  };
  return (
    <Card className="space-y-3 border-primary">
      <form onSubmit={save} className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{c.newPwTitle}</h2>
          <p className="text-xs text-muted-foreground">{c.newPwBody}</p>
        </div>
        <PasswordField label={c.newPw} value={pw} onChange={setPw} autoComplete="new-password" />
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {c.savePw}
        </PrimaryButton>
      </form>
    </Card>
  );
}

function AuthForm() {
  const { t, settings } = useApp();
  const c = accountCopy[settings.lang];
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "up"
        ? await supabase.auth.signUp({
            email,
            password: pw,
            options: { emailRedirectTo: authRedirectUrl() },
          })
        : await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) toast.success(t.checkEmail);
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast.error(c.needEmail);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(c.resetSent);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.accountBody}</p>
      <TextField
        label={t.email}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <PasswordField
        label={t.password}
        value={pw}
        onChange={setPw}
        autoComplete={mode === "up" ? "new-password" : "current-password"}
      />
      <PrimaryButton type="submit" disabled={busy} className="w-full">
        {mode === "up" ? t.signUp : t.signIn}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => setMode(mode === "up" ? "in" : "up")}
        className="w-full text-center text-sm font-bold text-primary"
      >
        {mode === "up" ? t.haveAccount : t.noAccount}
      </button>
      {mode === "in" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void forgot()}
          className="w-full text-center text-sm font-bold text-primary"
        >
          {c.forgot}
        </button>
      )}
      <p className="text-xs text-muted-foreground">{t.localOnly}</p>
    </form>
  );
}

function FamilyCard() {
  const { t, user, family, createFamily, joinFamily, leaveFamily, removeMember, online } = useApp();
  const { ask, dialog } = useConfirm();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = !!family && family.ownerId === user?.id;

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight">
          <Users className="h-5 w-5 text-primary" /> {t.famTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{t.famBody}</p>
      </div>
      {!user ? (
        <p className="text-sm text-muted-foreground">{t.famNeedAccount}</p>
      ) : family ? (
        <>
          <p className="text-sm font-semibold text-safe">{t.famShared}</p>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">{t.famCode}</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-2xl bg-secondary px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.3em] text-primary">
                {family.code}
              </span>
              <GhostButton
                aria-label={t.famCopy}
                onClick={() => {
                  void navigator.clipboard?.writeText(family.code);
                  toast.success(t.famCopied);
                }}
              >
                <Copy className="h-4 w-4" />
              </GhostButton>
            </div>
            <p className="text-xs text-muted-foreground">{t.famCodeHint}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">{t.famMembers}</p>
            <ul className="divide-y rounded-2xl border">
              {family.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {m.email ?? "—"}
                    {m.userId === user.id && (
                      <span className="text-muted-foreground"> ({t.famYou})</span>
                    )}
                    {m.userId === family.ownerId && (
                      <span className="text-muted-foreground"> · {t.famOwner}</span>
                    )}
                  </span>
                  {isOwner && m.userId !== user.id && (
                    <button
                      className="text-xs font-bold text-destructive"
                      onClick={() => void removeMember(m.userId)}
                    >
                      {t.famRemove}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <GhostButton
            onClick={() => ask(t.famLeave, t.famLeaveQ, t.famLeave, () => void leaveFamily())}
          >
            {t.famLeave}
          </GhostButton>
        </>
      ) : (
        <>
          <PrimaryButton
            className="w-full"
            disabled={busy || !online}
            onClick={async () => {
              setBusy(true);
              const ok = await createFamily();
              setBusy(false);
              if (ok) toast.success(t.famCreated);
              else toast.error(t.famInvalid);
            }}
          >
            {t.famCreate}
          </PrimaryButton>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!code.trim()) return;
              setBusy(true);
              const err = await joinFamily(code);
              setBusy(false);
              if (err) toast.error(t.famInvalid);
              else {
                toast.success(t.famJoined);
                setCode("");
              }
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder={t.famCodePh}
              aria-label={t.famCodePh}
              className="h-12 min-w-0 flex-1 rounded-2xl border bg-background px-4 font-mono uppercase tracking-widest outline-none focus:border-primary"
            />
            <GhostButton type="submit" disabled={busy || !online}>
              {t.famJoin}
            </GhostButton>
          </form>
        </>
      )}
      {dialog}
    </Card>
  );
}
