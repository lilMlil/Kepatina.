import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, ExternalLink, Printer } from "lucide-react";
import { Avatar, Card, GhostButton, PageHeading, PrimaryButton, TextField } from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import { encodeTag } from "@/lib/lost-tag";
import { tagMedsDicts } from "@/lib/tagmeds-i18n";
import { assemblePdf, deliverPdf, printReport, safeFileName } from "@/lib/print";
import { isNative } from "@/lib/native/platform";

const WEB_URL = (import.meta.env["VITE_PUBLIC_WEB_URL"] as string | undefined)?.replace(/\/+$/, "");

export const Route = createFileRoute("/tag")({
  component: TagPage,
});

function TagPage() {
  const { t, pets, selectedPet, selectPet, owner, settings } = useApp();
  const [note, setNote] = useState("");
  const [showVet, setShowVet] = useState(true);
  const [qr, setQr] = useState("");

  const pet = selectedPet ?? pets[0];
  // QR content. With a public web address (VITE_PUBLIC_WEB_URL) the QR opens the finder page;
  // otherwise it holds plain readable text, so ANY phone scanner shows the owner's contacts
  // with no website or server needed.
  const url = useMemo(() => {
    if (!pet) return "";
    const f = tagMedsDicts[settings.lang];
    if (WEB_URL) {
      const d = encodeTag({
        n: pet.name,
        s: speciesLabel(t, pet.species),
        c: pet.color,
        o: owner.name,
        p: owner.phone,
        v: showVet ? pet.vetPhone : undefined,
        m: note,
        l: settings.lang,
      });
      return `${WEB_URL}/#/found?d=${d}`;
    }
    return [
      `🐾 ${pet.name}${[speciesLabel(t, pet.species), pet.color].filter(Boolean).length ? ` (${[speciesLabel(t, pet.species), pet.color].filter(Boolean).join(", ")})` : ""}`,
      f.foundLost,
      [owner.name, owner.phone].filter(Boolean).join(": "),
      showVet && pet.vetPhone ? `${t.medVet}: ${pet.vetPhone}` : "",
      note.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }, [pet, owner, showVet, note, settings.lang, t]);

  useEffect(() => {
    if (!url) return;
    void QRCode.toDataURL(url, { margin: 1, width: 600, errorCorrectionLevel: "M" }).then(setQr);
  }, [url]);

  if (!pet) {
    return (
      <>
        <PageHeading title={t.tagTitle} back="/" />
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-warn">{t.hNeedPet}</p>
          <Link
            to="/pets"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            {t.addPet}
          </Link>
        </Card>
      </>
    );
  }

  // Browser: the system print dialog. The Android/iOS app has no print dialog, so there the
  // same four-tag sheet is saved as a PDF and handed to the share sheet instead.
  const printTags = async () => {
    const title = `${pet.name} — ${t.tagTitle}`;
    if (!isNative()) return printReport(title, () => toast.error(t.hPrintFail));
    try {
      const pdf = await createTagSheetPdf(qr, pet.name, t.tagScanMe, owner.phone, title);
      await deliverPdf(pdf, safeFileName(`${pet.name}-${t.tagTitle}`, "pdf"), title);
    } catch {
      toast.error(t.hPrintFail);
    }
  };

  return (
    <>
      <PageHeading title={t.tagTitle} subtitle={t.tagSubtitle} back="/" />
      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPet(p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 ${p.id === pet.id ? "border-primary bg-secondary" : "bg-card"}`}
            >
              <Avatar src={p.photo} size={32} />
              <span className="text-sm font-bold">{p.name}</span>
            </button>
          ))}
        </div>
      )}
      {!owner.phone && (
        <Link
          to="/profile"
          className="block rounded-2xl bg-warn-soft px-4 py-3 text-sm font-bold text-warn"
        >
          {t.tagNeedPhone}
        </Link>
      )}
      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-xl font-semibold text-primary">{t.tagScanMe}</p>
        {qr ? (
          <img src={qr} alt={`QR ${pet.name}`} className="h-56 w-56 rounded-2xl bg-card" />
        ) : (
          <div className="h-56 w-56" />
        )}
        <p className="text-lg font-semibold">{pet.name}</p>
        {owner.phone && <p className="text-sm text-muted-foreground">{owner.phone}</p>}
      </Card>
      <Card className="space-y-3">
        <TextField
          label={t.tagNote}
          placeholder={t.tagNotePh}
          maxLength={80}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {pet.vetPhone && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={showVet}
              onChange={(e) => setShowVet(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t.tagShowVet}
          </label>
        )}
        <p className="text-xs text-muted-foreground">{t.tagPrivacy}</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <PrimaryButton
          className="col-span-2"
          disabled={!qr}
          onClick={() => void printTags()}
        >
          <Printer className="h-4 w-4" /> {t.tagPrint}
        </PrimaryButton>
        <GhostButton
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => toast.success(t.tagCopied));
          }}
        >
          <Copy className="h-4 w-4" /> {t.tagCopy}
        </GhostButton>
        {WEB_URL && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-bold text-primary"
          >
            <ExternalLink className="h-4 w-4" /> {t.tagOpen}
          </a>
        )}
      </div>
      {qr && <TagPrint qr={qr} name={pet.name} phone={owner.phone} label={t.tagScanMe} />}
    </>
  );
}

const SHEET_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const SHEET_SCALE = 2; // canvas pixels per PDF point, as in print.ts

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("QR image failed to load"));
    img.src = src;
  });
}

/** The four tags of the print sheet, drawn onto one A4 page and packed into a PDF. */
async function createTagSheetPdf(
  qr: string,
  name: string,
  label: string,
  phone: string | undefined,
  title: string,
): Promise<Blob> {
  const W = 595; // A4 in PDF points
  const H = 842;
  const tagW = 110;
  const tagH = 160;
  const gap = 14;
  const qrSize = 92;
  const top = 60;
  const left = (W - (4 * tagW + 3 * gap)) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = W * SHEET_SCALE;
  canvas.height = H * SHEET_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.scale(SHEET_SCALE, SHEET_SCALE);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111";
  ctx.strokeStyle = "#999";
  ctx.textAlign = "center";

  const qrImage = await loadImage(qr);
  for (let i = 0; i < 4; i++) {
    const x = left + i * (tagW + gap);
    const cx = x + tagW / 2;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, top, tagW, tagH);
    ctx.restore();
    ctx.font = `600 8px ${SHEET_FONT}`;
    ctx.fillText(label, cx, top + 14, tagW - 10);
    ctx.drawImage(qrImage, cx - qrSize / 2, top + 22, qrSize, qrSize);
    ctx.font = `700 12px ${SHEET_FONT}`;
    ctx.fillText(name, cx, top + 22 + qrSize + 18, tagW - 10);
    if (phone) {
      ctx.font = `400 9px ${SHEET_FONT}`;
      ctx.fillText(phone, cx, top + 22 + qrSize + 34, tagW - 10);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not render the sheet."))),
      "image/jpeg",
      0.92,
    ),
  );
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = 0; // free the canvas memory right away; matters on phones
  canvas.height = 0;
  return assemblePdf([{ jpeg, width, height }], title);
}

const PRINT_CSS = `
@media screen { #pet-tag { display: none; } }
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  body > *:not(#pet-tag) { display: none !important; }
  #pet-tag { display: flex; }
}
#pet-tag { gap: 10mm; flex-wrap: wrap; font-family: system-ui, Arial, sans-serif; color: #111; }
#pet-tag .t { width: 40mm; border: 1px dashed #999; border-radius: 6mm; padding: 3mm; text-align: center; }
#pet-tag img { width: 34mm; height: 34mm; }
#pet-tag b { display: block; font-size: 12px; }
#pet-tag small { display: block; font-size: 9px; }
`;

function TagPrint({
  qr,
  name,
  phone,
  label,
}: {
  qr: string;
  name: string;
  phone?: string | undefined;
  label: string;
}) {
  const node = (
    <div id="pet-tag">
      <style>{PRINT_CSS}</style>
      {[0, 1, 2, 3].map((i) => (
        <div className="t" key={i}>
          <small>{label}</small>
          <img src={qr} alt="" />
          <b>{name}</b>
          {phone && <small>{phone}</small>}
        </div>
      ))}
    </div>
  );
  return createPortal(node, document.body);
}
