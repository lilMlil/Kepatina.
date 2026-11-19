import { useEffect, useState } from "react";
import { getLocalFile } from "@/lib/media";
import type { StoredFile } from "@/lib/media";
import { formatFileSize } from "@/lib/memories";
import { useApp } from "@/lib/store";

export function LocalFilePreview({
  file,
  display,
}: {
  file: StoredFile;
  display: "memory" | "document";
}) {
  const { t } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(null);
    setUnavailable(false);

    void getLocalFile(file.id)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setUnavailable(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id]);

  if (unavailable)
    return (
      <p className="rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        {display === "memory" ? t.memoryFileMissing : t.documentsMissing}
      </p>
    );
  if (!url) return <p className="text-xs text-muted-foreground">{file.name}</p>;

  if (display === "memory" && file.type.startsWith("image/"))
    return (
      <img
        src={url}
        alt={file.name}
        loading="lazy"
        className="max-h-72 w-full rounded-2xl bg-muted object-contain"
      />
    );

  if (display === "memory" && file.type.startsWith("video/"))
    return (
      <video
        src={url}
        controls
        playsInline
        preload="none"
        aria-label={file.name}
        className="max-h-72 w-full rounded-2xl bg-black"
      />
    );

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={file.type === "application/pdf" ? undefined : file.name}
      className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3 py-3 text-sm font-bold text-primary"
    >
      <span className="min-w-0 break-all">
        {display === "document" ? `${t.documentsOpen}: ` : ""}
        {file.name}
      </span>
      <span className="shrink-0 text-xs">{formatFileSize(file.size)}</span>
    </a>
  );
}
