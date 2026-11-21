import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { dicts, type Dict, type Lang } from "./i18n";
import {
  latestWeight,
  removeHealthFor,
  type VaccineEntry,
  type VisitEntry,
  type WeightEntry,
} from "./health";
import {
  getNotifPermission,
  requestNotifPermission,
  showTestNotification,
  syncNativeSchedule,
} from "./native/notifications";
import { applyStatusBarTheme, isNative, RECOVERY_EVENT, RECOVERY_KEY } from "./native/platform";
import { accountCopy } from "./account-i18n";
import type { MedCourse } from "./meds";
import type { Expense } from "./expenses";
import { deleteLocalFiles, listLocalFiles, restoreLocalFiles, type StoredFile } from "./media";
import type { DocumentEntry, MemoryEntry } from "./memories";
import { emptyState, partitionPetState, type Owner, type SavedState } from "./family-state";
import {
  hasBackupContent,
  persistBackupArchive,
  restoreBackupArchive,
  validateLegacyState,
} from "./backup-archive";
import {
  dueForNotification,
  nextDueDate,
  removePetFrom,
  type Pet,
  type Reminder,
  type Species,
} from "./reminders";

export type Theme = "light" | "dark";

interface Settings {
  theme: Theme;
  lang: Lang;
}

const STATE_KEY = "kepatina/state-v1";
const SETTINGS_KEY = "kepatina/settings-v1";
const SYNCED_KEY = "kepatina/synced-user";
const BEFORE_RESTORE_KEY = "kepatina/state-before-restore";

function mergeById<T extends { id: string }>(local: T[] = [], remote: T[] = []): T[] {
  const seen = new Set(remote.map((x) => x.id));
  return [...remote, ...local.filter((x) => !seen.has(x.id))];
}

/** First sign-in on this device: keep what is already here and add what the cloud has (nothing is lost). */
function mergeStates(local: SavedState, remote: Partial<SavedState>): SavedState {
  return {
    ...emptyState,
    ...remote,
    pets: mergeById(local.pets, remote.pets),
    reminders: mergeById(local.reminders, remote.reminders),
    weights: mergeById(local.weights, remote.weights),
    vaccines: mergeById(local.vaccines, remote.vaccines),
    visits: mergeById(local.visits, remote.visits),
    memories: mergeById(local.memories, remote.memories),
    documents: mergeById(local.documents, remote.documents),
    meds: mergeById(local.meds, remote.meds),
    expenses: mergeById(local.expenses, remote.expenses),
    checks: { ...local.checks, ...(remote.checks ?? {}) },
    owner: {
      ...local.owner,
      ...(remote.owner ?? {}),
      name: remote.owner?.name || local.owner.name,
      photo: remote.owner?.photo ?? local.owner.photo,
    },
    selectedPetId: remote.selectedPetId ?? local.selectedPetId,
  };
}

type NotifState = "unsupported" | "default" | "granted" | "denied";

export interface FamilyInfo {
  id: string;
  code: string;
  ownerId: string;
  members: { userId: string; email: string | null; joinedAt: string | null }[];
  sharedPetOwners: Record<string, string>;
}

/** A family has at most this many members (the database enforces the same limit). */
export const FAMILY_MAX_MEMBERS = 8;

/** Why joining a family did not work. */
export type JoinError = "invalid" | "already" | "full" | "limit" | "error";

interface FamilyLoad {
  info: FamilyInfo;
  data: Partial<SavedState>;
}

interface FamilyData extends Partial<SavedState> {
  sharedPetOwners?: Record<string, string>;
}

function familySharedState(
  state: Partial<SavedState>,
  sharedPetOwners: Record<string, string>,
): SavedState {
  return partitionPetState({ ...emptyState, ...state }, new Set(Object.keys(sharedPetOwners)))
    .sharedState;
}

function sharedFamilyData(state: SavedState, sharedPetOwners: Record<string, string>): FamilyData {
  return { ...familySharedState(state, sharedPetOwners), sharedPetOwners };
}

function otherMembersPetIds(family: FamilyInfo, userId: string): Set<string> {
  return new Set(
    Object.entries(family.sharedPetOwners)
      .filter(([, ownerId]) => ownerId !== userId)
      .map(([petId]) => petId),
  );
}

function personalFamilyData(
  state: SavedState,
  sharedPetOwners: Record<string, string>,
  userId: string,
): SavedState {
  const sharedPetIds = new Set(Object.keys(sharedPetOwners));
  const privateState = partitionPetState(state, sharedPetIds).privateState;
  const ownedPetIds = new Set(
    Object.entries(sharedPetOwners)
      .filter(([, ownerId]) => ownerId === userId)
      .map(([petId]) => petId),
  );
  const ownedSharedState = partitionPetState(state, ownedPetIds).sharedState;
  return mergeStates(privateState, ownedSharedState);
}

function sameFamily(a: FamilyInfo | null, b: FamilyInfo | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Ctx extends SavedState {
  ready: boolean;
  t: Dict;
  settings: Settings;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  user: User | null;
  selectedPet: Pet | undefined;
  addPet: (name: string, species: Species, photo: string | null) => void;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  removePet: (id: string) => Promise<void>;
  selectPet: (id: string) => void;
  addReminder: (r: Omit<Reminder, "id">) => void;
  removeReminder: (id: string) => void;
  markDone: (id: string) => void;
  setOwner: (patch: Partial<Owner>) => void;
  toggleCheck: (key: string) => void;
  addWeight: (petId: string, date: string, kg: number) => void;
  removeWeight: (id: string) => void;
  addVaccine: (v: Omit<VaccineEntry, "id">) => void;
  removeVaccine: (id: string) => void;
  addVisit: (v: Omit<VisitEntry, "id">) => void;
  removeVisit: (id: string) => void;
  addMemory: (memory: Omit<MemoryEntry, "id">) => void;
  /** Changes the memories in one step (edit an entry, move photos between albums, ...). */
  updateMemories: (update: (memories: MemoryEntry[]) => MemoryEntry[]) => void;
  removeMemory: (id: string) => Promise<boolean>;
  addDocument: (document: Omit<DocumentEntry, "id">) => void;
  removeDocument: (id: string) => Promise<boolean>;
  addMed: (m: Omit<MedCourse, "id" | "done">) => void;
  removeMed: (id: string) => void;
  toggleDose: (id: string, key: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, expense: Omit<Expense, "id">) => void;
  removeExpense: (id: string) => void;
  notif: NotifState;
  enableNotifications: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  recovery: boolean;
  clearRecovery: () => void;
  exportBackup: () => string;
  restoreBackup: (raw: string) => boolean;
  online: boolean;
  family: FamilyInfo | null;
  createFamily: () => Promise<boolean>;
  joinFamily: (code: string) => Promise<JoinError | null>;
  setPetShared: (petId: string, shared: boolean) => boolean;
  leaveFamily: () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  regenerateCode: () => Promise<boolean>;
  refreshFamily: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(emptyState);
  const [settings, setSettings] = useState<Settings>({ theme: "light", lang: "lv" });
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notif, setNotif] = useState<NotifState>("default");
  const remoteLoaded = useRef<string | null>(null);
  const recoveredPreviousArchive = useRef(false);
  const [online, setOnline] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const storageWarned = useRef(false);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const lastPushed = useRef<string>("");
  const stateRef = useRef(state);
  stateRef.current = state;
  const familyRef = useRef<FamilyInfo | null>(null);
  familyRef.current = family;
  const syncWarned = useRef(false);
  const refreshFamilyRef = useRef<() => Promise<void>>(async () => {});
  // Bumped to make the cloud sync try again (after an error, or right after joining a family)
  const [syncRetry, setSyncRetry] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Password-reset link opened: ask for a new password on the profile page
  useEffect(() => {
    try {
      if (sessionStorage.getItem(RECOVERY_KEY)) setRecovery(true);
    } catch {
      /* ignore */
    }
    const on = () => setRecovery(true);
    window.addEventListener(RECOVERY_EVENT, on);
    return () => window.removeEventListener(RECOVERY_EVENT, on);
  }, []);

  // Load local data
  useEffect(() => {
    try {
      const s = localStorage.getItem(STATE_KEY);
      if (s) setState({ ...emptyState, ...JSON.parse(s) });
      const st = localStorage.getItem(SETTINGS_KEY);
      if (st) setSettings((cur) => ({ ...cur, ...JSON.parse(st) }));
    } catch {
      /* ignore corrupt storage */
    }
    void getNotifPermission().then(setNotif);
    setReady(true);
  }, []);

  // Persist local
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      // The phone's storage is full: tell the person once, so that nothing is lost silently.
      if (!storageWarned.current) {
        storageWarned.current = true;
        toast.error(accountCopy[settings.lang].storageFull);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.lang = settings.lang;
    void applyStatusBarTheme(settings.theme);
  }, [settings, ready]);

  // Auth
  useEffect(() => {
    if (!supabaseConfigured) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || session?.user.id !== remoteLoaded.current)
        remoteLoaded.current = null;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  /** null = not in a family; "error" = could not find out (network / server) — never treat that as "not in a family". */
  const loadFamily = useCallback(async (uid: string): Promise<FamilyLoad | null | "error"> => {
    const { data: mem, error: memError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (memError) return "error";
    if (!mem) return null;
    const [famRes, membersRes] = await Promise.all([
      supabase
        .from("families")
        .select("id, invite_code, owner_id, data")
        .eq("id", mem.family_id)
        .maybeSingle(),
      supabase
        .from("family_members")
        .select("user_id, email, joined_at")
        .eq("family_id", mem.family_id)
        .order("joined_at"),
    ]);
    if (famRes.error || membersRes.error) return "error";
    const fam = famRes.data;
    if (!fam) return null;
    const rawData = (fam.data ?? {}) as FamilyData;
    const sharedPetOwners = {
      ...Object.fromEntries((rawData.pets ?? []).map((pet) => [pet.id, fam.owner_id])),
      ...(rawData.sharedPetOwners ?? {}),
    };
    const { sharedPetOwners: _ignored, ...data } = rawData;
    return {
      info: {
        id: fam.id,
        code: fam.invite_code,
        ownerId: fam.owner_id,
        sharedPetOwners,
        members: (membersRes.data ?? []).map((m) => ({
          userId: m.user_id,
          email: m.email,
          joinedAt: m.joined_at ?? null,
        })),
      },
      data,
    };
  }, []);

  const hasContent = (d: Partial<SavedState> | undefined): d is Partial<SavedState> =>
    !!(
      d &&
      (d.pets?.length ||
        d.reminders?.length ||
        d.weights?.length ||
        d.vaccines?.length ||
        d.visits?.length ||
        d.memories?.length ||
        d.documents?.length ||
        d.meds?.length ||
        d.expenses?.length ||
        Object.keys(d.checks ?? {}).length ||
        d.owner?.name ||
        d.owner?.photo ||
        d.owner?.phone)
    );

  // On sign-in (or reconnect): restore the user's archive, migrate legacy rows, or back up local data.
  useEffect(() => {
    if (!ready || !user || !online || remoteLoaded.current === user.id) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const tryAgainLater = () => {
      retryTimer = setTimeout(() => setSyncRetry((n) => n + 1), 15000);
    };
    (async () => {
      let localState = stateRef.current;
      try {
        const previousUserId = localStorage.getItem(SYNCED_KEY);
        if (previousUserId && previousUserId !== user.id) localState = emptyState;
      } catch {
        /* local state is still the best available source if storage is unavailable */
      }
      const fam = await loadFamily(user.id);
      if (cancelled) return;
      if (fam === "error") {
        tryAgainLater();
        return;
      }
      const { data: objects, error: listError } = await supabase.storage
        .from("user-backups")
        .list(user.id, { limit: 100, search: "backup" });
      if (cancelled) return;
      if (listError) {
        tryAgainLater();
        return;
      }

      const currentExists = (objects ?? []).some((object) => object.name === "backup.zip");
      const previousExists = (objects ?? []).some((object) => object.name === "backup.prev.zip");
      const backupNames = currentExists
        ? previousExists
          ? ["backup.zip", "backup.prev.zip"]
          : ["backup.zip"]
        : previousExists
          ? ["backup.prev.zip"]
          : [];
      let personal: SavedState = emptyState;
      let restoredSettings: Settings | undefined;
      let legacyRowExists = false;
      if (backupNames.length) {
        let archiveRestored = false;
        for (const backupName of backupNames) {
          const { data: archive, error: downloadError } = await supabase.storage
            .from("user-backups")
            .download(`${user.id}/${backupName}`);
          if (cancelled) return;
          if (downloadError || !archive) {
            console.error(`[backup] could not download ${backupName}`, downloadError);
            continue;
          }
          try {
            let restoredState: SavedState | undefined;
            let archiveSettings: Settings | undefined;
            const contents = await restoreBackupArchive(archive, {
              files: restoreLocalFiles,
              state: (next) => {
                restoredState = next;
              },
              settings: (next) => {
                archiveSettings = next;
              },
            });
            if (cancelled) return;
            personal = restoredState ?? contents.state;
            restoredSettings = archiveSettings ?? contents.settings;
            recoveredPreviousArchive.current = backupName === "backup.prev.zip";
            archiveRestored = true;
            break;
          } catch (error) {
            console.error(`[backup] ${backupName} validation or restore failed`, error);
          }
        }
        if (!archiveRestored) {
          tryAgainLater();
          return;
        }
        try {
          const { error: deleteError } = await supabase
            .from("user_state")
            .delete()
            .eq("user_id", user.id);
          if (deleteError) console.error("[backup] legacy row cleanup failed", deleteError);
        } catch (error) {
          console.error("[backup] legacy row cleanup failed", error);
        }
      } else {
        const { data: legacy, error: legacyError } = await supabase
          .from("user_state")
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (legacyError) {
          tryAgainLater();
          return;
        }
        legacyRowExists = Boolean(legacy);
        const legacyState = validateLegacyState(legacy?.data);
        personal =
          legacyState && hasBackupContent(legacyState)
            ? mergeStates(localState, legacyState)
            : localState;
        if (fam) personal = personalFamilyData(personal, fam.info.sharedPetOwners, user.id);
        if (hasBackupContent(personal)) {
          try {
            await persistBackupArchive(
              user.id,
              personal,
              settings,
              await listLocalFiles(),
              supabase.storage.from("user-backups"),
            );
            if (legacyRowExists) {
              const { error: deleteError } = await supabase
                .from("user_state")
                .delete()
                .eq("user_id", user.id);
              if (deleteError) console.error("[backup] legacy row cleanup failed", deleteError);
            }
          } catch (error) {
            console.error("[backup] initial archive upload failed", error);
            tryAgainLater();
            return;
          }
        }
      }
      if (cancelled) return;
      if (restoredSettings) setSettings(restoredSettings);
      if (fam) {
        const familyInfo = { ...fam.info, sharedPetOwners: { ...fam.info.sharedPetOwners } };
        setFamily(familyInfo);
        lastPushed.current = hasContent(fam.data)
          ? JSON.stringify({ ...fam.data, sharedPetOwners: familyInfo.sharedPetOwners })
          : "";
        setState(mergeStates(personal, familySharedState(fam.data, familyInfo.sharedPetOwners)));
      } else {
        setFamily(null);
        setState(personal);
      }
      remoteLoaded.current = user.id;
      try {
        localStorage.setItem(SYNCED_KEY, user.id);
      } catch {
        /* the cloud archive remains the source of truth */
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user, ready, online, loadFamily, syncRetry, settings]);

  // Live updates from other family members
  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`family-${family.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "families", filter: `id=eq.${family.id}` },
        (payload) => {
          const row = payload.new as {
            data?: FamilyData;
            invite_code?: string;
            owner_id?: string;
          };
          const currentFamily = familyRef.current;
          const rowData = row.data;
          const nextOwners = rowData
            ? {
                ...Object.fromEntries(
                  (rowData.pets ?? []).map((pet) => [pet.id, row.owner_id ?? family.ownerId]),
                ),
                ...(rowData.sharedPetOwners ?? {}),
              }
            : (currentFamily?.sharedPetOwners ?? family.sharedPetOwners);
          const data = familySharedState(rowData ?? {}, nextOwners);
          // A new invite code or a new owner (the owner left) arrives here too
          setFamily((cur) =>
            cur &&
            ((row.invite_code && row.invite_code !== cur.code) ||
              (row.owner_id && row.owner_id !== cur.ownerId) ||
              JSON.stringify(nextOwners) !== JSON.stringify(cur.sharedPetOwners))
              ? {
                  ...cur,
                  code: row.invite_code ?? cur.code,
                  ownerId: row.owner_id ?? cur.ownerId,
                  sharedPetOwners: nextOwners,
                }
              : cur,
          );
          if (!rowData) return;
          const json = JSON.stringify({ ...rowData, sharedPetOwners: nextOwners });
          if (json === lastPushed.current) return;
          lastPushed.current = json;
          setState((cur) => {
            const privateState = currentFamily
              ? partitionPetState(cur, new Set(Object.keys(currentFamily.sharedPetOwners)))
                  .privateState
              : cur;
            const merged = mergeStates(privateState, data);
            return {
              ...merged,
              selectedPetId: merged.pets.some((p) => p.id === cur.selectedPetId)
                ? cur.selectedPetId
                : (privateState.selectedPetId ?? null),
            };
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // only the family's identity matters here — not its member list or code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id]);

  // Keep the private archive current (debounced); retries after failures and reconnects.
  useEffect(() => {
    if (!user || !online || remoteLoaded.current !== user.id) return;
    const lang = settings.lang;
    const pushFailed = () => {
      lastPushed.current = "";
      if (!syncWarned.current) {
        syncWarned.current = true;
        toast.error(dicts[lang].cloudSyncFail);
      }
      setTimeout(() => setSyncRetry((n) => n + 1), 20000);
    };
    const h = setTimeout(() => {
      void (async () => {
        const personalState = family
          ? personalFamilyData(state, family.sharedPetOwners, user.id)
          : state;
        if (hasBackupContent(personalState)) {
          try {
            await persistBackupArchive(
              user.id,
              personalState,
              settings,
              await listLocalFiles(),
              supabase.storage.from("user-backups"),
              recoveredPreviousArchive.current,
            );
            recoveredPreviousArchive.current = false;
            syncWarned.current = false;
          } catch (error) {
            console.error("[backup] archive upload failed", error);
            pushFailed();
            return;
          }
        }
        if (family) {
          const sharedData = sharedFamilyData(state, family.sharedPetOwners);
          const sharedJson = JSON.stringify(sharedData);
          if (sharedJson === lastPushed.current) {
            syncWarned.current = false;
            return;
          }
          const { data, error } = await supabase
            .from("families")
            .update({ data: sharedData as never, updated_at: new Date().toISOString() })
            .eq("id", family.id)
            .select("id");
          if (error) return pushFailed();
          lastPushed.current = sharedJson;
          syncWarned.current = false;
          // Nothing was updated: we are not in this family any more (removed, or the family is gone)
          if (!data || data.length === 0) void refreshFamilyRef.current();
        }
      })();
    }, 800);
    return () => clearTimeout(h);
  }, [state, user, online, family, syncRetry, settings]);

  /** Re-reads the member list / code / owner. If we were removed from the family, go back to personal mode. */
  const refreshFamily = useCallback(async () => {
    if (!user || !online) return;
    const fam = await loadFamily(user.id);
    if (fam === "error") return; // a network hiccup is not a removal
    if (!fam) {
      const currentFamily = familyRef.current;
      if (currentFamily) {
        lastPushed.current = "";
        toast.info(dicts[settings.lang].famGone);
        setState(
          (current) =>
            partitionPetState(current, otherMembersPetIds(currentFamily, user.id)).privateState,
        );
      }
      setFamily(null);
      return;
    }
    setFamily((cur) => (sameFamily(cur, fam.info) ? cur : fam.info));
  }, [user, online, loadFamily, settings.lang]);
  refreshFamilyRef.current = refreshFamily;

  // Coming back to the app (or back online): check that we are still in the family and the member list is current
  useEffect(() => {
    if (!family) return;
    const check = () => {
      if (document.visibilityState === "visible") void refreshFamilyRef.current();
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, [family?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createFamily = useCallback(async () => {
    if (!user) return false;
    const initialData = sharedFamilyData(emptyState, {});
    const { error } = await supabase.rpc("create_family", { initial: initialData as never });
    if (error) return false;
    lastPushed.current = JSON.stringify(initialData);
    await refreshFamily();
    return true;
  }, [user, refreshFamily]);

  const setPetShared = useCallback(
    (petId: string, shared: boolean) => {
      if (!user || !family) return false;
      const currentOwner = family.sharedPetOwners[petId];
      if (shared) {
        if (currentOwner) return currentOwner === user.id || family.ownerId === user.id;
        if (!stateRef.current.pets.some((pet) => pet.id === petId)) return false;
        setFamily((current) =>
          current
            ? {
                ...current,
                sharedPetOwners: { ...current.sharedPetOwners, [petId]: user.id },
              }
            : current,
        );
        return true;
      }
      if (currentOwner !== user.id && family.ownerId !== user.id) return false;
      setFamily((current) => {
        if (!current) return current;
        const sharedPetOwners = { ...current.sharedPetOwners };
        delete sharedPetOwners[petId];
        return { ...current, sharedPetOwners };
      });
      return true;
    },
    [user, family],
  );

  const joinFamily = useCallback(async (code: string): Promise<JoinError | null> => {
    const { data, error } = await supabase.rpc("join_family", { code });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already in a family")) return "already";
      if (m.includes("family full")) return "full";
      if (m.includes("too many attempts")) return "limit";
      return "error";
    }
    if (!data) return "invalid";
    // Reload the member's private cloud state separately from the family's shared pets.
    remoteLoaded.current = null;
    setSyncRetry((n) => n + 1);
    return null;
  }, []);

  const leaveFamily = useCallback(async () => {
    if (!user || !family) return;
    const { error } = await supabase.rpc("leave_family");
    if (error) {
      console.error("[family] leave_family failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      toast.error(error.message || dicts[settings.lang].famError);
      return;
    }
    // If the creator leaves, the database hands the family over to the next member.
    lastPushed.current = "";
    const keepPetIds = otherMembersPetIds(family, user.id);
    const personalState = partitionPetState(stateRef.current, keepPetIds).privateState;
    setState(personalState);
    setFamily(null);
    toast.success(dicts[settings.lang].famLeft);
    // Keep privately owned pets and data, but do not copy other members' shared bundles.
  }, [user, family, settings.lang]);

  const removeMember = useCallback(
    async (userId: string) => {
      if (!family) return;
      const { data, error } = await supabase
        .from("family_members")
        .delete()
        .eq("family_id", family.id)
        .eq("user_id", userId)
        .select("user_id");
      if (error) {
        console.error("[family] remove member failed", error);
        toast.error(error.message || dicts[settings.lang].famError);
      } else if (!data || data.length === 0) {
        console.error("[family] remove member returned no deleted row", { userId });
        toast.error(dicts[settings.lang].famError);
      } else toast.success(dicts[settings.lang].famMemberRemoved);
      await refreshFamily();
    },
    [family, refreshFamily, settings.lang],
  );

  const regenerateCode = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc("regenerate_invite_code");
    if (error || !data) return false;
    setFamily((cur) => (cur ? { ...cur, code: data } : cur));
    return true;
  }, []);

  const clearRecovery = useCallback(() => {
    try {
      sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* ignore */
    }
    setRecovery(false);
  }, []);

  const deleteAccount = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.rpc("delete_my_account");
    if (error) return error.message;
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* the account is gone anyway */
    }
    remoteLoaded.current = null;
    lastPushed.current = "";
    setFamily(null);
    setUser(null);
    return null;
  }, []);

  const exportBackup = useCallback(
    () =>
      JSON.stringify({
        app: "kepatina",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: stateRef.current,
      }),
    [],
  );

  const restoreBackup = useCallback((raw: string): boolean => {
    try {
      const j = JSON.parse(raw) as { app?: string; data?: Partial<SavedState> };
      const d = j?.data;
      if (j?.app !== "kepatina" || !d || !Array.isArray(d.pets)) return false;
      try {
        // keep the data that is being replaced, just in case
        localStorage.setItem(BEFORE_RESTORE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* ignore */
      }
      setState({ ...emptyState, ...d, owner: { ...emptyState.owner, ...(d.owner ?? {}) } });
      return true;
    } catch {
      return false;
    }
  }, []);

  const t = dicts[settings.lang];

  // Native: schedule every upcoming reminder / medication dose on the phone itself,
  // so notifications arrive even when the app is closed.
  useEffect(() => {
    if (!ready || !isNative()) return;
    void syncNativeSchedule(
      { pets: state.pets, reminders: state.reminders, meds: state.meds ?? [] },
      t.appName,
    );
  }, [ready, state.pets, state.reminders, state.meds, notif, t.appName]);

  // Web fallback (opened in a browser): notify for due reminders while the page is open.
  useEffect(() => {
    if (!ready || isNative()) return;
    const check = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const due = dueForNotification(state.reminders);
      if (!due.length) return;
      due.forEach((r) => {
        const pet = state.pets.find((p) => p.id === r.petId);
        try {
          new Notification(`${t.notifPrefix} ${pet?.name ?? ""}`.trim(), {
            body: r.title,
            icon: pet?.photo ?? "./icon-192.png",
          });
        } catch {
          /* ignore */
        }
      });
      setState((s) => ({
        ...s,
        reminders: s.reminders.map((r) =>
          due.some((d) => d.id === r.id) ? { ...r, notifiedFor: r.dueAt } : r,
        ),
      }));
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [ready, state.reminders, state.pets, t]);

  const enableNotifications = useCallback(async () => {
    const p = await requestNotifPermission();
    setNotif(p);
    if (p === "granted") {
      toast.success(t.notifTest);
      await showTestNotification(t.appName, t.notifTest);
    } else if (p === "unsupported") {
      toast.error(t.notifUnsupported);
    } else {
      toast.error(t.notifDenied);
    }
  }, [t]);

  const addPet = useCallback((name: string, species: Species, photo: string | null) => {
    const pet: Pet = {
      id: makeId(),
      name: name.trim(),
      species,
      photo,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, pets: [...s.pets, pet], selectedPetId: s.selectedPetId ?? pet.id }));
  }, []);

  const updatePet = useCallback((id: string, patch: Partial<Pet>) => {
    setState((s) => ({ ...s, pets: s.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const removePet = useCallback(
    async (id: string) => {
      const current = stateRef.current;
      const files: StoredFile[] = [
        ...current.memories
          .filter((memory) => memory.petId === id)
          .flatMap((memory) => memory.files),
        ...current.documents
          .filter((document) => document.petId === id)
          .map((document) => document.file),
      ];
      try {
        await deleteLocalFiles(files);
      } catch {
        toast.error(dicts[settings.lang].memoryDeleteError);
        return;
      }
      setState((s) => {
        const next = removePetFrom(s.pets, s.reminders, id);
        return {
          ...s,
          ...next,
          weights: removeHealthFor(s.weights, id),
          vaccines: removeHealthFor(s.vaccines, id),
          visits: removeHealthFor(s.visits, id),
          memories: s.memories.filter((memory) => memory.petId !== id),
          documents: s.documents.filter((document) => document.petId !== id),
          meds: (s.meds ?? []).filter((m) => m.petId !== id),
          expenses: (s.expenses ?? []).filter((e) => e.petId !== id),
          selectedPetId: s.selectedPetId === id ? (next.pets[0]?.id ?? null) : s.selectedPetId,
        };
      });
      setFamily((current) => {
        if (!current?.sharedPetOwners[id]) return current;
        const sharedPetOwners = { ...current.sharedPetOwners };
        delete sharedPetOwners[id];
        return { ...current, sharedPetOwners };
      });
    },
    [settings.lang],
  );

  const removeMemory = useCallback(
    async (id: string) => {
      const memory = stateRef.current.memories.find((entry) => entry.id === id);
      if (!memory) return false;
      try {
        await deleteLocalFiles(memory.files);
      } catch {
        toast.error(dicts[settings.lang].memoryDeleteError);
        return false;
      }
      setState((s) => ({ ...s, memories: s.memories.filter((entry) => entry.id !== id) }));
      return true;
    },
    [settings.lang],
  );

  const removeDocument = useCallback(
    async (id: string) => {
      const document = stateRef.current.documents.find((entry) => entry.id === id);
      if (!document) return false;
      try {
        await deleteLocalFiles([document.file]);
      } catch {
        toast.error(dicts[settings.lang].documentsDeleteError);
        return false;
      }
      setState((s) => ({
        ...s,
        documents: s.documents.filter((entry) => entry.id !== id),
      }));
      return true;
    },
    [settings.lang],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      t,
      settings,
      setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
      setLang: (lang) => setSettings((s) => ({ ...s, lang })),
      user,
      selectedPet: state.pets.find((p) => p.id === state.selectedPetId),
      addPet,
      updatePet,
      removePet,
      selectPet: (id) => setState((s) => ({ ...s, selectedPetId: id })),
      addReminder: (r) =>
        setState((s) => ({ ...s, reminders: [...s.reminders, { ...r, id: makeId() }] })),
      removeReminder: (id) =>
        setState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) })),
      markDone: (id) =>
        setState((s) => {
          const r = s.reminders.find((x) => x.id === id);
          if (!r) return s;
          if (!r.repeatDays) return { ...s, reminders: s.reminders.filter((x) => x.id !== id) };
          const dueAt = nextDueDate(r.dueAt, r.repeatDays).toISOString();
          return {
            ...s,
            reminders: s.reminders.map((x) =>
              x.id === id ? { ...x, dueAt, notifiedFor: null } : x,
            ),
          };
        }),
      addWeight: (petId, date, kg) =>
        setState((s) => {
          const weights = [...s.weights, { id: makeId(), petId, date, kg }];
          // keep the medical card's "weight" field in sync with the newest measurement
          const latest = latestWeight(weights, petId);
          return {
            ...s,
            weights,
            pets: s.pets.map((p) =>
              p.id === petId && latest
                ? { ...p, weightKg: String(Number(latest.kg.toFixed(3))) }
                : p,
            ),
          };
        }),
      removeWeight: (id) =>
        setState((s) => {
          const gone = s.weights.find((w) => w.id === id);
          const weights = s.weights.filter((w) => w.id !== id);
          if (!gone) return s;
          const latest = latestWeight(weights, gone.petId);
          return {
            ...s,
            weights,
            pets: s.pets.map((p) =>
              p.id === gone.petId && latest
                ? { ...p, weightKg: String(Number(latest.kg.toFixed(3))) }
                : p,
            ),
          };
        }),
      addVaccine: (v) =>
        setState((s) => ({ ...s, vaccines: [...s.vaccines, { ...v, id: makeId() }] })),
      removeVaccine: (id) =>
        setState((s) => ({
          ...s,
          vaccines: s.vaccines.filter((v) => v.id !== id),
          documents: s.documents.map((document) =>
            document.recordKind === "vaccine" && document.recordId === id
              ? { ...document, recordKind: undefined, recordId: undefined }
              : document,
          ),
        })),
      addVisit: (v) => setState((s) => ({ ...s, visits: [...s.visits, { ...v, id: makeId() }] })),
      removeVisit: (id) =>
        setState((s) => ({
          ...s,
          visits: s.visits.filter((v) => v.id !== id),
          documents: s.documents.map((document) =>
            document.recordKind === "visit" && document.recordId === id
              ? { ...document, recordKind: undefined, recordId: undefined }
              : document,
          ),
        })),
      addMemory: (memory) =>
        setState((s) => ({ ...s, memories: [...s.memories, { ...memory, id: makeId() }] })),
      updateMemories: (update) => setState((s) => ({ ...s, memories: update(s.memories) })),
      removeMemory,
      addDocument: (document) =>
        setState((s) => ({
          ...s,
          documents: [...s.documents, { ...document, id: makeId() }],
        })),
      removeDocument,
      addMed: (m) =>
        setState((s) => ({ ...s, meds: [...(s.meds ?? []), { ...m, id: makeId(), done: {} }] })),
      removeMed: (id) =>
        setState((s) => ({ ...s, meds: (s.meds ?? []).filter((m) => m.id !== id) })),
      toggleDose: (id, key) =>
        setState((s) => ({
          ...s,
          meds: (s.meds ?? []).map((m) =>
            m.id === id ? { ...m, done: { ...m.done, [key]: !m.done[key] } } : m,
          ),
        })),
      toggleCheck: (key) =>
        setState((s) => ({ ...s, checks: { ...s.checks, [key]: !s.checks[key] } })),
      addExpense: (expense) =>
        setState((s) => ({
          ...s,
          expenses: [...(s.expenses ?? []), { ...expense, id: makeId() }],
        })),
      updateExpense: (id, expense) =>
        setState((s) => ({
          ...s,
          expenses: (s.expenses ?? []).map((e) => (e.id === id ? { ...expense, id } : e)),
        })),
      removeExpense: (id) =>
        setState((s) => ({ ...s, expenses: (s.expenses ?? []).filter((e) => e.id !== id) })),
      setOwner: (patch) => setState((s) => ({ ...s, owner: { ...s.owner, ...patch } })),
      notif,
      enableNotifications,
      signOut: async () => {
        if (family && user) {
          setState(
            partitionPetState(stateRef.current, otherMembersPetIds(family, user.id)).privateState,
          );
        }
        setFamily(null);
        await supabase.auth.signOut();
        remoteLoaded.current = null;
        lastPushed.current = "";
      },
      deleteAccount,
      recovery,
      clearRecovery,
      exportBackup,
      restoreBackup,
      online,
      family,
      createFamily,
      joinFamily,
      setPetShared,
      leaveFamily,
      removeMember,
      regenerateCode,
      refreshFamily,
    }),
    [
      state,
      ready,
      t,
      settings,
      user,
      addPet,
      updatePet,
      removePet,
      removeMemory,
      removeDocument,
      notif,
      enableNotifications,
      deleteAccount,
      recovery,
      clearRecovery,
      exportBackup,
      restoreBackup,
      online,
      family,
      createFamily,
      joinFamily,
      setPetShared,
      leaveFamily,
      removeMember,
      regenerateCode,
      refreshFamily,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export const SPECIES: Species[] = [
  "Suns",
  "Kaķis",
  "Trusis",
  "Putns",
  "Kāmis",
  "Jūrascūciņa",
  "Rāpuļi",
  "Zivtiņas",
];
export function speciesLabel(t: Dict, s: Species) {
  return {
    Suns: t.spDog,
    Kaķis: t.spCat,
    Trusis: t.spRabbit,
    Putns: t.spBird,
    Kāmis: t.spHamster,
    Jūrascūciņa: t.spGuineaPig,
    Rāpuļi: t.spReptile,
    Zivtiņas: t.spFish,
  }[s];
}
