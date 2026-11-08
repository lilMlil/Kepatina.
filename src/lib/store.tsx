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
import {
  dueForNotification,
  nextDueDate,
  removePetFrom,
  type Pet,
  type Reminder,
  type Species,
} from "./reminders";

export type Theme = "light" | "dark";

interface Owner {
  name: string;
  photo: string | null;
  phone?: string;
}

interface SavedState {
  pets: Pet[];
  reminders: Reminder[];
  selectedPetId: string | null;
  owner: Owner;
  checks: Record<string, boolean>;
  weights: WeightEntry[];
  vaccines: VaccineEntry[];
  visits: VisitEntry[];
  meds: MedCourse[];
  expenses: Expense[];
}

interface Settings {
  theme: Theme;
  lang: Lang;
}

const STATE_KEY = "kepatina/state-v1";
const SETTINGS_KEY = "kepatina/settings-v1";
const SYNCED_KEY = "kepatina/synced-user";
const BEFORE_RESTORE_KEY = "kepatina/state-before-restore";
const emptyState: SavedState = {
  pets: [],
  reminders: [],
  selectedPetId: null,
  owner: { name: "", photo: null },
  checks: {},
  weights: [],
  vaccines: [],
  visits: [],
  meds: [],
  expenses: [],
};

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
  members: { userId: string; email: string | null }[];
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
  removePet: (id: string) => void;
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
  joinFamily: (code: string) => Promise<string | null>;
  leaveFamily: () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
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
  const [online, setOnline] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const storageWarned = useRef(false);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const lastPushed = useRef<string>("");
  const stateRef = useRef(state);
  stateRef.current = state;

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
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadFamily = useCallback(
    async (uid: string): Promise<{ info: FamilyInfo; data: Partial<SavedState> } | null> => {
      const { data: mem } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (!mem) return null;
      const [{ data: fam }, { data: members }] = await Promise.all([
        supabase
          .from("families")
          .select("id, invite_code, owner_id, data")
          .eq("id", mem.family_id)
          .maybeSingle(),
        supabase
          .from("family_members")
          .select("user_id, email")
          .eq("family_id", mem.family_id)
          .order("joined_at"),
      ]);
      if (!fam) return null;
      return {
        info: {
          id: fam.id,
          code: fam.invite_code,
          ownerId: fam.owner_id,
          members: (members ?? []).map((m) => ({ userId: m.user_id, email: m.email })),
        },
        data: (fam.data ?? {}) as Partial<SavedState>,
      };
    },
    [],
  );

  const hasContent = (d: Partial<SavedState> | undefined) =>
    !!(d && (d.pets?.length || d.reminders?.length || d.owner?.name || d.owner?.photo));

  // On sign-in (or reconnect): load family or personal cloud state, or upload local state if none exists
  useEffect(() => {
    if (!ready || !user || !online || remoteLoaded.current === user.id) return;
    let cancelled = false;
    (async () => {
      // Signed in here before? Then this phone already holds the synced copy and the cloud is newer.
      let knownDevice = false;
      try {
        knownDevice = localStorage.getItem(SYNCED_KEY) === user.id;
      } catch {
        /* ignore */
      }
      const fam = await loadFamily(user.id);
      if (cancelled) return;
      if (fam) {
        setFamily(fam.info);
        if (hasContent(fam.data)) {
          lastPushed.current = JSON.stringify(fam.data);
          setState(
            knownDevice ? { ...emptyState, ...fam.data } : mergeStates(stateRef.current, fam.data),
          );
        }
      } else {
        setFamily(null);
        const { data } = await supabase
          .from("user_state")
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle();
        const remote = data?.data as Partial<SavedState> | undefined;
        if (hasContent(remote))
          setState(knownDevice ? { ...emptyState, ...remote } : mergeStates(stateRef.current, remote));
        else
          await supabase
            .from("user_state")
            .upsert({ user_id: user.id, data: stateRef.current as never });
      }
      if (!cancelled) {
        remoteLoaded.current = user.id;
        try {
          localStorage.setItem(SYNCED_KEY, user.id);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, ready, online, loadFamily]);

  // Live updates from other family members
  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`family-${family.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "families", filter: `id=eq.${family.id}` },
        (payload) => {
          const data = (payload.new as { data?: Partial<SavedState> }).data;
          if (!data) return;
          const json = JSON.stringify(data);
          if (json === lastPushed.current) return;
          lastPushed.current = json;
          setState((cur) => ({
            ...emptyState,
            ...data,
            selectedPetId: data.pets?.some((p) => p.id === cur.selectedPetId)
              ? cur.selectedPetId
              : (data.selectedPetId ?? null),
          }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [family]);

  // Sync changes to cloud (debounced); waits while offline and resumes on reconnect
  useEffect(() => {
    if (!user || !online || remoteLoaded.current !== user.id) return;
    const h = setTimeout(() => {
      const json = JSON.stringify(state);
      if (family) {
        if (json === lastPushed.current) return;
        lastPushed.current = json;
        void supabase
          .from("families")
          .update({ data: state as never, updated_at: new Date().toISOString() })
          .eq("id", family.id);
      } else {
        void supabase
          .from("user_state")
          .upsert({ user_id: user.id, data: state as never, updated_at: new Date().toISOString() });
      }
    }, 800);
    return () => clearTimeout(h);
  }, [state, user, online, family]);

  const refreshFamily = useCallback(async () => {
    if (!user) return;
    const fam = await loadFamily(user.id);
    setFamily(fam?.info ?? null);
  }, [user, loadFamily]);

  const createFamily = useCallback(async () => {
    const { error } = await supabase.rpc("create_family", { initial: stateRef.current as never });
    if (error) return false;
    lastPushed.current = JSON.stringify(stateRef.current);
    await refreshFamily();
    return true;
  }, [refreshFamily]);

  const joinFamily = useCallback(
    async (code: string) => {
      const { error } = await supabase.rpc("join_family", { code });
      if (error) return error.message;
      if (user) {
        const fam = await loadFamily(user.id);
        if (fam) {
          setFamily(fam.info);
          lastPushed.current = JSON.stringify(fam.data);
          if (hasContent(fam.data)) setState({ ...emptyState, ...fam.data });
        }
      }
      return null;
    },
    [user, loadFamily],
  );

  const leaveFamily = useCallback(async () => {
    if (!user || !family) return;
    await supabase
      .from("family_members")
      .delete()
      .eq("family_id", family.id)
      .eq("user_id", user.id);
    setFamily(null);
    await supabase.from("user_state").upsert({
      user_id: user.id,
      data: stateRef.current as never,
      updated_at: new Date().toISOString(),
    });
  }, [user, family]);

  const removeMember = useCallback(
    async (userId: string) => {
      if (!family) return;
      await supabase
        .from("family_members")
        .delete()
        .eq("family_id", family.id)
        .eq("user_id", userId);
      await refreshFamily();
    },
    [family, refreshFamily],
  );

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
    try {
      localStorage.removeItem(SYNCED_KEY);
    } catch {
      /* ignore */
    }
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

  const removePet = useCallback((id: string) => {
    setState((s) => {
      const next = removePetFrom(s.pets, s.reminders, id);
      return {
        ...s,
        ...next,
        weights: removeHealthFor(s.weights, id),
        vaccines: removeHealthFor(s.vaccines, id),
        visits: removeHealthFor(s.visits, id),
        meds: (s.meds ?? []).filter((m) => m.petId !== id),
        expenses: (s.expenses ?? []).filter((e) => e.petId !== id),
        selectedPetId: s.selectedPetId === id ? (next.pets[0]?.id ?? null) : s.selectedPetId,
      };
    });
  }, []);

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
        setState((s) => ({ ...s, vaccines: s.vaccines.filter((v) => v.id !== id) })),
      addVisit: (v) => setState((s) => ({ ...s, visits: [...s.visits, { ...v, id: makeId() }] })),
      removeVisit: (id) => setState((s) => ({ ...s, visits: s.visits.filter((v) => v.id !== id) })),
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
        await supabase.auth.signOut();
        remoteLoaded.current = null;
        setFamily(null);
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
      leaveFamily,
      removeMember,
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
      leaveFamily,
      removeMember,
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

export const SPECIES: Species[] = ["Suns", "Kaķis", "Trusis", "Putns", "Kāmis"];
export function speciesLabel(t: Dict, s: Species) {
  return { Suns: t.spDog, Kaķis: t.spCat, Trusis: t.spRabbit, Putns: t.spBird, Kāmis: t.spHamster }[
    s
  ];
}
