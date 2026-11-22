export const expenseCategories = ["food", "vet", "medicine", "supplies", "other"] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];
export interface Expense {
  id: string;
  petId: string;
  date: string;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
}
export function parseExpenseAmount(value: string): number | null {
  if (!/^\d+([.,]\d{1,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  // Zero is allowed: a note can be kept without a cost (e.g. a free check-up).
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}
export function expenseTotal(rows: Expense[]): number {
  return rows.reduce((sum, row) => sum + row.amountCents, 0);
}
