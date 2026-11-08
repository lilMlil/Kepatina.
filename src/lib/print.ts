/** Open the browser print dialog with a helpful default file name ("Save as PDF"). */
import { isNative } from "./native/platform";

export function printReport(fileTitle: string, onFail: () => void) {
  // The system print dialog is not available inside the native app WebView.
  if (isNative()) return onFail();
  const prev = document.title;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  document.title = fileTitle;
  window.addEventListener("afterprint", restore);
  window.setTimeout(restore, 60000);
  try {
    window.print();
  } catch {
    restore();
    onFail();
  }
}
