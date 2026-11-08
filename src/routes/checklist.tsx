import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Info } from "lucide-react";
import { Card, PageHeading, SpeciesSelector } from "@/components/kit";
import { useApp } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import type { Species } from "@/lib/reminders";

export const Route = createFileRoute("/checklist")({
  component: ChecklistPage,
});

type Group = "before" | "week" | "month";
type Txt = Record<Lang, string>;
interface Item {
  id: string;
  group: Group;
  species?: Species[];
  to?: "/pets" | "/food" | "/symptoms" | "/reminder-new";
  text: Txt;
}

const items: Item[] = [
  // ---- common ----
  {
    id: "vet",
    group: "before",
    to: "/pets",
    text: {
      lv: "Atrodi veterinārārsta klīniku un saglabā tās tālruni mīluļa medicīnas kartē",
      en: "Find a vet clinic and save its phone number in your pet's medical card",
      ru: "Найдите ветклинику и сохраните её телефон в медицинской карте питомца",
      fr: "Trouvez une clinique vétérinaire et enregistrez son numéro dans la fiche santé de votre animal",
    },
  },
  {
    id: "safe",
    group: "before",
    to: "/food",
    text: {
      lv: "Paslēp no mīluļa indīgu pārtiku, zāles, ķimikālijas un vadus",
      en: "Keep toxic foods, medicines, cleaning products and cables out of reach",
      ru: "Уберите подальше ядовитые продукты, лекарства, бытовую химию и провода",
      fr: "Mettez hors de portée les aliments toxiques, médicaments, produits ménagers et câbles",
    },
  },
  {
    id: "food",
    group: "before",
    text: {
      lv: "Sagatavo barību, kas der mīluļa sugai un vecumam, un uzzini, ko tas ēda iepriekš",
      en: "Get food suited to your pet's species and age, and ask what it was eating before",
      ru: "Подготовьте корм, подходящий виду и возрасту питомца, и узнайте, чем его кормили раньше",
      fr: "Prévoyez une alimentation adaptée à l’espèce et à l’âge, et demandez ce qu’il mangeait avant",
    },
  },
  {
    id: "space",
    group: "before",
    text: {
      lv: "Iekārto mierīgu atpūtas vietu, ūdens un barības traukus",
      en: "Set up a quiet resting place plus water and food bowls",
      ru: "Подготовьте тихое место для отдыха, миски для воды и корма",
      fr: "Aménagez un coin calme pour se reposer, avec gamelles d’eau et de nourriture",
    },
  },
  {
    id: "checkup",
    group: "week",
    text: {
      lv: "Pierakstieties uz pirmo veterinārārsta apskati",
      en: "Book a first vet checkup",
      ru: "Запишитесь на первый осмотр у ветеринара",
      fr: "Prenez rendez-vous pour une première visite chez le vétérinaire",
    },
  },
  {
    id: "foodchange",
    group: "week",
    text: {
      lv: "Ja maini barību, dari to pakāpeniski vairāku dienu laikā",
      en: "If you change the food, do it gradually over several days",
      ru: "Если меняете корм, делайте это постепенно, в течение нескольких дней",
      fr: "Si vous changez d’aliment, faites-le progressivement sur plusieurs jours",
    },
  },
  {
    id: "routine",
    group: "week",
    text: {
      lv: "Izveido mierīgu barošanas un miega režīmu",
      en: "Set a calm feeding and sleeping routine",
      ru: "Наладьте спокойный режим кормления и сна",
      fr: "Instaurez des horaires calmes de repas et de sommeil",
    },
  },
  {
    id: "watch",
    group: "week",
    to: "/symptoms",
    text: {
      lv: "Vēro apetīti, ūdens dzeršanu un uzvedību; neparasto pieraksti",
      en: "Watch appetite, drinking and behaviour, and note anything unusual",
      ru: "Следите за аппетитом, питьём и поведением, записывайте необычное",
      fr: "Surveillez l’appétit, la prise d’eau et le comportement, et notez tout ce qui est inhabituel",
    },
  },
  {
    id: "remind",
    group: "month",
    to: "/reminder-new",
    text: {
      lv: "Saskaņo ar ārstu potēšanas un attārpošanas grafiku un uzstādi atgādnes",
      en: "Agree a vaccination and deworming schedule with your vet and set reminders",
      ru: "Согласуйте с ветеринаром график прививок и обработки от глистов и поставьте напоминания",
      fr: "Convenez d’un calendrier de vaccins et de vermifuge avec votre vétérinaire et créez des rappels",
    },
  },
  {
    id: "chip",
    group: "month",
    text: {
      lv: "Pajautā ārstam par mikročipu un reģistrāciju — prasības atšķiras pēc sugas un valsts",
      en: "Ask your vet about microchipping and registration — rules vary by species and country",
      ru: "Спросите у ветеринара про микрочип и регистрацию: требования зависят от вида и страны",
      fr: "Renseignez-vous auprès du vétérinaire sur la puce et l’enregistrement : les règles varient selon l’espèce et le pays",
    },
  },
  {
    id: "card",
    group: "month",
    to: "/pets",
    text: {
      lv: "Aizpildi medicīnas karti: dzimšanas datums, svars, alerģijas",
      en: "Fill in the medical card: birth date, weight, allergies",
      ru: "Заполните медкарту: дата рождения, вес, аллергии",
      fr: "Remplissez la fiche santé : date de naissance, poids, allergies",
    },
  },

  // ---- dog ----
  {
    id: "dog1",
    group: "before",
    species: ["Suns"],
    text: {
      lv: "Sagatavo iejūgu vai kaklasiksnu, pavadu un adreses medaljonu",
      en: "Get a harness or collar, a leash and an ID tag",
      ru: "Купите шлейку или ошейник, поводок и адресник",
      fr: "Procurez-vous un harnais ou un collier, une laisse et une médaille d’identification",
    },
  },
  {
    id: "dog2",
    group: "week",
    species: ["Suns"],
    text: {
      lv: "Ieved tualetes režīmu: bieži īsi iznākumi laukā un uzslavas par pareizu rīcību",
      en: "Start a toilet routine: frequent short outings, and praise success",
      ru: "Приучайте к туалету: частые короткие выходы и похвала за успехи",
      fr: "Instaurez la propreté : sorties courtes et fréquentes, et félicitez les réussites",
    },
  },
  {
    id: "dog3",
    group: "month",
    species: ["Suns"],
    text: {
      lv: "Pakāpeniski iepazīstini ar jauniem cilvēkiem, skaņām un citiem suņiem",
      en: "Gradually introduce new people, sounds and other dogs",
      ru: "Постепенно знакомьте с новыми людьми, звуками и другими собаками",
      fr: "Présentez progressivement de nouvelles personnes, des bruits et d’autres chiens",
    },
  },

  // ---- cat ----
  {
    id: "cat1",
    group: "before",
    species: ["Kaķis"],
    text: {
      lv: "Novieto kaķu tualeti mierīgā vietā, tālāk no barības",
      en: "Put the litter box in a quiet spot, away from food",
      ru: "Поставьте лоток в тихом месте, подальше от миски",
      fr: "Placez la litière dans un endroit calme, loin de la nourriture",
    },
  },
  {
    id: "cat2",
    group: "before",
    species: ["Kaķis"],
    text: {
      lv: "Nodrošini logus un balkonu ar tīkliem vai aizsargiem",
      en: "Secure windows and balconies with screens or guards",
      ru: "Защитите окна и балкон сетками",
      fr: "Sécurisez fenêtres et balcons avec des filets ou des protections",
    },
  },
  {
    id: "cat3",
    group: "week",
    species: ["Kaķis"],
    text: {
      lv: "Pieliec nagu asināmo, lai mēbeles paliek veselas",
      en: "Provide a scratching post",
      ru: "Поставьте когтеточку",
      fr: "Installez un griffoir",
    },
  },

  // ---- rabbit ----
  {
    id: "rab1",
    group: "before",
    species: ["Trusis"],
    text: {
      lv: "Nodrošini pastāvīgu piekļuvi sienam — tas ir uztura pamats",
      en: "Give constant access to hay — it should be the base of the diet",
      ru: "Обеспечьте постоянный доступ к сену — оно основа рациона",
      fr: "Assurez un accès permanent au foin, base de l’alimentation",
    },
  },
  {
    id: "rab2",
    group: "before",
    species: ["Trusis"],
    text: {
      lv: "Atrodi ārstu, kas labi pārzina trušus",
      en: "Find a vet experienced with rabbits",
      ru: "Найдите ветеринара, который разбирается в кроликах",
      fr: "Trouvez un vétérinaire qui connaît bien les lapins",
    },
  },
  {
    id: "rab3",
    group: "week",
    species: ["Trusis"],
    text: {
      lv: "Iekārto drošu vietu skriešanai un paslēp vadus",
      en: "Provide a safe space to run and hide cables",
      ru: "Обеспечьте безопасное место для бега и спрячьте провода",
      fr: "Prévoyez un espace sûr pour courir et cachez les câbles",
    },
  },

  // ---- bird ----
  {
    id: "bird1",
    group: "before",
    species: ["Putns"],
    text: {
      lv: "Izvēlies pietiekami lielu būri, tālāk no caurvēja un virtuves tvaikiem",
      en: "Choose a roomy cage away from draughts and kitchen fumes",
      ru: "Выберите просторную клетку вдали от сквозняков и кухонных паров",
      fr: "Choisissez une cage spacieuse, à l’abri des courants d’air et des vapeurs de cuisine",
    },
  },
  {
    id: "bird2",
    group: "before",
    species: ["Putns"],
    text: {
      lv: "Izvairies no pannām ar nelīpošo pārklājumu (PTFE) — to tvaiki putniem ir bīstami",
      en: "Avoid non-stick (PTFE) cookware — its fumes are dangerous to birds",
      ru: "Избегайте посуды с антипригарным покрытием (PTFE): её пары опасны для птиц",
      fr: "Évitez les ustensiles antiadhésifs (PTFE) : leurs vapeurs sont dangereuses pour les oiseaux",
    },
  },
  {
    id: "bird3",
    group: "week",
    species: ["Putns"],
    text: {
      lv: "Katru dienu nodrošini kontaktu un laiku ārpus būra drošā telpā",
      en: "Give daily interaction and out-of-cage time in a safe room",
      ru: "Ежедневно общайтесь и выпускайте из клетки в безопасной комнате",
      fr: "Offrez chaque jour de l’interaction et du temps hors de la cage dans une pièce sûre",
    },
  },
  {
    id: "bird4",
    group: "month",
    species: ["Putns"],
    text: {
      lv: "Atrodi ārstu, kas labi pārzina putnus",
      en: "Find a vet experienced with birds",
      ru: "Найдите ветеринара, который разбирается в птицах",
      fr: "Trouvez un vétérinaire qui connaît les oiseaux",
    },
  },

  // ---- hamster ----
  {
    id: "ham1",
    group: "before",
    species: ["Kāmis"],
    text: {
      lv: "Sagatavo plašu būri ar dziļu pakaišu kārtu, lai hamsters var rakt un slēpties",
      en: "Prepare a roomy cage with deep bedding so your hamster can burrow and hide",
      ru: "Подготовьте просторную клетку с глубоким слоем подстилки, чтобы хомяк мог рыть и прятаться",
      fr: "Préparez une grande cage avec une litière profonde pour que le hamster puisse creuser et se cacher",
    },
  },
  {
    id: "ham2",
    group: "before",
    species: ["Kāmis"],
    text: {
      lv: "Ieliec skriešanas riteni ar līdzenu virsmu (nevis režģi) — tas pasargā ķepas un muguru",
      en: "Add a running wheel with a solid surface (not bars) to protect paws and back",
      ru: "Поставьте беговое колесо со сплошной поверхностью (не решётка) — это бережёт лапки и спину",
      fr: "Ajoutez une roue à surface pleine (pas à barreaux) pour protéger les pattes et le dos",
    },
  },
  {
    id: "ham3",
    group: "before",
    species: ["Kāmis"],
    text: {
      lv: "Atrodi ārstu, kas labi pārzina grauzējus un eksotiskos dzīvniekus",
      en: "Find a vet experienced with rodents and exotic pets",
      ru: "Найдите ветеринара, который разбирается в грызунах и экзотических животных",
      fr: "Trouvez un vétérinaire qui connaît les rongeurs et les NAC",
    },
  },
  {
    id: "ham4",
    group: "week",
    species: ["Kāmis"],
    text: {
      lv: "Hamsteri ir aktīvi vakarā un naktī — dienā netraucē miegu un pirmajās dienās ņem rokās maz",
      en: "Hamsters are active in the evening and at night — don't wake them by day and handle them little at first",
      ru: "Хомяки активны вечером и ночью — не будите днём и первые дни берите на руки поменьше",
      fr: "Les hamsters sont actifs le soir et la nuit — ne les réveillez pas le jour et manipulez-les peu au début",
    },
  },
  {
    id: "ham5",
    group: "month",
    species: ["Kāmis"],
    text: {
      lv: "Sīrijas hamsterus tur pa vienam — kopā būrī tie var cīnīties",
      en: "Keep Syrian hamsters alone — they can fight when housed together",
      ru: "Сирийских хомяков держите по одному — вместе в клетке они могут драться",
      fr: "Gardez les hamsters syriens seuls — ils peuvent se battre s’ils cohabitent",
    },
  },
];

const ui: Record<
  Lang,
  {
    title: string;
    sub: string;
    groups: Record<Group, string>;
    done: string;
    open: string;
    note: string;
  }
> = {
  lv: {
    title: "Jaunā mīluļa kontrolsaraksts",
    sub: "Soli pa solim: ko sagatavot un ko nedarīt aizmirstot.",
    groups: { before: "Pirms mīluli ved mājās", week: "Pirmā nedēļa", month: "Pirmais mēnesis" },
    done: "izpildīts",
    open: "Atvērt",
    note: "Vispārīgi ieteikumi. Konkrētus jautājumus par mīluļa veselību pārrunā ar veterinārārstu.",
  },
  en: {
    title: "New pet checklist",
    sub: "Step by step: what to prepare and not forget.",
    groups: { before: "Before you bring them home", week: "First week", month: "First month" },
    done: "done",
    open: "Open",
    note: "General guidance. Talk to your vet about anything specific to your pet's health.",
  },
  ru: {
    title: "Чек-лист для нового питомца",
    sub: "Шаг за шагом: что подготовить и не забыть.",
    groups: { before: "До того, как принести домой", week: "Первая неделя", month: "Первый месяц" },
    done: "выполнено",
    open: "Открыть",
    note: "Общие рекомендации. По вопросам здоровья конкретного питомца обращайтесь к ветеринару.",
  },
  fr: {
    title: "Check-list du nouvel animal",
    sub: "Pas à pas : ce qu’il faut préparer et ne pas oublier.",
    groups: {
      before: "Avant de le ramener à la maison",
      week: "Première semaine",
      month: "Premier mois",
    },
    done: "fait",
    open: "Ouvrir",
    note: "Conseils généraux. Pour toute question de santé, parlez-en à votre vétérinaire.",
  },
};

function ChecklistPage() {
  const { settings, selectedPet, checks, toggleCheck } = useApp();
  const u = ui[settings.lang];
  const [picked, setSpecies] = useState<Species | null>(null);
  const species: Species = picked ?? selectedPet?.species ?? "Suns";
  const owner = selectedPet && selectedPet.species === species ? selectedPet.id : species;

  const list = items.filter((i) => !i.species || i.species.includes(species));
  const keyOf = (id: string) => `${owner}:${id}`;
  const doneCount = list.filter((i) => checks[keyOf(i.id)]).length;
  const pct = Math.round((doneCount / list.length) * 100);

  return (
    <>
      <PageHeading back="/" title={u.title} subtitle={u.sub} />
      <SpeciesSelector value={species} onChange={setSpecies} />

      <Card className="space-y-2">
        <p className="text-sm font-bold">
          {doneCount} / {list.length} {u.done}
          {selectedPet && owner === selectedPet.id ? ` · ${selectedPet.name}` : ""}
        </p>
        <div
          role="progressbar"
          aria-label={u.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${doneCount} / ${list.length} ${u.done}`}
          className="h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {(["before", "week", "month"] as Group[]).map((g) => {
        const rows = list.filter((i) => i.group === g);
        if (!rows.length) return null;
        return (
          <section key={g} aria-labelledby={`group-${g}`} className="space-y-2">
            <h2 id={`group-${g}`} className="text-lg font-semibold">
              {u.groups[g]}
            </h2>
            {rows.map((i) => {
              const checked = !!checks[keyOf(i.id)];
              return (
                <Card key={i.id} className="space-y-2 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCheck(keyOf(i.id))}
                    role="checkbox"
                    aria-checked={checked}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    {checked ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`text-sm font-semibold ${checked ? "text-muted-foreground line-through" : ""}`}
                    >
                      {i.text[settings.lang]}
                    </span>
                  </button>
                  {i.to && (
                    <Link
                      to={i.to}
                      aria-label={`${u.open}: ${i.text[settings.lang]}`}
                      className="ml-8 inline-flex min-h-11 items-center text-sm font-bold text-primary"
                    >
                      {u.open} <span aria-hidden="true">&nbsp;→</span>
                    </Link>
                  )}
                </Card>
              );
            })}
          </section>
        );
      })}

      <div className="flex gap-2 text-xs font-semibold text-warn">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" /> {u.note}
      </div>
    </>
  );
}
