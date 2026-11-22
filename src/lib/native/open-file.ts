import { Capacitor, registerPlugin } from "@capacitor/core";
import { guessMime } from "@/lib/documents";
import { getLocalFile, type StoredFile } from "@/lib/media";
import { isNative } from "@/lib/native/platform";

/**
 * Small native plugin written by scripts/patch-android.mjs (FileOpenerPlugin.java).
 * It starts an "open with" intent for a file in the app cache.
 */
interface FileOpenerPlugin {
  open(options: { path: string; mimeType: string }): Promise<void>;
}
const FileOpener = registerPlugin<FileOpenerPlugin>("FileOpener");

export type OpenResult = "opened" | "shared" | "downloaded";

/** No installed app can open this kind of file. */
export class NoAppError extends Error {
  constructor() {
    super("no_app");
    this.name = "NoAppError";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, "_") || "file";

const isCancel = (error: unknown) =>
  (error as Error | undefined)?.name === "AbortError" ||
  /cancel/i.test(String((error as Error | undefined)?.message ?? ""));

/** Copies the stored file into the cache folder so another app can read it. Returns the file:// URI. */
async function writeToCache(file: StoredFile, blob: Blob): Promise<string> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  try {
    await Filesystem.rmdir({ path: "kepatina-open", directory: Directory.Cache, recursive: true });
  } catch {
    /* nothing to clean */
  }
  const path = `kepatina-open/${safeName(file.name)}`;
  await Filesystem.writeFile({
    path,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  return uri;
}

function browserDownload(blob: Blob, name: string, openInTab: boolean) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  if (openInTab) {
    link.target = "_blank";
    link.rel = "noopener";
  } else {
    link.download = name;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/**
 * Opens a stored document in another app: the phone's "open with" list on Android, the share sheet
 * as a fallback, a new tab (PDF, images) or a download in a desktop browser.
 */
export async function openStoredFile(file: StoredFile): Promise<OpenResult> {
  const blob = await getLocalFile(file.id);
  if (!blob) throw new Error("missing");
  const mimeType = guessMime(file);

  if (isNative()) {
    const uri = await writeToCache(file, blob);
    if (Capacitor.isPluginAvailable("FileOpener")) {
      try {
        await FileOpener.open({ path: uri, mimeType });
        return "opened";
      } catch (error) {
        if (/no_app/i.test(String((error as Error | undefined)?.message ?? ""))) {
          throw new NoAppError();
        }
        // Any other problem: fall back to the share sheet below.
      }
    }
    const { Share } = await import("@capacitor/share");
    try {
      await Share.share({ title: file.name, files: [uri], dialogTitle: file.name });
    } catch (error) {
      if (!isCancel(error)) throw error;
    }
    return "shared";
  }

  const typed = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
  const viewable = mimeType === "application/pdf" || mimeType.startsWith("image/");
  browserDownload(typed, safeName(file.name), viewable);
  return viewable ? "opened" : "downloaded";
}
