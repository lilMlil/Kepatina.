import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  GhostButton,
  PrimaryButton,
  TextField,
  PageHeading,
  useConfirm,
} from "@/components/kit";
import { useApp } from "@/lib/store";
import {
  expenseCategories,
  expenseTotal,
  parseExpenseAmount,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";
import { localDate } from "@/lib/meds";
import { DateField, MonthField } from "@/components/pickers";
export const Route = createFileRoute("/expenses")({
  component: Expenses,
});
function Expenses() {
  const {
    t,
    settings,
    pets,
    selectedPetId,
    expenses = [],
    addExpense,
    updateExpense,
    removeExpense,
  } = useApp();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const { ask, dialog } = useConfirm();
  const rows = expenses
    .filter((e) => e.date.startsWith(month) && (!filter || e.petId === filter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const money = (cents: number) =>
    new Intl.NumberFormat(settings.lang, { style: "currency", currency: "EUR" }).format(
      cents / 100,
    );
  return (
    <>
      <PageHeading title={t.exTitle} back="/" />
      <div className="grid grid-cols-2 gap-3">
        <MonthField label={t.exMonth} value={month} onChange={setMonth} />
        <label className="space-y-1.5 text-sm font-bold">
          {t.pet}
          <select
            aria-label={t.pet}
            className="h-12 w-full rounded-2xl border bg-background px-3"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t.exAll}</option>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="flex items-center gap-3 border-y py-5">
        <Wallet className="h-7 w-7 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">{t.exTotal}</p>
          <p className="text-3xl font-semibold text-primary">{money(expenseTotal(rows))}</p>
        </div>
      </section>
      {adding || editing ? (
        <ExpenseForm
          key={editing?.id ?? "new"}
          initial={editing}
          initialPet={selectedPetId ?? pets[0]?.id ?? ""}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(e) => {
            if (editing) updateExpense(editing.id, e);
            else addExpense(e);
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : (
        <PrimaryButton disabled={!pets.length} onClick={() => setAdding(true)} className="w-full">
          <Plus className="h-4 w-4" />
          {t.exNew}
        </PrimaryButton>
      )}
      {!pets.length && <p className="text-sm text-muted-foreground">{t.tagNoPet}</p>}
      <div className="space-y-2">
        {expenseCategories.map((c, i) => {
          const total = expenseTotal(rows.filter((e) => e.category === c));
          return total > 0 ? (
            <div key={c} className="flex justify-between border-b py-2 text-sm">
              <span>{t.exCategories[i]}</span>
              <b>{money(total)}</b>
            </div>
          ) : null;
        })}
      </div>
      {rows.length ? (
        rows.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold">
                  {e.note || t.exCategories[expenseCategories.indexOf(e.category)]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pets.find((p) => p.id === e.petId)?.name} · {e.date} ·{" "}
                  {t.exCategories[expenseCategories.indexOf(e.category)]}
                </p>
                <p className="mt-2 font-semibold text-primary">{money(e.amountCents)}</p>
              </div>
              <GhostButton
                aria-label={t.manage}
                title={t.manage}
                onClick={() => {
                  setEditing(e);
                  setAdding(false);
                }}
              >
                <Pencil className="h-4 w-4" />
              </GhostButton>
              <GhostButton
                aria-label={t.exDelete}
                title={t.exDelete}
                onClick={() => ask(t.exDelete, t.exDeleteBody, t.remove, () => removeExpense(e.id))}
              >
                <Trash2 className="h-4 w-4" />
              </GhostButton>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">{t.exEmpty}</p>
      )}
      {dialog}
    </>
  );
}
function ExpenseForm({
  initial,
  initialPet,
  onSave,
  onCancel,
}: {
  initial: Expense | null;
  initialPet: string;
  onSave: (e: Omit<Expense, "id">) => void;
  onCancel: () => void;
}) {
  const { t, pets } = useApp();
  const [petId, setPet] = useState(initial?.petId ?? initialPet);
  const [date, setDate] = useState(initial?.date ?? localDate());
  const [amount, setAmount] = useState(initial ? String(initial.amountCents / 100) : "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "food");
  const [note, setNote] = useState(initial?.note ?? "");
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const cents = parseExpenseAmount(amount);
          if (cents === null) {
            toast.error(t.exInvalid);
            return;
          }
          if (!pets.some((p) => p.id === petId)) return;
          onSave({ petId, date, amountCents: cents, category, note: note.trim() });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{initial ? t.manage : t.exNew}</h2>
          <GhostButton type="button" aria-label={t.cancel} onClick={onCancel}>
            <X className="h-4 w-4" />
          </GhostButton>
        </div>
        <label className="block space-y-1 text-sm font-bold">
          {t.pet}
          <select
            className="h-12 w-full rounded-2xl border bg-background px-3"
            value={petId}
            onChange={(e) => setPet(e.target.value)}
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={t.exAmount}
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <DateField label={t.date} value={date} onChange={setDate} />
        <label className="block space-y-1 text-sm font-bold">
          {t.category}
          <select
            className="h-12 w-full rounded-2xl border bg-background px-3"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {expenseCategories.map((c, i) => (
              <option key={c} value={c}>
                {t.exCategories[i]}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={t.exNote}
          maxLength={160}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <PrimaryButton type="submit" className="w-full">
          {t.save}
        </PrimaryButton>
      </form>
    </Card>
  );
}
