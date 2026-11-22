import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, ExternalLink } from "lucide-react";
import { Card, Chip, NeedPetHint, PageHeading } from "@/components/kit";
import { useApp } from "@/lib/store";
import { seasonFor, tipsFor, type Season } from "@/lib/seasonal";
export const Route = createFileRoute("/seasonal")({
  component: Seasonal,
});
function Seasonal() {
  const { t, settings, pets, selectedPet, selectPet } = useApp();
  const [season, setSeason] = useState<Season>(seasonFor());
  return (
    <>
      <PageHeading title={t.seasonTitle} back="/" />
      {!pets.length && <NeedPetHint />}
      <p className="text-xs text-muted-foreground">{t.seasonRegion}</p>
      <div className="flex flex-wrap gap-2">
        {pets.map((p) => (
          <Chip key={p.id} active={p.id === selectedPet?.id} onClick={() => selectPet(p.id)}>
            {p.name}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {t.seasonNames.map((name, i) => (
          <Chip key={name} active={season === i} onClick={() => setSeason(i as Season)}>
            {name}
          </Chip>
        ))}
      </div>
      {tipsFor(season, selectedPet?.species).map((tip) => (
        <Card key={tip.copy.lv[0]} className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Leaf className="h-5 w-5 shrink-0 text-primary" />
            {tip.copy[settings.lang][0]}
          </h2>
          <p className="text-sm leading-relaxed">{tip.copy[settings.lang][1]}</p>
          <a
            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            href={tip.source}
            target="_blank"
            rel="noreferrer"
          >
            {new URL(tip.source).hostname}
            <ExternalLink className="h-3 w-3" />
          </a>
        </Card>
      ))}
      <p className="text-xs text-warn">{t.disclaimer}</p>
    </>
  );
}
