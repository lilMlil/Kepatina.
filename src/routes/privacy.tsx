import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeading } from "@/components/kit";
import { fillPrivacy, privacyDocs } from "@/lib/privacy-i18n";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const { settings } = useApp();
  const d = privacyDocs[settings.lang];
  return (
    <>
      <PageHeading back="/settings" title={d.title} subtitle={d.updated} />
      <Card>
        <p className="text-sm">{fillPrivacy(d.intro)}</p>
      </Card>
      {d.sections.map((s) => (
        <Card key={s.h} className="space-y-2">
          <h2 className="font-semibold">{s.h}</h2>
          {s.p?.map((x) => (
            <p key={x} className="text-sm text-muted-foreground">
              {fillPrivacy(x)}
            </p>
          ))}
          {s.ul && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {s.ul.map((x) => (
                <li key={x}>{fillPrivacy(x)}</li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </>
  );
}
