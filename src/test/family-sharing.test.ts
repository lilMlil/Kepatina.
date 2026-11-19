import { describe, expect, it } from "vitest";
import { emptyState, partitionPetState } from "@/lib/family-state";

describe("family pet sharing", () => {
  it("keeps a member's private data separate from an explicitly shared pet bundle", () => {
    const state = {
      ...emptyState,
      owner: { name: "Member", photo: null },
      checks: { checklist: true },
      pets: [
        { id: "private-pet", name: "Private", species: "Suns" as const, createdAt: "" },
        { id: "shared-pet", name: "Shared", species: "Kaķis" as const, createdAt: "" },
      ],
      reminders: [
        {
          id: "private-reminder",
          petId: "private-pet",
          title: "Private reminder",
          category: "care",
          dueAt: "",
          repeatDays: null,
        },
        {
          id: "shared-reminder",
          petId: "shared-pet",
          title: "Shared reminder",
          category: "care",
          dueAt: "",
          repeatDays: null,
        },
      ],
      weights: [
        { id: "private-weight", petId: "private-pet", date: "", kg: 1 },
        { id: "shared-weight", petId: "shared-pet", date: "", kg: 2 },
      ],
    };

    const { privateState, sharedState } = partitionPetState(state, new Set(["shared-pet"]));

    expect(privateState.pets.map((pet) => pet.id)).toEqual(["private-pet"]);
    expect(privateState.reminders.map((reminder) => reminder.id)).toEqual(["private-reminder"]);
    expect(privateState.weights.map((weight) => weight.id)).toEqual(["private-weight"]);
    expect(privateState.owner.name).toBe("Member");
    expect(privateState.checks).toEqual({ checklist: true });

    expect(sharedState.pets.map((pet) => pet.id)).toEqual(["shared-pet"]);
    expect(sharedState.reminders.map((reminder) => reminder.id)).toEqual(["shared-reminder"]);
    expect(sharedState.weights.map((weight) => weight.id)).toEqual(["shared-weight"]);
    expect(sharedState.owner.name).toBe("");
    expect(sharedState.checks).toEqual({});
  });
});
