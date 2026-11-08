import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Download, Moon, Sun, Upload } from "lucide-react";
import { Card, GhostButton, PageHeading, PrimaryButton, useConfirm } from "@/components/kit";
import { accountCopy } from "@/lib/account-i18n";
import { isNative } from "@/lib/native/platform";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <GhostButton
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-2xl border p-4 font-bold",
        active ? "border-primary bg-secondary text-primary" : "bg-background",
      )}
    >
      {children}
    </GhostButton>
  );
}

function SettingsPage() {
  const { t, settings, setTheme, setLang, notif, enableNotifications, exportBackup, restoreBackup } =
    useApp();
  const c = accountCopy[settings.lang];
  const { ask, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRaw = useRef("");

  const saveCopy = async () => {
    const json = exportBackup();
    const name = `kepatina-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if (isNative()) {
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const file = await Filesystem.writeFile({
          path: name,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: name, url: file.uri, dialogTitle: name });
      } else {
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if (/cancel/i.test(String((e as Error).message))) return;
      toast.error(c.exportFail);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      pendingRaw.current = await file.text();
    } catch {
      toast.error(c.importBad);
      return;
    }
    ask(c.importQTitle, c.importQBody, c.importQConfirm, () => {
      if (restoreBackup(pendingRaw.current)) toast.success(c.imported);
      else toast.error(c.importBad);
      pendingRaw.current = "";
    });
  };

  return (
    <>
      <PageHeading back="/" title={t.settings} />
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          {notif === "granted" ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {t.notifTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {notif === "granted"
            ? t.notifOn
            : notif === "denied"
              ? t.notifDenied
              : notif === "unsupported"
                ? t.notifUnsupported
                : t.notifOff}
        </p>
        {notif !== "granted" && notif !== "unsupported" && (
          <PrimaryButton onClick={() => void enableNotifications()}>{t.notifEnable}</PrimaryButton>
        )}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">{t.appearance}</h2>
        <div className="flex gap-3">
          <Option active={settings.theme === "light"} onClick={() => setTheme("light")}>
            <Sun className="h-5 w-5" /> {t.light}
          </Option>
          <Option active={settings.theme === "dark"} onClick={() => setTheme("dark")}>
            <Moon className="h-5 w-5" /> {t.dark}
          </Option>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">{t.language}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Option active={settings.lang === "lv"} onClick={() => setLang("lv")}>
            🇱🇻 Latviešu
          </Option>
          <Option active={settings.lang === "en"} onClick={() => setLang("en")}>
            🇬🇧 English
          </Option>
          <Option active={settings.lang === "ru"} onClick={() => setLang("ru")}>
            🇷🇺 Русский
          </Option>
          <Option active={settings.lang === "fr"} onClick={() => setLang("fr")}>
            🇫🇷 Français
          </Option>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">{c.backupTitle}</h2>
        <p className="text-sm text-muted-foreground">{c.backupBody}</p>
        <div className="grid gap-3">
          <PrimaryButton onClick={() => void saveCopy()}>
            <Download className="h-4 w-4" /> {c.exportBtn}
          </PrimaryButton>
          <GhostButton onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {c.importBtn}
          </GhostButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </Card>
      {dialog}
    </>
  );
}
