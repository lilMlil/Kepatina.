import { isNative } from "@/lib/native/platform";

export type ChatMediaKind = "image" | "video" | "audio";

const FOLDER = "Kepatina";
/** Where saved files end up on Android (inside shared storage, so the gallery / Files app can see them). */
const SAVE_DIR: Record<ChatMediaKind, string> = {
  image: `Pictures/${FOLDER}`,
  video: `Movies/${FOLDER}`,
  audio: `Documents/${FOLDER}`,
};
const TEXT_DIR = `Documents/${FOLDER}`;
const SHARE_CACHE_DIR = "kepatina-share";

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function isCancel(error: unknown): boolean {
  return (
    (error as Error | undefined)?.name === "AbortError" || /cancel/i.test(errorText(error))
  );
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

function downloadBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Native download into shared storage; asks for storage permission once if Android refuses. */
async function nativeSaveFile(url: string, path: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const run = () =>
    Filesystem.downloadFile({ url, path, directory: Directory.ExternalStorage, recursive: true });
  try {
    await run();
  } catch (error) {
    if (!/permission/i.test(errorText(error))) throw error;
    const permission = await Filesystem.requestPermissions();
    if (permission.publicStorage !== "granted") throw error;
    await run();
  }
}

/** Opens the system share sheet with the file attached (Android) or the Web Share API (browser). */
export async function shareMedia(
  url: string,
  kind: ChatMediaKind,
  name: string,
  title: string,
): Promise<boolean> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    try {
      await Filesystem.rmdir({ path: SHARE_CACHE_DIR, directory: Directory.Cache, recursive: true });
    } catch {
      /* nothing to clean */
    }
    const path = `${SHARE_CACHE_DIR}/${name}`;
    await Filesystem.downloadFile({ url, path, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri], dialogTitle: title });
    } catch (error) {
      if (!isCancel(error)) throw error;
    }
    return true;
  }
  const blob = await fetchBlob(url);
  const type = blob.type || (kind === "image" ? "image/jpeg" : kind === "video" ? "video/mp4" : "audio/mp4");
  const file = new File([blob], name, { type });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch (error) {
      if (!isCancel(error)) throw error;
    }
    return true;
  }
  downloadBlob(blob, name);
  return true;
}

/**
 * Saves a chat photo / video / voice message to the phone.
 * Returns the folder it was saved to, or "" when the file was handed to the share sheet instead.
 */
export async function saveMedia(
  url: string,
  kind: ChatMediaKind,
  name: string,
  title: string,
): Promise<string> {
  if (isNative()) {
    try {
      await nativeSaveFile(url, `${SAVE_DIR[kind]}/${name}`);
      return SAVE_DIR[kind];
    } catch (error) {
      console.error("[chat-media] save failed, falling back to share sheet", error);
      await shareMedia(url, kind, name, title);
      return "";
    }
  }
  downloadBlob(await fetchBlob(url), name);
  return "";
}

/** Saves a text message as a .txt file. Returns the folder, or "" on the web. */
export async function saveText(text: string, name: string): Promise<string> {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const write = () =>
      Filesystem.writeFile({
        path: `${TEXT_DIR}/${name}`,
        data: text,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    try {
      await write();
    } catch (error) {
      if (!/permission/i.test(errorText(error))) throw error;
      const permission = await Filesystem.requestPermissions();
      if (permission.publicStorage !== "granted") throw error;
      await write();
    }
    return TEXT_DIR;
  }
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), name);
  return "";
}
