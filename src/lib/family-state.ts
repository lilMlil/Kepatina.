import type { Expense } from "./expenses";
import type { MedCourse } from "./meds";
import type { DocumentEntry, MemoryEntry } from "./memories";
import type { Pet, Reminder } from "./reminders";
import type { VaccineEntry, VisitEntry, WeightEntry } from "./health";

export interface Owner {
  name: string;
  photo: string | null;
  phone?: string;
}

export interface SavedState {
  pets: Pet[];
  reminders: Reminder[];
  selectedPetId: string | null;
  owner: Owner;
  checks: Record<string, boolean>;
  weights: WeightEntry[];
  vaccines: VaccineEntry[];
  visits: VisitEntry[];
  memories: MemoryEntry[];
  documents: DocumentEntry[];
  meds: MedCourse[];
  expenses: Expense[];
}

export const emptyState: SavedState = {
  pets: [],
  reminders: [],
  selectedPetId: null,
  owner: { name: "", photo: null },
  checks: {},
  weights: [],
  vaccines: [],
  visits: [],
  memories: [],
  documents: [],
  meds: [],
  expenses: [],
};

/** Separate the private state from the bundles explicitly shared with a family. */
export function partitionPetState(state: SavedState, sharedPetIds: ReadonlySet<string>) {
  const privateState: SavedState = { ...state, pets: [] };
  const sharedState: SavedState = {
    ...emptyState,
    owner: { ...emptyState.owner },
    pets: [],
  };

  for (const pet of state.pets) {
    (sharedPetIds.has(pet.id) ? sharedState.pets : privateState.pets).push(pet);
  }

  const split = <T extends { petId: string }>(items: T[]) => ({
    privateItems: items.filter((item) => !sharedPetIds.has(item.petId)),
    sharedItems: items.filter((item) => sharedPetIds.has(item.petId)),
  });
  const reminders = split(state.reminders);
  const weights = split(state.weights);
  const vaccines = split(state.vaccines);
  const visits = split(state.visits);
  const memories = split(state.memories);
  const documents = split(state.documents);
  const meds = split(state.meds);
  const expenses = split(state.expenses);
  privateState.reminders = reminders.privateItems;
  sharedState.reminders = reminders.sharedItems;
  privateState.weights = weights.privateItems;
  sharedState.weights = weights.sharedItems;
  privateState.vaccines = vaccines.privateItems;
  sharedState.vaccines = vaccines.sharedItems;
  privateState.visits = visits.privateItems;
  sharedState.visits = visits.sharedItems;
  privateState.memories = memories.privateItems;
  sharedState.memories = memories.sharedItems;
  privateState.documents = documents.privateItems;
  sharedState.documents = documents.sharedItems;
  privateState.meds = meds.privateItems;
  sharedState.meds = meds.sharedItems;
  privateState.expenses = expenses.privateItems;
  sharedState.expenses = expenses.sharedItems;

  sharedState.selectedPetId = null;
  sharedState.owner = { ...emptyState.owner };
  sharedState.checks = {};
  return { privateState, sharedState };
}
