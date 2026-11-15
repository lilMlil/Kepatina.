import type { Lang } from "./i18n";
import type { VaccineEntry } from "./health";
import type { Species } from "./reminders";

/**
 * General age-based vaccination guidance (WSAVA / common EU practice).
 * Doses are given as age in weeks; boosters repeat every `repeatMonths` after the last dose.
 * Not a prescription — the vet decides the exact plan.
 */
export interface ScheduleItem {
  id: string;
  vaccine: string;
  core: boolean;
  doses: number[];
  repeatMonths: number;
  keywords: string[];
  what: Record<Lang, string>;
}

export const VACCINE_SCHEDULE: Record<Species, ScheduleItem[]> = {
  Suns: [
    {
      id: "dhpp",
      vaccine: "DHPPi",
      core: true,
      doses: [8, 12, 16, 52],
      repeatMonths: 36,
      keywords: ["dhpp", "dhp", "mēris", "meris", "parvo", "distemper", "чумк", "парво"],
      what: {
        lv: "Mēris, parvoviroze, hepatīts, paragripa",
        en: "Distemper, parvovirus, hepatitis, parainfluenza",
        ru: "Чума, парвовироз, гепатит, парагрипп",
        fr: "Maladie de Carré, parvovirose, hépatite, parainfluenza",
      },
    },
    {
      id: "lepto",
      vaccine: "Leptospirosis",
      core: true,
      doses: [12, 16],
      repeatMonths: 12,
      keywords: ["lepto", "лепто"],
      what: {
        lv: "Leptospiroze — ik gadu",
        en: "Leptospirosis — yearly",
        ru: "Лептоспироз — ежегодно",
        fr: "Leptospirose — chaque année",
      },
    },
    {
      id: "rabies",
      vaccine: "Rabies",
      core: true,
      doses: [12],
      repeatMonths: 12,
      keywords: ["rabies", "trakumsērg", "trakumserg", "бешен", "rage"],
      what: {
        lv: "Trakumsērga — obligāta, intervāls pēc vakcīnas (1–3 g.)",
        en: "Rabies — required, interval per vaccine (1–3 y)",
        ru: "Бешенство — обязательно, интервал по вакцине (1–3 г.)",
        fr: "Rage — obligatoire, intervalle selon le vaccin (1–3 ans)",
      },
    },
    {
      id: "kc",
      vaccine: "Kennel cough (Bordetella)",
      core: false,
      doses: [8],
      repeatMonths: 12,
      keywords: ["kennel", "bordetella", "kc", "suņu klep", "питомник"],
      what: {
        lv: "Suņu klepus — ja suns satiekas ar citiem",
        en: "Kennel cough — if your dog meets other dogs",
        ru: "Питомниковый кашель — если собака общается с другими",
        fr: "Toux de chenil — si le chien côtoie d’autres chiens",
      },
    },
  ],
  Kaķis: [
    {
      id: "fvrcp",
      vaccine: "FVRCP",
      core: true,
      doses: [8, 12, 16, 52],
      repeatMonths: 36,
      keywords: ["fvrcp", "rcp", "panleik", "калици", "панлейк", "typhus"],
      what: {
        lv: "Panleikopēnija, herpesvīruss, kalicivīruss",
        en: "Panleukopenia, herpesvirus, calicivirus",
        ru: "Панлейкопения, герпесвирус, калицивирус",
        fr: "Typhus, herpèsvirus, calicivirus",
      },
    },
    {
      id: "rabies",
      vaccine: "Rabies",
      core: false,
      doses: [12],
      repeatMonths: 12,
      keywords: ["rabies", "trakumsērg", "trakumserg", "бешен", "rage"],
      what: {
        lv: "Trakumsērga — āra kaķiem un ceļošanai",
        en: "Rabies — outdoor cats and travel",
        ru: "Бешенство — для уличных кошек и поездок",
        fr: "Rage — chats d’extérieur et voyages",
      },
    },
    {
      id: "felv",
      vaccine: "FeLV",
      core: false,
      doses: [8, 12],
      repeatMonths: 12,
      keywords: ["felv", "leikoz", "лейкоз", "leucose"],
      what: {
        lv: "Leikoze — ja kaķis iet ārā",
        en: "Feline leukaemia — if your cat goes outside",
        ru: "Лейкоз — если кошка гуляет",
        fr: "Leucose — si le chat sort",
      },
    },
  ],
  Trusis: [
    {
      id: "myxo",
      vaccine: "Myxomatosis + RHD1/RHD2",
      core: true,
      doses: [5],
      repeatMonths: 12,
      keywords: ["myxo", "miksom", "rhd", "vhd", "миксом", "вгбк"],
      what: {
        lv: "Miksomatoze un hemorāģiskā slimība — ik gadu",
        en: "Myxomatosis and haemorrhagic disease — yearly",
        ru: "Миксоматоз и геморрагическая болезнь — ежегодно",
        fr: "Myxomatose et maladie hémorragique — chaque année",
      },
    },
  ],
  Putns: [],
  Kāmis: [],
  Jūrascūciņa: [],
  Rāpuļi: [],
  Zivtiņas: [],
};

export type PlanStatus = "done" | "overdue" | "soon" | "upcoming";
export interface PlanRow {
  itemId: string;
  vaccine: string;
  core: boolean;
  dose: number;
  booster: boolean;
  due: string; // YYYY-MM-DD
  doneOn?: string | undefined;
  status: PlanStatus;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const addMonths = (s: string, n: number) => {
  const d = parse(s);
  d.setMonth(d.getMonth() + n);
  return iso(d);
};

export function matchesItem(item: ScheduleItem, name: string) {
  const n = name.toLocaleLowerCase();
  return item.keywords.some((k) => n.includes(k));
}

/** Rows for every scheduled dose up to and including the next one still to do. */
export function vaccinationPlan(
  species: Species,
  birthDate: string | undefined,
  vaccines: VaccineEntry[],
  today: string,
  soonDays = 30,
): PlanRow[] {
  if (!birthDate || Number.isNaN(parse(birthDate).getTime())) return [];
  const soonLimit = addDays(today, soonDays);
  const status = (due: string, doneOn?: string): PlanStatus =>
    doneOn ? "done" : due < today ? "overdue" : due <= soonLimit ? "soon" : "upcoming";
  const rows: PlanRow[] = [];
  for (const item of VACCINE_SCHEDULE[species]) {
    const given = vaccines
      .filter((v) => matchesItem(item, v.name))
      .map((v) => v.date)
      .sort();
    let last = "";
    item.doses.forEach((w, i) => {
      const due = addDays(birthDate, w * 7);
      const doneOn = given[i];
      rows.push({
        itemId: item.id,
        vaccine: item.vaccine,
        core: item.core,
        dose: i + 1,
        booster: false,
        due,
        doneOn,
        status: status(due, doneOn),
      });
      last = doneOn ?? due;
    });
    // boosters: show all done ones, then exactly one pending
    for (let k = item.doses.length; k < item.doses.length + 50; k++) {
      const due = addMonths(last, item.repeatMonths);
      const doneOn = given[k];
      rows.push({
        itemId: item.id,
        vaccine: item.vaccine,
        core: item.core,
        dose: k + 1,
        booster: true,
        due,
        doneOn,
        status: status(due, doneOn),
      });
      if (!doneOn) break;
      last = doneOn;
    }
  }
  return rows.sort((a, b) => a.due.localeCompare(b.due));
}
