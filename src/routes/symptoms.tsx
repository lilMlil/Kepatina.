import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  Hand,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import { Card, PageHeading, SpeciesSelector } from "@/components/kit";
import { speciesLabel, useApp } from "@/lib/store";
import { getPosition } from "@/lib/native/platform";
import type { Lang } from "@/lib/i18n";
import type { Species } from "@/lib/reminders";

export const Route = createFileRoute("/symptoms")({
  component: SymptomsPage,
});

type Risk = "red" | "yellow" | "green";
const symptoms: {
  id: string;
  risk: Risk;
  only?: Species[];
  /** Species this symptom does not apply to. */
  not?: Species[];
  lv: [string, string];
  en: [string, string];
  ru: [string, string];
  fr: [string, string];
}[] = [
  {
    id: "breathing",
    risk: "red",
    not: ["Zivtiņas"],
    lv: ["Apgrūtināta elpošana", "Apgrūtināta elpošana, smakšana vai zilgana mēle."],
    en: ["Difficulty breathing", "Laboured breathing, choking or a bluish tongue."],
    ru: ["Затруднённое дыхание", "Дышит с усилием, задыхается или язык синеватый."],
    fr: ["Difficulté à respirer", "Respiration laborieuse, étouffement ou langue bleutée."],
  },
  {
    id: "collapse",
    risk: "red",
    not: ["Zivtiņas"],
    lv: ["Kolapss vai bezsamaņa", "Mīlulis nereaģē vai nespēj nostāvēt."],
    en: ["Collapse or unconsciousness", "Not responding or unable to stand."],
    ru: ["Коллапс или потеря сознания", "Не реагирует или не может стоять."],
    fr: ["Effondrement ou perte de connaissance", "Ne réagit pas ou ne peut pas tenir debout."],
  },
  {
    id: "seizure",
    risk: "red",
    lv: ["Krampji", "Lēkme, trīce vai pēkšņs koordinācijas zudums."],
    en: ["Seizures", "Fits, tremors or sudden loss of coordination."],
    ru: ["Судороги", "Приступы, дрожь или внезапная потеря координации."],
    fr: ["Convulsions", "Crises, tremblements ou perte soudaine de coordination."],
  },
  {
    id: "poison",
    risk: "red",
    lv: ["Iespējama saindēšanās", "Apēsts vai nolaizīts indīgs produkts vai viela."],
    en: ["Possible poisoning", "Ate or licked a toxic food or substance."],
    ru: ["Возможное отравление", "Съел или слизал ядовитый продукт или вещество."],
    fr: ["Intoxication possible", "A mangé ou léché un aliment ou une substance toxique."],
  },
  {
    id: "bleeding",
    risk: "red",
    lv: ["Spēcīga asiņošana", "Asiņošana neapstājas vai ir nopietna trauma."],
    en: ["Heavy bleeding", "Bleeding won't stop or there's a serious injury."],
    ru: ["Сильное кровотечение", "Кровотечение не останавливается или есть серьёзная травма."],
    fr: ["Saignement important", "Le saignement ne s’arrête pas ou il y a une blessure grave."],
  },
  {
    id: "vomiting",
    risk: "yellow",
    not: ["Zivtiņas"],
    lv: ["Atkārtota vemšana vai caureja", "Atkārtojas, ir asinis vai mīlulis kļūst vājš."],
    en: [
      "Repeated vomiting or diarrhoea",
      "Vomiting or diarrhoea recurs, blood is present or your pet is becoming weak.",
    ],
    ru: ["Повторная рвота или диарея", "Повторяется, есть кровь или питомец слабеет."],
    fr: [
      "Vomissements ou diarrhée répétés",
      "Les vomissements ou la diarrhée se répètent, du sang est présent ou l’animal s’affaiblit.",
    ],
  },
  {
    id: "lethargy",
    risk: "yellow",
    lv: ["Apātija vai izteikts vājums", "Uzvedas neierasti vai atsakās no aktivitātēm."],
    en: ["Lethargy or marked weakness", "Acting unusually or refusing usual activities."],
    ru: [
      "Апатия или выраженная слабость",
      "Ведёт себя необычно или отказывается от обычной активности.",
    ],
    fr: [
      "Léthargie ou faiblesse marquée",
      "Comportement inhabituel ou refus des activités habituelles.",
    ],
  },
  {
    id: "pain",
    risk: "yellow",
    lv: ["Sāpes vai neparasta uzvedība", "Sāpīga vieta, slēpšanās, vaidēšana vai agresija."],
    en: ["Pain or unusual behaviour", "Sore spot, hiding, whimpering or aggression."],
    ru: [
      "Боль или необычное поведение",
      "Болезненное место, прячется, скулит или проявляет агрессию.",
    ],
    fr: [
      "Douleur ou comportement inhabituel",
      "Zone douloureuse, se cache, gémit ou devient agressif.",
    ],
  },
  {
    id: "sneeze",
    risk: "green",
    not: ["Zivtiņas"],
    lv: ["Viena viegla šķaudīšana", "Citādi aktīvs, elpo normāli un ēd kā parasti."],
    en: ["A single mild sneeze", "Otherwise active, breathing and eating normally."],
    ru: ["Однократное лёгкое чихание", "В остальном активен, нормально дышит и ест."],
    fr: ["Un seul éternuement léger", "Sinon actif, respire et mange normalement."],
  },
  {
    id: "trauma",
    risk: "red",
    lv: [
      "Trauma, kritiens vai sitiens no auto",
      "Pat ja mīlulis izskatās normāli, iekšēji bojājumi var būt nopietni.",
    ],
    en: [
      "Injury, fall or hit by a car",
      "Even if your pet looks fine, internal injuries can be serious.",
    ],
    ru: [
      "Травма, падение или удар машиной",
      "Даже если питомец выглядит нормально, внутренние повреждения могут быть серьёзными.",
    ],
    fr: [
      "Blessure, chute ou choc avec une voiture",
      "Même si l’animal semble aller bien, des lésions internes peuvent être graves.",
    ],
  },
  {
    id: "heatstroke",
    risk: "red",
    not: ["Zivtiņas"],
    lv: ["Pārkaršana", "Spēcīgi elš, siekalojas, vājš vai ir bijis karstumā vai aizvērtā auto."],
    en: [
      "Overheating (heatstroke)",
      "Heavy panting, drooling or weakness after heat or a closed car.",
    ],
    ru: [
      "Перегрев (тепловой удар)",
      "Тяжело дышит, слюни, слабость после жары или закрытой машины.",
    ],
    fr: [
      "Coup de chaleur",
      "Halètement intense, bave ou faiblesse après la chaleur ou une voiture fermée.",
    ],
  },
  {
    id: "bloat",
    risk: "red",
    only: ["Suns"],
    lv: [
      "Uzpūsts, ciets vēders",
      "Mēģina vemt bez rezultāta, ir nemierīgs, vēders pietūcis. Īpaši bīstami lielajiem suņiem.",
    ],
    en: [
      "Swollen, hard belly",
      "Retching without bringing anything up, restless, belly swollen. Especially dangerous in big dogs.",
    ],
    ru: [
      "Вздутый твёрдый живот",
      "Рвотные позывы без рвоты, беспокойство, живот вздут. Особенно опасно у крупных собак.",
    ],
    fr: [
      "Ventre gonflé et dur",
      "Haut-le-cœur sans vomir, agitation, ventre gonflé. Surtout dangereux chez les grands chiens.",
    ],
  },
  {
    id: "snake",
    risk: "red",
    only: ["Suns", "Kaķis"],
    lv: [
      "Čūskas kodiens",
      "Iespējams odzes kodiens: pietūkums, sāpes, vājums. Turi mīluli mierā un nesaudzē laiku.",
    ],
    en: [
      "Snake bite",
      "Possible adder bite: swelling, pain, weakness. Keep your pet calm and move fast.",
    ],
    ru: [
      "Укус змеи",
      "Возможен укус гадюки: отёк, боль, слабость. Держите питомца в покое и не теряйте время.",
    ],
    fr: [
      "Morsure de serpent",
      "Morsure de vipère possible : gonflement, douleur, faiblesse. Gardez l’animal calme et agissez vite.",
    ],
  },
  {
    id: "urine_block",
    risk: "red",
    only: ["Kaķis"],
    lv: [
      "Kaķis nevar nourinēt",
      "Sēž kastē, spiežas, urīna nav vai ļoti maz, kauc. Īpaši bīstami runčiem.",
    ],
    en: [
      "Cat cannot pass urine",
      "Strains in the litter box, little or no urine, crying out. Especially dangerous in male cats.",
    ],
    ru: [
      "Кот не может помочиться",
      "Сидит в лотке, тужится, мочи нет или очень мало, кричит. Особенно опасно для котов-самцов.",
    ],
    fr: [
      "Le chat n’arrive pas à uriner",
      "Force dans la litière, peu ou pas d’urine, miaule. Surtout dangereux chez les mâles.",
    ],
  },
  {
    id: "rabbit_gut",
    risk: "red",
    only: ["Trusis"],
    lv: [
      "Trusis neēd un nekaka",
      "Neēd ilgāk par 8–12 stundām, nav izkārnījumu, vēders pietūcis, sēž saspiedies.",
    ],
    en: [
      "Rabbit not eating or pooping",
      "Not eating for over 8–12 hours, no droppings, bloated belly, hunched posture.",
    ],
    ru: [
      "Кролик не ест и нет помёта",
      "Не ест дольше 8–12 часов, нет помёта, вздутый живот, сидит сжавшись.",
    ],
    fr: [
      "Lapin qui ne mange plus et ne crotte plus",
      "Ne mange pas depuis plus de 8–12 h, pas de crottes, ventre gonflé, posture recroquevillée.",
    ],
  },
  {
    id: "small_stop",
    risk: "red",
    only: ["Kāmis"],
    lv: [
      "Kāmis neēd, ir auksts vai nekustīgs",
      "Nekustīgs, auksts uz tausti, neēd vai neatbild uz pieskārienu.",
    ],
    en: [
      "Hamster not eating, cold or limp",
      "Barely moving, cold to the touch, not eating or not reacting to touch.",
    ],
    ru: [
      "Хомяк не ест, холодный или вялый",
      "Почти не двигается, холодный на ощупь, не ест или не реагирует на прикосновение.",
    ],
    fr: [
      "Hamster qui ne mange pas, froid ou apathique",
      "Bouge à peine, froid au toucher, ne mange pas ou ne réagit pas au toucher.",
    ],
  },
  {
    id: "bird_fluffed",
    risk: "red",
    only: ["Putns"],
    lv: [
      "Putns pūkojas un sēž uz grīdas",
      "Sēž pūkains, aizvērtām acīm, elpo ar asti, nevar noturēties uz kārts.",
    ],
    en: [
      "Bird fluffed up and sitting on the floor",
      "Fluffed up, eyes closed, tail bobbing with each breath, cannot perch.",
    ],
    ru: [
      "Птица нахохлилась и сидит на дне клетки",
      "Взъерошена, глаза закрыты, хвост дёргается при дыхании, не держится на жёрдочке.",
    ],
    fr: [
      "Oiseau gonflé qui reste au fond de la cage",
      "Plumes gonflées, yeux fermés, queue qui bat à chaque respiration, ne tient pas sur le perchoir.",
    ],
  },
  {
    id: "gp_gut",
    risk: "red",
    only: ["Jūrascūciņa"],
    lv: [
      "Jūrascūciņa neēd un nekaka",
      "Neēd ilgāk par 12 stundām, nav izkārnījumu, vēders pietūcis, sēž saspiedusies un klusē. Jūrascūciņām tas var kļūt bīstami ātri.",
    ],
    en: [
      "Guinea pig not eating or pooping",
      "Not eating for over 12 hours, no droppings, bloated belly, sitting hunched and quiet. This can become dangerous quickly in guinea pigs.",
    ],
    ru: [
      "Морская свинка не ест и нет помёта",
      "Не ест дольше 12 часов, нет помёта, вздутый живот, сидит сжавшись и затихла. У морских свинок это быстро становится опасным.",
    ],
    fr: [
      "Cochon d’Inde qui ne mange plus et ne crotte plus",
      "Ne mange pas depuis plus de 12 h, pas de crottes, ventre gonflé, posture recroquevillée et silencieuse. Cela peut vite devenir dangereux chez le cochon d’Inde.",
    ],
  },
  {
    id: "gp_vitc",
    risk: "yellow",
    only: ["Jūrascūciņa"],
    lv: [
      "Neveikli kustas, sāp locītavas, grūti ēst",
      "Negrib kustēties, ķepas vai locītavas sāp, apmatojums raupjš, smaganas asiņo vai ēd negribīgi. Iespējams C vitamīna trūkums.",
    ],
    en: [
      "Reluctant to move, sore joints, trouble eating",
      "Does not want to move, painful paws or joints, rough coat, bleeding gums or eating reluctantly. Vitamin C deficiency is possible.",
    ],
    ru: [
      "Неохотно двигается, болят суставы, трудно есть",
      "Не хочет двигаться, болят лапки или суставы, шерсть взъерошена, дёсны кровоточат или ест неохотно. Возможна нехватка витамина C.",
    ],
    fr: [
      "Se déplace difficilement, articulations douloureuses, mange mal",
      "Ne veut pas bouger, pattes ou articulations douloureuses, poil terne, gencives qui saignent ou mange avec réticence. Une carence en vitamine C est possible.",
    ],
  },
  {
    id: "gp_teeth",
    risk: "yellow",
    only: ["Jūrascūciņa"],
    lv: [
      "Siekalojas, met barību laukā vai krīt svarā",
      "Siekalojas, ēdot met barību laukā, izvēlas tikai mīkstu barību vai zaudē svaru. Iespējamas zobu problēmas.",
    ],
    en: [
      "Drooling, dropping food or losing weight",
      "Drools, drops food while eating, only chooses soft food or loses weight. Dental problems are possible.",
    ],
    ru: [
      "Слюнотечение, роняет корм или худеет",
      "Слюни, роняет корм при еде, выбирает только мягкую еду или теряет вес. Возможны проблемы с зубами.",
    ],
    fr: [
      "Salivation, laisse tomber la nourriture ou maigrit",
      "Bave, laisse tomber la nourriture en mangeant, ne choisit que du mou ou perd du poids. Des problèmes dentaires sont possibles.",
    ],
  },
  {
    id: "rep_breath",
    risk: "red",
    only: ["Rāpuļi"],
    lv: [
      "Elpo ar atvērtu muti vai burbuļi pie deguna",
      "Elpo ar atvērtu muti, sēc, deguna vai mutes izdalījumi, burbuļi, slinks un neēd. Iespējama elpceļu infekcija.",
    ],
    en: [
      "Open-mouth breathing or bubbles at the nose",
      "Breathes with an open mouth, wheezing, nasal or mouth discharge, bubbles, lethargic and not eating. A respiratory infection is possible.",
    ],
    ru: [
      "Дышит с открытым ртом или пузыри у носа",
      "Дышит с открытым ртом, хрипы, выделения из носа или рта, пузыри, вялая и не ест. Возможна инфекция дыхательных путей.",
    ],
    fr: [
      "Respire la bouche ouverte ou bulles au nez",
      "Respire la bouche ouverte, sifflements, écoulements nasaux ou buccaux, bulles, apathique et ne mange pas. Une infection respiratoire est possible.",
    ],
  },
  {
    id: "rep_bones",
    risk: "yellow",
    only: ["Rāpuļi"],
    lv: [
      "Trīce, mīksti kauli vai grūti kustēties",
      "Trīc ķepas vai kakls, žoklis vai kauli šķiet mīksti, ķepas ir izliektas, dzīvnieks velk ķermeni. Iespējams kalcija vai D vitamīna/UV trūkums.",
    ],
    en: [
      "Tremors, soft bones or trouble moving",
      "Twitching legs or neck, jaw or bones feel soft, bent limbs, dragging the body. Calcium or vitamin D/UV deficiency is possible.",
    ],
    ru: [
      "Дрожь, мягкие кости или трудно двигаться",
      "Дрожат лапы или шея, челюсть или кости мягкие, лапы искривлены, волочит тело. Возможна нехватка кальция или витамина D/УФ.",
    ],
    fr: [
      "Tremblements, os mous ou difficulté à bouger",
      "Pattes ou cou qui tremblent, mâchoire ou os mous, membres tordus, corps traîné. Une carence en calcium ou en vitamine D/UV est possible.",
    ],
  },
  {
    id: "rep_shed",
    risk: "yellow",
    only: ["Rāpuļi"],
    lv: [
      "Āda nenolobījusies pilnībā",
      "Vecā āda paliek uz pirkstiem, astes gala vai ap acīm. Pārbaudi mitrumu un konsultējies ar veterinārārstu; neplēs ādu ar spēku.",
    ],
    en: [
      "Incomplete shedding",
      "Old skin stays on toes, the tail tip or around the eyes. Check humidity and ask your vet; do not pull skin off by force.",
    ],
    ru: [
      "Неполная линька",
      "Старая кожа остаётся на пальцах, кончике хвоста или вокруг глаз. Проверьте влажность и посоветуйтесь с ветеринаром; не срывайте кожу силой.",
    ],
    fr: [
      "Mue incomplète",
      "L’ancienne peau reste sur les doigts, le bout de la queue ou autour des yeux. Vérifiez l’humidité et consultez le vétérinaire ; n’arrachez pas la peau de force.",
    ],
  },
  {
    id: "fish_gasp",
    risk: "red",
    only: ["Zivtiņas"],
    lv: [
      "Zivis elpo pie virsmas",
      "Zivis gaida pie ūdens virsmas, ātri kustina žaunas vai guļ uz dibena. Pārbaudi skābekli, ūdens temperatūru un amonjaku; nekavējoties daļēji nomaini ūdeni.",
    ],
    en: [
      "Fish gasping at the surface",
      "Fish hang at the surface, breathe fast or lie on the bottom. Check oxygen, water temperature and ammonia; do a partial water change straight away.",
    ],
    ru: [
      "Рыбы дышат у поверхности",
      "Рыбы держатся у поверхности, часто дышат или лежат на дне. Проверьте кислород, температуру воды и аммиак; сразу замените часть воды.",
    ],
    fr: [
      "Poissons qui haletent en surface",
      "Les poissons restent en surface, respirent vite ou gisent au fond. Vérifiez l’oxygène, la température et l’ammoniaque ; changez aussitôt une partie de l’eau.",
    ],
  },
  {
    id: "fish_spots",
    risk: "yellow",
    only: ["Zivtiņas"],
    lv: [
      "Baltas pūtītes, saspiestas spuras vai plēve",
      "Uz ķermeņa baltas pūtītes vai plēve, spuras saspiestas, zivs berzējas pret dekoriem vai neēd. Atdali slimo zivi un konsultējies ar speciālistu.",
    ],
    en: [
      "White spots, clamped fins or a film",
      "White spots or a film on the body, clamped fins, rubbing against decor or not eating. Isolate the sick fish and ask a specialist.",
    ],
    ru: [
      "Белые точки, прижатые плавники или налёт",
      "Белые точки или налёт на теле, плавники прижаты, трётся о декор или не ест. Отсадите больную рыбу и посоветуйтесь со специалистом.",
    ],
    fr: [
      "Points blancs, nageoires collées ou voile",
      "Points blancs ou voile sur le corps, nageoires collées, se frotte au décor ou ne mange pas. Isolez le poisson malade et demandez conseil à un spécialiste.",
    ],
  },
  {
    id: "fish_float",
    risk: "yellow",
    only: ["Zivtiņas"],
    lv: [
      "Zivs peld sāniski, otrādi vai nespēj noturēt dziļumu",
      "Peld uz sāniem, ar vēderu uz augšu vai nevar noturēt dziļumu. Pārbaudi ūdeni, temperatūru un barošanu; ja nepāriet, jautā speciālistam.",
    ],
    en: [
      "Fish swimming sideways, upside down or unable to hold depth",
      "Swims on its side, belly up or cannot hold its depth. Check the water, temperature and feeding; ask a specialist if it persists.",
    ],
    ru: [
      "Рыба плавает боком, вверх брюхом или не держит глубину",
      "Плавает на боку, брюхом вверх или не может удерживать глубину. Проверьте воду, температуру и кормление; если не проходит, обратитесь к специалисту.",
    ],
    fr: [
      "Poisson qui nage sur le côté, ventre en l’air ou ne tient pas sa profondeur",
      "Nage sur le côté, ventre en l’air ou ne tient pas sa profondeur. Vérifiez l’eau, la température et l’alimentation ; consultez un spécialiste si cela persiste.",
    ],
  },
  {
    id: "eye",
    risk: "yellow",
    lv: [
      "Acs: sarkana, apmākusies vai aizvērta",
      "Mīlulis žņaudzas, acs asaro, ir izdalījumi vai acs izskatās citādi.",
    ],
    en: [
      "Eye problem: red, cloudy or kept shut",
      "Squinting, watery eye, discharge, or the eye looks different.",
    ],
    ru: [
      "Глаз: красный, мутный или закрыт",
      "Щурится, слезится, есть выделения или глаз выглядит иначе.",
    ],
    fr: ["Œil rouge, trouble ou fermé", "Cligne, larmoie, écoulement ou l’œil paraît différent."],
  },
  {
    id: "limp",
    risk: "yellow",
    not: ["Zivtiņas"],
    lv: ["Klibo vai nevar uzkāpt uz ķepas", "Sargā ķepu, nelec, ir pietūkums vai sāpīga vieta."],
    en: [
      "Limping or not putting weight on a paw",
      "Guarding a paw, not jumping, swelling or a sore spot.",
    ],
    ru: [
      "Хромает или не наступает на лапу",
      "Бережёт лапу, не прыгает, есть отёк или болезненное место.",
    ],
    fr: [
      "Boite ou n’appuie pas sur une patte",
      "Protège sa patte, ne saute plus, gonflement ou zone douloureuse.",
    ],
  },
  {
    id: "not_eating",
    risk: "yellow",
    only: ["Suns", "Kaķis"],
    lv: [
      "Neēd vairāk par dienu",
      "Atsakās no barības, bet citādi vēl kustas. Kaķiem pat 24 stundas bez ēšanas ir nopietni.",
    ],
    en: [
      "Not eating for over a day",
      "Refusing food but otherwise still moving. In cats even 24 hours without food is serious.",
    ],
    ru: [
      "Не ест больше суток",
      "Отказывается от еды, но ещё двигается. У кошек даже 24 часа без еды — это серьёзно.",
    ],
    fr: [
      "Ne mange plus depuis plus d’un jour",
      "Refuse la nourriture mais bouge encore. Chez le chat, 24 h sans manger est déjà sérieux.",
    ],
  },
  {
    id: "thirst",
    risk: "yellow",
    only: ["Suns", "Kaķis"],
    lv: [
      "Daudz vairāk dzer un urinē",
      "Ūdens trauks tukšs ātrāk nekā parasti, biežāki “negadījumi”.",
    ],
    en: [
      "Drinking and urinating much more",
      "The water bowl empties faster than usual, more frequent accidents.",
    ],
    ru: ["Много пьёт и мочится", "Миска с водой пустеет быстрее обычного, чаще «лужи»."],
    fr: [
      "Boit et urine beaucoup plus",
      "La gamelle se vide plus vite, plus d’accidents de propreté.",
    ],
  },
  {
    id: "ear",
    risk: "yellow",
    only: ["Suns", "Kaķis", "Trusis", "Jūrascūciņa"],
    lv: ["Kratīta galva vai skrāpē ausis", "Ausis smird, ir tumši izdalījumi vai sarkanums."],
    en: ["Shaking head or scratching ears", "Smelly ears, dark discharge or redness."],
    ru: ["Трясёт головой или чешет уши", "Уши пахнут, тёмные выделения или покраснение."],
    fr: [
      "Secoue la tête ou se gratte les oreilles",
      "Oreilles malodorantes, écoulement foncé ou rougeur.",
    ],
  },
  {
    id: "tick",
    risk: "yellow",
    only: ["Suns", "Kaķis"],
    lv: [
      "Ērce piesūkusies",
      "Atrasta ērce uz ādas. Vēro, vai nepaceļas temperatūra, nekļūst vājš vai urīns nekļūst tumšs.",
    ],
    en: ["Tick attached", "A tick found on the skin. Watch for fever, weakness or dark urine."],
    ru: [
      "Присосался клещ",
      "Клещ найден на коже. Следите за температурой, слабостью и тёмной мочой.",
    ],
    fr: [
      "Tique accrochée",
      "Tique trouvée sur la peau. Surveillez fièvre, faiblesse ou urine foncée.",
    ],
  },
  {
    id: "skin",
    risk: "yellow",
    not: ["Zivtiņas", "Rāpuļi"],
    lv: ["Niez āda vai izkrīt spalva", "Pastāvīga skrāpēšanās, kailas vietas, krepes vai blaktis."],
    en: ["Itchy skin or hair loss", "Constant scratching, bald patches, scabs or fleas."],
    ru: ["Зуд кожи или выпадение шерсти", "Постоянно чешется, лысые пятна, корочки или блохи."],
    fr: ["Démangeaisons ou perte de poils", "Grattage constant, zones nues, croûtes ou puces."],
  },
  {
    id: "soft_stool",
    risk: "green",
    not: ["Zivtiņas"],
    lv: ["Vienreizēji mīksti izkārnījumi", "Citādi mīlulis ir mundrs, ēd un dzer kā parasti."],
    en: ["A single soft stool", "Otherwise your pet is bright and eating and drinking normally."],
    ru: ["Единичный мягкий стул", "В остальном питомец бодр, ест и пьёт как обычно."],
    fr: ["Une seule selle molle", "Sinon l’animal est vif et mange et boit normalement."],
  },
  {
    id: "hairball",
    risk: "green",
    only: ["Kaķis"],
    lv: [
      "Reizēm izvemj spalvu kamolu",
      "Kaķis reizēm izvemj spalvu kamoliņu un tūlīt atkal ir normāls.",
    ],
    en: [
      "Occasional hairball",
      "A cat sometimes coughs up a hairball and is quickly back to normal.",
    ],
    ru: [
      "Изредка отрыгивает комок шерсти",
      "Кошка иногда отрыгивает комок шерсти и сразу приходит в норму.",
    ],
    fr: [
      "Boule de poils occasionnelle",
      "Le chat tousse parfois une boule de poils puis redevient vite normal.",
    ],
  },
];

const riskCopy: Record<Lang, Record<Risk, [string, string]>> = {
  lv: {
    red: [
      "Steidzami meklē veterināro palīdzību",
      "Zvani tuvākajai dežūrklīnikai vai dodies turp tagad. Turi mīluli mierā, nedod cilvēku zāles un neizraisi vemšanu. Ja iespējams, paņem līdzi vielas iepakojumu.",
    ],
    yellow: [
      "Sazinies ar veterinārārstu šodien",
      "Piezvani ārstam un apraksti, kad pazīme sākās un vai tā atkārtojas. Ja stāvoklis pasliktinās, dodies uz klīniku nekavējoties.",
    ],
    green: [
      "Vari mierīgi novērot mājās",
      "Atstāj tīru ūdeni un vēro pašsajūtu. Ja pazīme atkārtojas vai nepāriet 24 stundās, sazinies ar ārstu.",
    ],
  },
  en: {
    red: [
      "Seek emergency vet care now",
      "Call the nearest emergency clinic or go there now. Keep your pet calm, don't give human medicine and don't induce vomiting. Bring the substance's packaging if you can.",
    ],
    yellow: [
      "Contact your vet today",
      "Call your vet and describe when it started and whether it repeats. If things get worse, go to a clinic immediately.",
    ],
    green: [
      "You can monitor your pet at home",
      "Provide fresh water and monitor your pet. If the symptom recurs or lasts over 24 hours, contact your vet.",
    ],
  },

  ru: {
    red: [
      "Немедленно обратитесь за ветеринарной помощью",
      "Позвоните в ближайшую дежурную клинику или отправляйтесь туда сейчас. Держите питомца в покое, не давайте лекарства для людей и не вызывайте рвоту. По возможности возьмите упаковку вещества.",
    ],
    yellow: [
      "Свяжитесь с ветеринаром сегодня",
      "Позвоните врачу и расскажите, когда появился симптом и повторяется ли он. Если состояние ухудшается, немедленно отправляйтесь в клинику.",
    ],
    green: [
      "Можно наблюдать дома",
      "Оставьте свежую воду и следите за самочувствием. Если симптом повторяется или не проходит за 24 часа, свяжитесь с ветеринаром.",
    ],
  },
  fr: {
    red: [
      "Consultez un vétérinaire en urgence",
      "Appelez la clinique de garde la plus proche ou allez-y maintenant. Gardez votre animal au calme, ne donnez pas de médicaments humains et ne provoquez pas de vomissements. Emportez l’emballage du produit si possible.",
    ],
    yellow: [
      "Contactez votre vétérinaire aujourd’hui",
      "Appelez votre vétérinaire et précisez quand le signe a commencé et s’il se répète. Si l’état s’aggrave, allez immédiatement à la clinique.",
    ],
    green: [
      "Vous pouvez surveiller à la maison",
      "Laissez de l’eau fraîche et surveillez son état. Si le signe se répète ou persiste plus de 24 heures, contactez votre vétérinaire.",
    ],
  },
};

// --- My vet + nearest clinic -----------------------------------------------
// The user saves their own vet/clinic phone (stored on this device only).
// "Find nearest clinic" asks for the location only when tapped, looks up
// veterinary clinics in OpenStreetMap (no API key) and does not store the location.
const VET_KEY = "kepatina-my-vet";
type MyVet = { name: string; phone: string };
type Clinic = {
  name: string;
  phone?: string | undefined;
  km: number;
  lat: number;
  lon: number;
  open24?: boolean;
};

const vetCopy: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    name: string;
    phone: string;
    save: string;
    edit: string;
    call: string;
    usePet: string;
    find: string;
    finding: string;
    nearest: string;
    directions: string;
    none: string;
    denied: string;
    failed: string;
    noPhone: string;
    privacy: string;
    moreMaps: string;
    locFail: string;
  }
> = {
  lv: {
    title: "Mans veterinārārsts",
    subtitle: "Saglabā sava ārsta vai klīnikas tālruni, lai tas vienmēr ir pie rokas.",
    name: "Ārsta vai klīnikas nosaukums",
    phone: "Tālrunis",
    save: "Saglabāt",
    edit: "Mainīt",
    call: "Zvanīt",
    usePet: "Izmantot mīluļa medkartes numuru",
    find: "Atrast tuvāko klīniku",
    finding: "Meklēju…",
    nearest: "Tuvākās klīnikas",
    directions: "Maršruts",
    none: "Tuvumā klīnikas neatrada. Atver kartē un meklē vairāk.",
    denied:
      "Atrašanās vieta nav atļauta. Atļauj piekļuvi vietai tālruņa iestatījumos vai meklē klīniku kartē.",
    failed: "Neizdevās ielādēt klīnikas (vajag internetu). Mēģini vēlreiz vai atver kartē.",
    noPhone: "Tālrunis nav norādīts — meklē kartē",
    privacy:
      "Atrašanās vieta tiek izmantota tikai meklēšanai un netiek saglabāta. Datus var trūkt — pirms izbraukšanas piezvani.",
    moreMaps: "Meklēt kartē",
    locFail: "Neizdevās noteikt atrašanās vietu. Ieslēdz vietas pakalpojumu (GPS) telefonā un mēģini vēlreiz vai meklē klīniku kartē.",
  },
  en: {
    title: "My vet",
    subtitle: "Save your vet or clinic phone number so it's always at hand.",
    name: "Vet or clinic name",
    phone: "Phone",
    save: "Save",
    edit: "Change",
    call: "Call",
    usePet: "Use the number from the pet's medical card",
    find: "Find nearest clinic",
    finding: "Searching…",
    nearest: "Nearest clinics",
    directions: "Directions",
    none: "No clinics found nearby. Open the map to search wider.",
    denied: "Location is not allowed. Allow location in your phone settings or search the map.",
    failed: "Couldn't load clinics (internet needed). Try again or open the map.",
    noPhone: "No phone listed — check the map",
    privacy:
      "Your location is only used for the search and is not saved. Data may be incomplete — call before you go.",
    moreMaps: "Search on map",
    locFail: "Couldn’t get your location. Turn on location (GPS) on your phone and try again, or search the map.",
  },
  ru: {
    title: "Мой ветеринар",
    subtitle: "Сохраните телефон своего врача или клиники, чтобы он всегда был под рукой.",
    name: "Имя врача или название клиники",
    phone: "Телефон",
    save: "Сохранить",
    edit: "Изменить",
    call: "Позвонить",
    usePet: "Взять номер из медкарты питомца",
    find: "Найти ближайшую клинику",
    finding: "Ищу…",
    nearest: "Ближайшие клиники",
    directions: "Маршрут",
    none: "Рядом клиник не найдено. Откройте карту и поищите шире.",
    denied:
      "Доступ к местоположению не разрешён. Разрешите его в настройках телефона или поищите клинику на карте.",
    failed: "Не удалось загрузить клиники (нужен интернет). Повторите или откройте карту.",
    noPhone: "Телефон не указан — смотрите на карте",
    privacy:
      "Местоположение используется только для поиска и не сохраняется. Данные могут быть неполными — позвоните перед выездом.",
    moreMaps: "Искать на карте",
    locFail: "Не удалось определить местоположение. Включите геолокацию (GPS) на телефоне и повторите или поищите клинику на карте.",
  },
  fr: {
    title: "Mon vétérinaire",
    subtitle:
      "Enregistrez le numéro de votre vétérinaire ou de votre clinique pour l’avoir toujours sous la main.",
    name: "Nom du vétérinaire ou de la clinique",
    phone: "Téléphone",
    save: "Enregistrer",
    edit: "Modifier",
    call: "Appeler",
    usePet: "Utiliser le numéro de la fiche médicale",
    find: "Trouver la clinique la plus proche",
    finding: "Recherche…",
    nearest: "Cliniques les plus proches",
    directions: "Itinéraire",
    none: "Aucune clinique trouvée à proximité. Ouvrez la carte pour chercher plus large.",
    denied:
      "La localisation n’est pas autorisée. Autorisez-la dans les réglages du téléphone ou cherchez sur la carte.",
    failed:
      "Impossible de charger les cliniques (connexion requise). Réessayez ou ouvrez la carte.",
    noPhone: "Pas de numéro — voir la carte",
    privacy:
      "Votre position sert uniquement à la recherche et n’est pas enregistrée. Les données peuvent être incomplètes — appelez avant de partir.",
    moreMaps: "Chercher sur la carte",
    locFail: "Impossible d’obtenir votre position. Activez la localisation (GPS) sur le téléphone et réessayez, ou cherchez sur la carte.",
  },
};

const cleanPhone = (v: string) => v.replace(/[^\d+]/g, "");

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchClinics(lat: number, lon: number): Promise<Clinic[]> {
  const query = `[out:json][timeout:25];nwr["amenity"="veterinary"](around:30000,${lat},${lon});out center tags 100;`;
  type Overpass = {
    elements?: {
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];
  };
  let json: Overpass | null = null;
  // The public Overpass servers are often busy: try the next one if a server fails or is slow.
  for (const url of OVERPASS_SERVERS) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
      });
      if (!res.ok) continue;
      json = (await res.json()) as Overpass;
      break;
    } catch {
      /* try the next server */
    } finally {
      window.clearTimeout(timer);
    }
  }
  if (!json) throw new Error("overpass");
  const list: Clinic[] = [];
  for (const el of json.elements ?? []) {
    const cLat = el.lat ?? el.center?.lat;
    const cLon = el.lon ?? el.center?.lon;
    if (cLat == null || cLon == null) continue;
    const tags = el.tags ?? {};
    list.push({
      name: tags["name"] ?? tags["operator"] ?? "Veterinary",
      phone: tags["phone"] ?? tags["contact:phone"],
      km: distanceKm(lat, lon, cLat, cLon),
      lat: cLat,
      lon: cLon,
      open24: tags["opening_hours"] === "24/7",
    });
  }
  return list.sort((a, b) => a.km - b.km).slice(0, 3);
}

const riskTag: Record<Lang, Record<Risk, string>> = {
  lv: { red: "Steidzami", yellow: "Šodien pie ārsta", green: "Var novērot mājās" },
  en: { red: "Urgent", yellow: "See a vet today", green: "Can monitor at home" },
  ru: { red: "Срочно", yellow: "Сегодня к ветеринару", green: "Можно наблюдать дома" },
  fr: { red: "Urgent", yellow: "Vétérinaire aujourd’hui", green: "Surveillance à domicile" },
};

function VetFinder({
  lang,
  risk,
  petVetPhone,
}: {
  lang: Lang;
  risk: Risk;
  petVetPhone?: string | undefined;
}) {
  const c = vetCopy[lang];
  const [vet, setVet] = useState<MyVet | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "denied" | "nolocation" | "failed">("idle");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VET_KEY);
      if (raw) {
        const v = JSON.parse(raw) as MyVet;
        if (v && typeof v.phone === "string") setVet(v);
      }
    } catch {
      /* ignore broken saved value */
    }
  }, []);

  const startEdit = () => {
    setName(vet?.name ?? "");
    setPhone(vet?.phone ?? petVetPhone ?? "");
    setEditing(true);
  };
  const save = () => {
    const next: MyVet = { name: name.trim(), phone: phone.trim() };
    if (!cleanPhone(next.phone)) return;
    try {
      localStorage.setItem(VET_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep it for this session only */
    }
    setVet(next);
    setEditing(false);
  };

  const find = () => {
    setState("loading");
    getPosition()
      .then(async (here) => {
        setPos(here);
        try {
          setClinics(await fetchClinics(here.lat, here.lon));
          setState("done");
        } catch {
          setState("failed");
        }
      })
      .catch((e: unknown) =>
        setState(e instanceof Error && e.message === "denied" ? "denied" : "nolocation"),
      );
  };

  const mapSearch = pos
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("veterinary clinic")}&center=${pos.lat},${pos.lon}`
    : "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent("veterinary clinic near me");
  const callCls = `inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white ${risk === "red" ? "bg-danger" : "bg-primary"}`;
  const fieldCls = "w-full rounded-2xl border bg-background px-3 py-2 text-sm";

  return (
    <Card className={`space-y-4 ${risk === "red" ? "border-danger/40" : ""}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Phone
            className={`h-5 w-5 ${risk === "red" ? "text-danger" : "text-primary"}`}
            aria-hidden="true"
          />
          <h3 className="text-lg font-semibold">{c.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{c.subtitle}</p>
      </div>

      {vet && !editing ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{vet.name || vet.phone}</p>
            {vet.name && <p className="text-xs text-muted-foreground">{vet.phone}</p>}
            <button
              type="button"
              onClick={startEdit}
              className="mt-1 text-xs font-bold text-primary underline"
            >
              {c.edit}
            </button>
          </div>
          <a
            href={`tel:${cleanPhone(vet.phone)}`}
            aria-label={`${c.call}: ${vet.name || vet.phone}`}
            className={callCls}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {c.call}
          </a>
        </div>
      ) : editing || !vet ? (
        <div className="space-y-2">
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="w-full rounded-2xl border border-dashed p-3 text-sm font-bold text-primary"
            >
              + {c.title}
            </button>
          ) : (
            <>
              <label className="block space-y-1 text-xs font-bold">
                {c.name}
                <input
                  className={fieldCls}
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-xs font-bold">
                {c.phone}
                <input
                  className={fieldCls}
                  type="tel"
                  inputMode="tel"
                  maxLength={25}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              {petVetPhone?.trim() && phone !== petVetPhone && (
                <button
                  type="button"
                  onClick={() => setPhone(petVetPhone)}
                  className="text-xs font-bold text-primary underline"
                >
                  {c.usePet}: {petVetPhone}
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={!cleanPhone(phone)}
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {c.save}
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={find}
          disabled={state === "loading"}
          aria-busy={state === "loading"}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-primary px-4 py-2 text-sm font-bold text-primary disabled:opacity-60"
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden="true" />
          )}
          {state === "loading" ? c.finding : c.find}
        </button>

        <p className="sr-only" role="status" aria-live="polite">
          {state === "loading"
            ? c.finding
            : state === "done"
              ? clinics.length === 0
                ? c.none
                : `${c.nearest}: ${clinics.length}`
              : ""}
        </p>
        {state === "denied" && (
          <p role="alert" className="text-xs text-danger">
            {c.denied}
          </p>
        )}
        {state === "nolocation" && (
          <p role="alert" className="text-xs text-danger">
            {c.locFail}
          </p>
        )}
        {state === "failed" && (
          <p role="alert" className="text-xs text-danger">
            {c.failed}
          </p>
        )}
        {state === "done" && (
          <div className="space-y-2">
            <p className="text-sm font-bold">{c.nearest}</p>
            {clinics.length === 0 && <p className="text-xs text-muted-foreground">{c.none}</p>}
            {clinics.map((k) => (
              <div
                key={`${k.lat},${k.lon}`}
                role="group"
                aria-label={k.name}
                className="space-y-2 rounded-2xl border bg-background p-3"
              >
                <p className="flex items-center gap-2 font-bold">
                  {k.name}
                  {k.open24 && (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-extrabold text-danger">
                      24/7
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {k.km < 10 ? k.km.toFixed(1) : Math.round(k.km)} km
                  {k.phone ? ` · ${k.phone}` : ` · ${c.noPhone}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {k.phone && (
                    <a
                      href={`tel:${cleanPhone(k.phone)}`}
                      aria-label={`${c.call}: ${k.name}`}
                      className={callCls}
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {c.call}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${k.lat},${k.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${c.directions}: ${k.name}`}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    {c.directions}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        {(state === "done" || state === "failed" || state === "denied" || state === "nolocation") && (
          <a
            href={mapSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary underline"
          >
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {c.moreMaps}
          </a>
        )}
        <p className="text-xs text-muted-foreground">{c.privacy}</p>
      </div>
    </Card>
  );
}
// ---------------------------------------------------------------------------

function SymptomsPage() {
  const { t, selectedPet, settings } = useApp();
  const [override, setOverride] = useState<Species | null>(null);
  const species = override ?? selectedPet?.species ?? "Suns";
  const [sel, setSel] = useState<string | null>(null);
  const visible = symptoms.filter(
    (x) => (!x.only || x.only.includes(species)) && !x.not?.includes(species),
  );
  const s = visible.find((x) => x.id === sel);
  const lang = settings.lang;
  const style = {
    red: "bg-danger-soft text-danger",
    yellow: "bg-warn-soft text-warn",
    green: "bg-safe-soft text-safe",
  };
  const Icon = s?.risk === "red" ? AlertCircle : s?.risk === "yellow" ? Phone : Eye;

  return (
    <>
      <PageHeading eyebrow={t.symEyebrow} title={t.symTitle} subtitle={t.symSubtitle} />
      <div className="space-y-2">
        <p className="text-sm font-bold">{t.animal}</p>
        <SpeciesSelector value={species} onChange={setOverride} />
      </div>

      {/* Live region: TalkBack announces the verdict as soon as a symptom is picked. */}
      <div aria-live="polite" aria-atomic="true" className="empty:hidden">
        {s && (
          <div className={`space-y-2 rounded-3xl p-5 ${style[s.risk]}`}>
            <div className="flex items-center gap-2">
              <Icon className="h-6 w-6" aria-hidden="true" />
              <h2 className="text-xl font-semibold">{riskCopy[lang][s.risk][0]}</h2>
            </div>
            <p className="text-sm font-semibold text-foreground">{riskCopy[lang][s.risk][1]}</p>
            <p className="text-xs font-bold opacity-80">
              {s[lang][0]} · {speciesLabel(t, species).toLowerCase()}
            </p>
          </div>
        )}
      </div>
      {s ? (
        s.risk !== "green" && (
          <VetFinder lang={lang} risk={s.risk} petVetPhone={selectedPet?.vetPhone} />
        )
      ) : (
        <Card className="flex gap-3">
          <Hand className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">{t.pickSymptomTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.pickSymptomBody}</p>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        <p className="text-sm font-bold">{t.pickSymptom}</p>
        {visible.map((x) => {
          const active = x.id === sel;
          const dot = { red: "bg-danger", yellow: "bg-warn", green: "bg-safe" }[x.risk];
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setSel(active ? null : x.id)}
              aria-pressed={active}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${active ? "border-primary bg-secondary" : "bg-card"}`}
            >
              {active ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="flex-1">
                <span className="block font-bold">{x[lang][0]}</span>
                <span className="block text-xs text-muted-foreground">{x[lang][1]}</span>
              </span>
              {/* The colour dot means nothing to a screen reader, so say the risk in words. */}
              <span className="sr-only">{riskTag[lang][x.risk]}</span>
              <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" /> {t.symDisclaimer}
      </div>
    </>
  );
}
