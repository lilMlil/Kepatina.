import { useState } from "react";
import { Share, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { isNative } from "@/lib/native/platform";
import { isIOS, isStandalone } from "@/lib/pwa";
import type { Lang } from "@/lib/i18n";

const KEY = "kepatina/install-hint-dismissed";

const copy: Record<Lang, { title: string; body: string; close: string }> = {
  lv: {
    title: "Instalē kā lietotni",
    body: "Pieskaries pogai «Kopīgot» un izvēlies «Pievienot sākuma ekrānam». Tad Ķepatiņa atvērsies pilnā ekrānā.",
    close: "Aizvērt",
  },
  en: {
    title: "Install as an app",
    body: "Tap Share, then “Add to Home Screen”. Ķepatiņa will then open full screen like a normal app.",
    close: "Close",
  },
  ru: {
    title: "Установи как приложение",
    body: "Нажми «Поделиться», затем «На экран “Домой”». Ķepatiņa будет открываться на весь экран, как обычное приложение.",
    close: "Закрыть",
  },
  fr: {
    title: "Installer comme application",
    body: "Touchez Partager, puis « Sur l’écran d’accueil ». Ķepatiņa s’ouvrira alors en plein écran.",
    close: "Fermer",
  },
};

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** On an iPhone, in a normal browser tab: explains how to add the app to the home screen. */
export function InstallHint() {
  const { settings } = useApp();
  const [hidden, setHidden] = useState(wasDismissed);

  if (hidden || isNative() || isStandalone() || !isIOS()) return null;
  const c = copy[settings.lang];

  return (
    <div
      role="note"
      className="mx-5 mb-2 flex items-start gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground"
    >
      <Share className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{c.title}</p>
        <p className="mt-0.5 leading-snug">{c.body}</p>
      </div>
      <button
        type="button"
        aria-label={c.close}
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
          setHidden(true);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
