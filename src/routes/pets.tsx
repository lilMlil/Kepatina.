import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  BookUser,
  Camera,
  CheckCircle2,
  Lock,
  Phone,
  Scale,
  Stethoscope,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  AvatarPicker,
  Card,
  Chip,
  PageHeading,
  PrimaryButton,
  SpeciesSelector,
  TextField,
  useConfirm,
} from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import { fileToAvatar } from "@/lib/image";
import { petAge, type Species } from "@/lib/reminders";
import type { Dict } from "@/lib/i18n";

function ageText(t: Dict, birthDate?: string) {
  const a = petAge(birthDate);
  if (!a) return "";
  const parts = [
    a.years ? `${a.years} ${t.ageY}` : "",
    a.months ? `${a.months} ${t.ageM}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : t.ageLess;
}

export const Route = createFileRoute("/pets")({
  component: PetsPage,
});

function PetsPage() {
  const { t, pets, selectedPetId, addPet, removePet, selectPet, updatePet, user } = useApp();
  const { ask, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("Suns");
  const [photo, setPhoto] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const [medOpen, setMedOpen] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) return setErr(t.needName);
    addPet(name, species, photo);
    setName("");
    setPhoto(null);
    setErr("");
  };

  return (
    <>
      <PageHeading back="/" eyebrow={t.petsEyebrow} title={t.yourPets} subtitle={t.petsSubtitle} />
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">{t.addPet}</h2>
        <AvatarPicker value={photo} onChange={setPhoto} />
        <TextField
          label={t.petName}
          placeholder={t.petNamePh}
          value={name}
          maxLength={28}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
        />
        <div className="space-y-2">
          <p className="text-sm font-bold">{t.species}</p>
          <SpeciesSelector value={species} onChange={setSpecies} />
        </div>
        {err && <p className="text-sm font-bold text-destructive">{err}</p>}
        <PrimaryButton className="w-full" onClick={submit}>
          {t.savePet}
        </PrimaryButton>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.savedPets}</h2>
        {pets.map((p) => (
          <div key={p.id} className="space-y-2">
            <Card className="flex items-center gap-3 py-3">
              <button
                className="relative"
                aria-label={t.changePhoto}
                onClick={() => {
                  setPhotoFor(p.id);
                  fileRef.current?.click();
                }}
              >
                <Avatar src={p.photo} size={52} />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Camera className="h-3 w-3" />
                </span>
              </button>
              <div className="flex-1">
                <p className="font-bold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[speciesLabel(t, p.species), ageText(t, p.birthDate)]
                    .filter(Boolean)
                    .join(" · ")}
                  {p.id === selectedPetId ? ` · ${t.selected}` : ""}
                </p>
              </div>
              {p.id !== selectedPetId && (
                <button
                  aria-label={t.select}
                  onClick={() => selectPet(p.id)}
                  className="p-2 text-primary"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              )}
              <button
                aria-label={t.medCard}
                aria-expanded={medOpen === p.id}
                onClick={() => setMedOpen(medOpen === p.id ? null : p.id)}
                className="p-2 text-accent-foreground"
              >
                <Stethoscope className="h-5 w-5" />
              </button>
              <button
                aria-label={`${t.remove} ${p.name}`}
                onClick={() =>
                  ask(`${t.removePetQ} ${p.name}?`, t.removePetBody, t.remove, () =>
                    removePet(p.id),
                  )
                }
                className="p-2 text-muted-foreground"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </Card>
            {medOpen === p.id && (
              <Card className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-primary">
                  <Stethoscope className="h-4 w-4" /> {t.medCard}
                </h3>
                <TextField
                  label={t.medBreed}
                  value={p.breed ?? ""}
                  maxLength={60}
                  onChange={(e) => updatePet(p.id, { breed: e.target.value })}
                />
                <TextField
                  label={t.ppColor}
                  value={p.color ?? ""}
                  maxLength={60}
                  onChange={(e) => updatePet(p.id, { color: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label={t.medBirth}
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={p.birthDate ?? ""}
                    onChange={(e) => updatePet(p.id, { birthDate: e.target.value })}
                  />
                  <TextField
                    label={t.medWeight}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={200}
                    step="0.1"
                    value={p.weightKg ?? ""}
                    onChange={(e) => updatePet(p.id, { weightKg: e.target.value })}
                  />
                </div>
                {ageText(t, p.birthDate) && (
                  <p className="text-sm text-muted-foreground">
                    {t.medAge}: <b className="text-foreground">{ageText(t, p.birthDate)}</b>
                  </p>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-bold">{t.medSex}</p>
                  <div className="flex gap-2">
                    <Chip
                      active={p.sex === "m"}
                      onClick={() => updatePet(p.id, { sex: p.sex === "m" ? undefined : "m" })}
                    >
                      {t.sexM}
                    </Chip>
                    <Chip
                      active={p.sex === "f"}
                      onClick={() => updatePet(p.id, { sex: p.sex === "f" ? undefined : "f" })}
                    >
                      {t.sexF}
                    </Chip>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold">{t.ppNeutered}</p>
                  <div className="flex gap-2">
                    <Chip
                      active={p.neutered === true}
                      onClick={() =>
                        updatePet(p.id, { neutered: p.neutered === true ? undefined : true })
                      }
                    >
                      {t.ppYes}
                    </Chip>
                    <Chip
                      active={p.neutered === false}
                      onClick={() =>
                        updatePet(p.id, { neutered: p.neutered === false ? undefined : false })
                      }
                    >
                      {t.ppNo}
                    </Chip>
                  </div>
                </div>
                <TextField
                  label={t.medChip}
                  value={p.chipNumber ?? ""}
                  maxLength={30}
                  onChange={(e) => updatePet(p.id, { chipNumber: e.target.value })}
                />
                <TextField
                  label={t.ppVetName}
                  value={p.vetName ?? ""}
                  maxLength={60}
                  onChange={(e) => updatePet(p.id, { vetName: e.target.value })}
                />
                <TextField
                  label={t.medVet}
                  type="tel"
                  inputMode="tel"
                  maxLength={25}
                  value={p.vetPhone ?? ""}
                  onChange={(e) => updatePet(p.id, { vetPhone: e.target.value })}
                />
                <Link
                  to="/passport"
                  onClick={() => selectPet(p.id)}
                  className="flex items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 text-sm font-bold text-primary"
                >
                  <BookUser className="h-4 w-4" /> {t.ppTitle}
                </Link>
                <Link
                  to="/health"
                  onClick={() => selectPet(p.id)}
                  className="flex items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 text-sm font-bold text-primary"
                >
                  <Scale className="h-4 w-4" /> {t.hOpen}
                </Link>
                {p.vetPhone?.trim() && (
                  <a
                    href={`tel:${p.vetPhone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    <Phone className="h-4 w-4" /> {t.medCall}
                  </a>
                )}
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold">{t.medNotes}</span>
                  <textarea
                    value={p.notes ?? ""}
                    rows={3}
                    maxLength={500}
                    onChange={(e) => updatePet(p.id, { notes: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </Card>
            )}
          </div>
        ))}
      </section>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && photoFor) updatePet(photoFor, { photo: await fileToAvatar(f) });
        }}
      />
      {!user && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" /> {t.localOnly}
        </p>
      )}
      {dialog}
    </>
  );
}
