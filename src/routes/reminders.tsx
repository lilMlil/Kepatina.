import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, BellRing, Check, Plus, Trash2 } from "lucide-react";
import { Avatar, Card, PageHeading, PrimaryButton, useConfirm } from "@/components/kit";
import { useApp } from "@/lib/store";
import { repeatDailyLabel, type Reminder } from "@/lib/reminders";

export const Route = createFileRoute("/reminders")({
  component: RemindersPage,
});

function RemindersPage() {
  const { t, settings, reminders, pets, notif, enableNotifications, removeReminder, markDone } = useApp();
  const { ask, dialog } = useConfirm();
  const now = Date.now();
  const sorted = [...reminders].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const upcoming = sorted.filter((r) => new Date(r.dueAt).getTime() >= now);
  const overdue = sorted.filter((r) => new Date(r.dueAt).getTime() < now);

  const Item = ({ r }: { r: Reminder }) => {
    const pet = pets.find((p) => p.id === r.petId);
    return (
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar src={pet?.photo} size={42} />
          <div className="flex-1">
            <p className="font-bold">{r.title}</p>
            <p className="text-xs text-muted-foreground">
              {pet?.name} · {r.category}
            </p>
            <p className="mt-1 text-sm font-bold text-primary">
              {new Date(r.dueAt).toLocaleString(settings.lang, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {r.repeatDays && (
              <p className="text-xs text-muted-foreground">
                {r.repeatDays === 1
                  ? repeatDailyLabel[settings.lang]
                  : `${t.repeatEvery} ${r.repeatDays} ${t.days}`}
              </p>
            )}
          </div>
          <button
            aria-label={t.delete}
            onClick={() =>
              ask(t.deleteReminderQ, `“${r.title}”`, t.delete, () => removeReminder(r.id))
            }
            className="p-2 text-muted-foreground"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => markDone(r.id)}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-primary"
        >
          <Check className="h-4 w-4" /> {t.done}
        </button>
      </Card>
    );
  };

  return (
    <>
      <PageHeading eyebrow={t.remEyebrow} title={t.tabReminders} subtitle={t.remSubtitle} />
      <Link
        to="/reminder-new"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        <Plus className="h-5 w-5" /> {t.addReminder}
      </Link>

      <Card className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${notif === "granted" ? "bg-safe-soft text-safe" : "bg-peach-soft text-warn"}`}
        >
          {notif === "granted" ? (
            <BellRing className="h-5 w-5" />
          ) : notif === "denied" ? (
            <BellOff className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </span>
        <div className="flex-1 space-y-2">
          <p className="font-bold">{t.notifTitle}</p>
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
            <PrimaryButton
              className="min-h-10 px-4 text-sm"
              onClick={() => void enableNotifications()}
            >
              {t.notifEnable}
            </PrimaryButton>
          )}
        </div>
      </Card>

      {overdue.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-danger">{t.overdue}</h2>
          {overdue.map((r) => (
            <Item key={r.id} r={r} />
          ))}
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.upcoming}</h2>
        {upcoming.length ? (
          upcoming.map((r) => <Item key={r.id} r={r} />)
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">{t.noReminders}</p>
          </Card>
        )}
      </section>
      {dialog}
    </>
  );
}
