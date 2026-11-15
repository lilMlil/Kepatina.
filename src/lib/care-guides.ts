import type { Lang } from "./i18n";

export type CareTopic = "feeding" | "parasites" | "weather" | "noise" | "teeth" | "routine";
export interface GuideCopy {
  title: string;
  summary: string;
  tips: string[];
  warning: string;
}
export interface CareGuide {
  id: CareTopic;
  copy: Record<Lang, GuideCopy>;
  sources: { label: string; url: string }[];
}

export const careGuides: CareGuide[] = [
  {
    id: "feeding",
    sources: [
      {
        label: "WSAVA · Nutrition",
        url: "https://wsava.org/global-guidelines/global-nutrition-guidelines/",
      },
    ],
    copy: {
      lv: {
        title: "Barošana atbilstoši vecumam",
        summary: "Augošam, pieaugušam un vecākam mīlulim ir atšķirīgas vajadzības.",
        tips: [
          "Kucēnam vai kaķēnam izvēlies pilnvērtīgu augšanai paredzētu barību; lielo šķirņu kucēniem — viņu izmēram piemērotu. Porciju un ēdienreižu skaitu saskaņo ar veterinārārstu.",
          "Pieaugušam sunim vai kaķim porcijas pielāgo svaram, aktivitātei un ķermeņa kondīcijai. Senioram barību izvēlies pēc veselības, nevis tikai vecuma.",
          "Barību maini pakāpeniski. Vienmēr nodrošini svaigu ūdeni; nedod uztura piedevas bez ārsta norādes.",
          "Trušiem siens ir uztura pamats; jauna truša uzturs atšķiras no pieauguša. Putniem un kāmjiem vajadzīga tieši sugai piemērota barība. Jūrascūciņām katru dienu vajadzīgs C vitamīns, rāpuļiem — sugai atbilstoša barība un kalcijs, zivīm — nelielas porcijas, ko tās apēd dažu minūšu laikā.",
        ],
        warning:
          "Ja trusis vai jūrascūciņa pārstāj ēst vai izkārnīties, steidzami sazinies ar veterinārārstu. Jaunam vai slimam dzīvniekam apetītes zudumu neatliec uz vēlāku.",
      },
      en: {
        title: "Feeding for every life stage",
        summary: "Growing, adult and older pets have different needs.",
        tips: [
          "Choose complete growth food for puppies and kittens; large-breed puppies need food suited to their size. Agree portions and meal frequency with your vet.",
          "For adult dogs and cats, adjust portions to weight, activity and body condition. Choose a senior pet’s diet for their health, not age alone.",
          "Change food gradually. Keep fresh water available and avoid supplements unless your vet recommends them.",
          "Hay is the foundation of a rabbit’s diet; young rabbits have different needs from adults. Birds and hamsters need food appropriate to their species. Guinea pigs need vitamin C every day, reptiles need a species-appropriate diet plus calcium, and fish need small portions they finish within a few minutes.",
        ],
        warning:
          "If a rabbit or guinea pig stops eating or passing droppings, contact a vet urgently. Do not delay care for loss of appetite in a young or ill animal.",
      },
      ru: {
        title: "Питание по возрасту",
        summary: "Растущим, взрослым и пожилым питомцам нужен разный рацион.",
        tips: [
          "Щенкам и котятам нужен полнорационный корм для роста, а щенкам крупных пород — подходящий их размеру. Порции и частоту кормления согласуйте с ветеринаром.",
          "Взрослым собакам и кошкам подбирайте порции по весу, активности и упитанности. Пожилому питомцу выбирайте рацион по состоянию здоровья, а не только по возрасту.",
          "Меняйте корм постепенно. Свежая вода должна быть всегда; не давайте добавки без рекомендации ветеринара.",
          "Основа рациона кролика — сено; питание молодых кроликов отличается от питания взрослых. Птицам и хомякам нужен корм для их вида. Морским свинкам ежедневно нужен витамин C, рептилиям — рацион для их вида и кальций, рыбам — небольшие порции, которые они съедают за несколько минут.",
        ],
        warning:
          "Если кролик или морская свинка перестали есть или выделять помёт, срочно свяжитесь с ветеринаром. Не откладывайте помощь при потере аппетита у молодого или больного животного.",
      },
      fr: {
        title: "Une alimentation adaptée à l’âge",
        summary: "Les besoins changent entre croissance, âge adulte et vieillesse.",
        tips: [
          "Choisissez un aliment complet de croissance pour chiots et chatons, adapté au gabarit pour les chiots de grande race. Fixez les portions et la fréquence des repas avec le vétérinaire.",
          "Pour les chiens et chats adultes, adaptez les portions au poids, à l’activité et à l’état corporel. Pour un animal âgé, tenez compte de sa santé, pas seulement de son âge.",
          "Changez d’aliment progressivement. Laissez de l’eau fraîche disponible et évitez les compléments sans avis vétérinaire.",
          "Le foin est la base de l’alimentation du lapin ; les jeunes ont des besoins différents des adultes. Oiseaux et hamsters ont besoin d’un régime adapté à leur espèce. Les cochons d’Inde ont besoin de vitamine C chaque jour, les reptiles d’un régime adapté à l’espèce avec du calcium, et les poissons de petites portions consommées en quelques minutes.",
        ],
        warning:
          "Si un lapin ou un cochon d’Inde cesse de manger ou de produire des crottes, contactez rapidement un vétérinaire. Ne tardez pas face à une perte d’appétit chez un animal jeune ou malade.",
      },
    },
  },
  {
    id: "parasites",
    sources: [
      { label: "ESCCAP · Parasite control", url: "https://www.esccap.org/guidelines/" },
      {
        label: "SPKC · Ērču aktivitāte Latvijā",
        url: "https://www.spkc.gov.lv/lv/jaunums/gatavojoties-vasaras-sezonai-ka-pasargat-sevi-no-ercu-parnesatajam-slimibam",
      },
    ],
    copy: {
      lv: {
        title: "Parazīti un ērces Latvijā",
        summary: "Aizsardzība pastaigās, dārzā un arī mājās.",
        tips: [
          "Latvijā ērces sastopamas mežos, parkos un dārzos. Tās var būt aktīvas arī siltās ziemas dienās; nepaļaujies tikai uz kalendāru.",
          "Pēc pastaigas pārbaudi kažoku, ausis, kaklu un ķepas. Ērci noņem iespējami drīz ar ērču izņemšanas rīku pēc tā instrukcijas; nesmērē eļļu un nededzini.",
          "Veterinārārsts palīdzēs izvēlēties sugai, vecumam un svaram piemērotu līdzekli. Suņiem paredzēti permetrīna līdzekļi ir bīstami kaķiem.",
          "Attārpošanas un izmeklējumu plānu pielāgo medībām, jēlbarībai, ceļošanai un saskarei ar citiem dzīvniekiem. Savāc izkārnījumus, mazgā rokas; blusu gadījumā kop arī guļvietas.",
        ],
        warning:
          "Pēc ērces koduma apātija, drudzis, bālas smaganas vai tumšs urīns prasa steidzamu veterinārārsta palīdzību — iespējama ērču pārnesta infekcija, piemēram, babezioze sunim.",
      },
      en: {
        title: "Parasites and ticks in Latvia",
        summary: "Protection on walks, in gardens and at home.",
        tips: [
          "In Latvia, ticks occur in forests, parks and gardens. They can be active on mild winter days too; do not rely on the calendar alone.",
          "After walks, check the coat, ears, neck and paws. Remove ticks promptly with a tick-removal tool following its instructions; do not apply oil or burn them.",
          "Ask your vet for a product suited to species, age and weight. Dog products containing permethrin are dangerous to cats.",
          "Tailor worm treatment and testing to hunting, raw diets, travel and contact with other animals. Pick up droppings and wash hands; clean bedding when treating fleas.",
        ],
        warning:
          "After a tick bite, lethargy, fever, pale gums or dark urine need urgent veterinary care: a tick-borne infection, such as canine babesiosis, is possible.",
      },
      ru: {
        title: "Паразиты и клещи в Латвии",
        summary: "Защита на прогулках, в саду и дома.",
        tips: [
          "В Латвии клещи встречаются в лесах, парках и садах. Они могут быть активны и в тёплые зимние дни — не ориентируйтесь только на календарь.",
          "После прогулки проверяйте шерсть, уши, шею и лапы. Удаляйте клеща как можно скорее специальным инструментом по инструкции; не смазывайте маслом и не прижигайте.",
          "Ветеринар подберёт средство по виду, возрасту и весу. Средства для собак с перметрином опасны для кошек.",
          "План обработки от глистов и обследований зависит от охоты, сырого рациона, поездок и контактов с животными. Убирайте экскременты, мойте руки; при блохах очищайте лежанки.",
        ],
        warning:
          "Вялость, лихорадка, бледные дёсны или тёмная моча после укуса клеща требуют срочной помощи: возможна клещевая инфекция, например бабезиоз у собаки.",
      },
      fr: {
        title: "Parasites et tiques en Lettonie",
        summary: "Se protéger en promenade, au jardin et à la maison.",
        tips: [
          "En Lettonie, les tiques vivent dans les forêts, parcs et jardins. Elles peuvent aussi être actives lors de journées hivernales douces : ne vous fiez pas au seul calendrier.",
          "Après une sortie, inspectez le pelage, les oreilles, le cou et les pattes. Retirez rapidement les tiques avec un tire-tique selon sa notice ; ni huile ni flamme.",
          "Le vétérinaire choisira un produit adapté à l’espèce, à l’âge et au poids. Les produits pour chiens contenant de la perméthrine sont dangereux pour les chats.",
          "Adaptez vermifugation et analyses à la chasse, à l’alimentation crue, aux voyages et aux contacts. Ramassez les déjections, lavez-vous les mains et nettoyez les couchages en cas de puces.",
        ],
        warning:
          "Après une morsure de tique, abattement, fièvre, gencives pâles ou urines foncées nécessitent une consultation urgente : une infection transmise par les tiques, comme la babésiose canine, est possible.",
      },
    },
  },
  {
    id: "weather",
    sources: [
      { label: "RSPCA · Seasonal care", url: "https://www.rspca.org.uk/adviceandwelfare/seasonal" },
    ],
    copy: {
      lv: {
        title: "Karstums un aukstums",
        summary: "Drošas pastaigas un piemērota atpūtas vieta.",
        tips: [
          "Karstumā pastaigājies vēsākajās stundās, nodrošini ēnu, ūdeni un gaisa apmaiņu. Nekad neatstāj dzīvnieku stāvošā automašīnā; izvairies no sakarsuša seguma.",
          "Ja ir aizdomas par pārkaršanu, pārvieto mīluli vēsumā, sāc dzesēt ar ūdeni, kas vēsāks par ķermeni, un gaisa plūsmu; vienlaikus zvani klīnikai. Neietin slapjos dvieļos un nespied dzert.",
          "Aukstumā saīsini pastaigas un pielāgo tās mīluļa veselībai un apmatojumam. Pēc pastaigas noskalo sāli no ķepām un nosusini kažoku; antifrīzu turi nepieejamu.",
          "Trušus, putnus un kāmjus sargā no tiešas saules, caurvēja un krasām temperatūras maiņām. Ārā dzīvojošam trusim vajadzīga sausa, pasargāta mītne un neaizsalis ūdens. Jūrascūciņas ļoti slikti panes karstumu; rāpuļiem un zivīm vajadzīga stabila, sugai piemērota temperatūra — pārbaudi to ar termometru.",
        ],
        warning:
          "Smaga elpošana, vājums, apjukums vai sabrukums karstumā, kā arī izteikta apātija aukstumā ir neatliekama situācija. Dzesēšana nedrīkst aizkavēt palīdzību.",
      },
      en: {
        title: "Extreme heat and cold",
        summary: "Safer walks and a comfortable resting place.",
        tips: [
          "In heat, walk during cooler hours and provide shade, water and ventilation. Never leave a pet in a parked car; avoid hot surfaces.",
          "If overheating is suspected, move to a cool place and start cooling with water cooler than the body and airflow while calling the clinic. Do not wrap in wet towels or force drinking.",
          "In cold weather, shorten walks according to health and coat. Rinse salt off paws and dry the coat afterwards; keep antifreeze out of reach.",
          "Protect rabbits, birds and hamsters from direct sun, draughts and sudden temperature changes. Outdoor rabbits need dry sheltered housing and unfrozen water. Guinea pigs cope very badly with heat; reptiles and fish need a stable, species-appropriate temperature — check it with a thermometer.",
        ],
        warning:
          "Severe breathing difficulty, weakness, confusion or collapse in heat, or marked lethargy in cold, is an emergency. Cooling must not delay veterinary help.",
      },
      ru: {
        title: "Сильная жара и мороз",
        summary: "Безопасные прогулки и подходящее место отдыха.",
        tips: [
          "В жару гуляйте в прохладные часы, обеспечьте тень, воду и вентиляцию. Никогда не оставляйте питомца в припаркованной машине; избегайте горячего покрытия.",
          "При подозрении на перегрев перенесите питомца в прохладу, начните охлаждать водой прохладнее тела и потоком воздуха, одновременно звоня в клинику. Не заворачивайте в мокрые полотенца и не заставляйте пить.",
          "В мороз сокращайте прогулки с учётом здоровья и шерсти. Смывайте соль с лап и высушивайте шерсть; храните антифриз вне доступа.",
          "Берегите кроликов, птиц и хомяков от прямого солнца, сквозняков и резких перепадов температуры. Уличному кролику нужны сухое укрытие и незамёрзшая вода. Морские свинки очень плохо переносят жару; рептилиям и рыбам нужна стабильная температура, подходящая их виду, — проверяйте её термометром.",
        ],
        warning:
          "Тяжёлое дыхание, слабость, спутанность или коллапс в жару, а также выраженная вялость на морозе — неотложная ситуация. Охлаждение не должно задерживать помощь ветеринара.",
      },
      fr: {
        title: "Fortes chaleurs et grand froid",
        summary: "Des promenades sûres et un abri adapté.",
        tips: [
          "Par chaleur, sortez aux heures fraîches et prévoyez ombre, eau et ventilation. Ne laissez jamais un animal dans une voiture stationnée ; évitez les sols brûlants.",
          "En cas de surchauffe suspectée, mettez l’animal au frais et commencez à le refroidir avec de l’eau plus fraîche que son corps et de l’air, tout en appelant la clinique. Ne l’enveloppez pas de serviettes mouillées et ne le forcez pas à boire.",
          "Par froid, raccourcissez les sorties selon sa santé et son pelage. Rincez le sel des pattes et séchez le pelage ; gardez l’antigel hors de portée.",
          "Protégez lapins, oiseaux et hamsters du soleil direct, des courants d’air et des variations brutales. Un lapin vivant dehors a besoin d’un abri sec et d’eau non gelée. Les cochons d’Inde supportent très mal la chaleur ; reptiles et poissons ont besoin d’une température stable et adaptée à l’espèce — vérifiez-la avec un thermomètre.",
        ],
        warning:
          "Respiration très difficile, faiblesse, confusion ou effondrement par chaleur, ou abattement marqué par froid : c’est une urgence. Le refroidissement ne doit pas retarder les soins vétérinaires.",
      },
    },
  },
  {
    id: "noise",
    sources: [
      {
        label: "RSPCA · Fireworks",
        url: "https://www.rspca.org.uk/adviceandwelfare/pets/general/fireworks",
      },
    ],
    copy: {
      lv: {
        title: "Salūts un bailes no trokšņiem",
        summary: "Sagatavojies pirms trokšņainā vakara.",
        tips: [
          "Pastaigu ieplāno pirms salūta; pārbaudi pavadu, adreses medaljonu un čipa kontaktinformāciju. Aizver logus un aizkarus, ierīko pazīstamu slēptuvi.",
          "Ļauj mīlulim slēpties un paliec mierīgs. Vari viņu mierināt; nesodi par bailēm un nevelc ārā no slēptuves. Klusa fona skaņa var palīdzēt.",
          "Būri vai aploku pasargā no zibšņiem un trokšņa, saglabājot ventilāciju. Pie pārvietošanas pieradini iepriekš.",
          "Ilgtermiņā skaņu ierakstus izmanto ļoti klusā līmenī kopā ar patīkamu nodarbi; ja parādās bailes, pārtrauc. Smagu baiļu gadījumā laikus konsultējies ar veterinārārstu par uzvedības plānu un zālēm.",
        ],
        warning:
          "Nedod cilvēkiem paredzētus nomierinošus līdzekļus. Ja mīlulis traumējas, sabrūk vai nevar normāli elpot, meklē neatliekamu palīdzību.",
      },
      en: {
        title: "Fireworks and noise fear",
        summary: "Prepare before the noisy evening begins.",
        tips: [
          "Walk before fireworks; check the lead, ID tag and microchip contact details. Close windows and curtains and provide a familiar hiding place.",
          "Let your pet hide and stay calm. Comforting them is fine; never punish fear or pull them from hiding. Quiet background sound may help.",
          "Shield cages or enclosures from flashes and noise while maintaining ventilation. Get pets used to any move beforehand.",
          "For long-term training, pair very quiet sound recordings with something enjoyable; stop if fear appears. Discuss severe fear with a vet early, including a behaviour plan and medication if needed.",
        ],
        warning:
          "Do not give human sedatives. Injury, collapse or difficulty breathing needs emergency veterinary help.",
      },
      ru: {
        title: "Салюты и страх шума",
        summary: "Подготовьтесь до начала шумного вечера.",
        tips: [
          "Погуляйте до салютов; проверьте поводок, адресник и контактные данные чипа. Закройте окна и шторы, подготовьте знакомое укрытие.",
          "Позвольте питомцу спрятаться и сохраняйте спокойствие. Можно утешать его; не наказывайте за страх и не вытаскивайте из укрытия. Тихий фоновый звук может помочь.",
          "Защитите клетку или вольер от вспышек и шума, сохранив вентиляцию. К перемещению приучайте заранее.",
          "Для постепенного привыкания сочетайте очень тихие записи звуков с приятным занятием; при страхе остановитесь. При сильной боязни заранее обсудите с ветеринаром план поведения и при необходимости лекарства.",
        ],
        warning:
          "Не давайте человеческие успокоительные. При травме, коллапсе или затруднённом дыхании нужна экстренная помощь.",
      },
      fr: {
        title: "Feux d’artifice et peur du bruit",
        summary: "Préparez-vous avant la soirée bruyante.",
        tips: [
          "Promenez l’animal avant les feux ; vérifiez laisse, médaille et coordonnées de la puce. Fermez fenêtres et rideaux et proposez une cachette familière.",
          "Laissez-le se cacher et restez calme. Vous pouvez le rassurer ; ne punissez jamais sa peur et ne le forcez pas à sortir. Un fond sonore discret peut aider.",
          "Protégez cages et enclos des éclairs et du bruit sans gêner la ventilation. Habituez l’animal à tout déplacement à l’avance.",
          "À long terme, associez des enregistrements à très faible volume à une activité agréable ; arrêtez si la peur apparaît. Consultez tôt pour une peur intense, afin de prévoir un accompagnement comportemental et, si nécessaire, des médicaments.",
        ],
        warning:
          "Ne donnez pas de sédatifs humains. Une blessure, un effondrement ou une difficulté respiratoire nécessite des soins d’urgence.",
      },
    },
  },
  {
    id: "teeth",
    sources: [
      {
        label: "AVMA · Pet dental care",
        url: "https://www.avma.org/resources-tools/pet-owners/petcare/pet-dental-care",
      },
    ],
    copy: {
      lv: {
        title: "Zobu kopšana",
        summary: "Neliels ikdienas ieradums mutes veselībai.",
        tips: [
          "Suni vai kaķi pie zobu tīrīšanas pieradini pakāpeniski. Lieto mīkstu birsti un dzīvniekiem paredzētu zobu pastu; centies tīrīt katru dienu.",
          "Nelieto cilvēku zobu pastu. Cieti kauli, ragi un ļoti cietas rotaļlietas var salauzt zobus; košļājamie līdzekļi neaizstāj tīrīšanu.",
          "Veterinārārsta apskatē pārbaudi arī muti. Zobakmens noņemšana un slimību ārstēšana ir klīnikas darbs, nevis kasīšana mājās.",
          "Trušiem zobu nodilumam vajadzīgs šķiedrvielām bagāts uzturs ar sienu. Kāmjiem nodrošini drošus graužamus materiālus; zobus un putnu knābjus neapgriez pats. Jūrascūciņām zobi aug visu mūžu — vajadzīgs siens; siekalošanās vai svara kritums prasa apskati.",
        ],
        warning:
          "Slikta elpa, asiņošana, siekalošanās vai grūtības ēst prasa apskati. Trusim vai jūrascūciņai, kas neēd, palīdzība vajadzīga steidzami.",
      },
      en: {
        title: "Dental care",
        summary: "A small daily habit for a healthier mouth.",
        tips: [
          "Introduce toothbrushing gradually for dogs and cats. Use a soft brush and pet toothpaste; aim to brush daily.",
          "Do not use human toothpaste. Hard bones, antlers and very hard toys can fracture teeth; dental chews do not replace brushing.",
          "Include a mouth check at vet visits. Scaling and treating dental disease belong in a clinic, not scraping teeth at home.",
          "Rabbits need a fibre-rich, hay-based diet for tooth wear. Give hamsters safe gnawing materials; do not trim teeth or bird beaks yourself. Guinea pigs’ teeth also grow throughout life, so they need hay; drooling or weight loss needs a vet check.",
        ],
        warning:
          "Bad breath, bleeding, drooling or trouble eating needs a vet check. A rabbit or guinea pig that is not eating needs urgent care.",
      },
      ru: {
        title: "Уход за зубами",
        summary: "Небольшая ежедневная привычка для здоровья рта.",
        tips: [
          "Приучайте собак и кошек к чистке постепенно. Используйте мягкую щётку и пасту для животных; стремитесь чистить ежедневно.",
          "Не используйте человеческую пасту. Твёрдые кости, рога и очень жёсткие игрушки могут сломать зубы; жевательные средства не заменяют чистку.",
          "На приёме попросите проверить и рот. Удаление зубного камня и лечение проводят в клинике, а не соскабливают дома.",
          "Кроликам нужен богатый клетчаткой рацион с сеном для стачивания зубов. Хомякам давайте безопасные материалы для грызения; не подрезайте зубы или птичьи клювы самостоятельно. У морских свинок зубы тоже растут всю жизнь, поэтому нужно сено; слюнотечение или потеря веса требуют осмотра.",
        ],
        warning:
          "Запах изо рта, кровотечение, слюнотечение или трудности с едой требуют осмотра. Если кролик или морская свинка не ест, помощь нужна срочно.",
      },
      fr: {
        title: "Soins dentaires",
        summary: "Un petit geste quotidien pour une bouche saine.",
        tips: [
          "Habituez progressivement chiens et chats au brossage. Utilisez une brosse souple et un dentifrice pour animaux ; visez un brossage quotidien.",
          "N’utilisez pas de dentifrice humain. Os durs, bois de cervidés et jouets très rigides peuvent casser les dents ; les produits à mâcher ne remplacent pas le brossage.",
          "Faites examiner la bouche lors des visites vétérinaires. Détartrage et traitement des maladies dentaires se font en clinique, pas en grattant à la maison.",
          "Les lapins ont besoin d’une alimentation riche en fibres, à base de foin, pour user leurs dents. Donnez aux hamsters des matériaux sûrs à ronger ; ne coupez pas vous-même les dents ou les becs. Les dents des cochons d’Inde poussent aussi toute la vie : il leur faut du foin ; bave ou perte de poids nécessitent un examen.",
        ],
        warning:
          "Mauvaise haleine, saignement, salivation ou difficulté à manger nécessitent un examen. Un lapin ou un cochon d’Inde qui ne mange pas doit être vu rapidement.",
      },
    },
  },
  {
    id: "routine",
    sources: [{ label: "RSPCA · Pet care", url: "https://www.rspca.org.uk/adviceandwelfare/pets" }],
    copy: {
      lv: {
        title: "Ikdienas rūpes un labsajūta",
        summary: "Kustība, tīrība un savlaicīga veselības pārbaude.",
        tips: [
          "Katru dienu vēro apetīti, ūdens dzeršanu, izkārnījumus un uzvedību. Svaru un izmaiņas pieraksti medicīnas kartē.",
          "Piedāvā sugai piemērotas kustības, spēles un iespēju atpūsties. Kaķim vajag nagu asināšanas vietu; mazajiem dzīvniekiem — slēptuves un drošu izpēti.",
          "Regulāri tīri traukus, guļvietas, tualeti un būri. Kažoku un nagus kop atbilstoši sugai; nagus negriez dzīvajā daļā. Rāpuļiem un zivīm regulāri pārbaudi temperatūru un tīrību — terārija un akvārija apstākļi tieši ietekmē veselību.",
          "Ar veterinārārstu plāno profilaktiskas apskates un vakcināciju. Saglabā klīnikas tālruni un izmanto atgādnes.",
        ],
        warning:
          "Pēkšņas uzvedības izmaiņas, sāpes vai ilgstoša atteikšanās no barības nav tikai slikts garastāvoklis — sazinies ar veterinārārstu.",
      },
      en: {
        title: "Everyday care and wellbeing",
        summary: "Activity, hygiene and timely health checks.",
        tips: [
          "Watch appetite, drinking, droppings and behaviour daily. Record weight and changes in the medical card.",
          "Offer species-appropriate activity, play and rest. Cats need a scratching place; small pets need hiding places and safe exploration.",
          "Clean bowls, bedding, litter trays and cages regularly. Groom coats and nails for the species; avoid cutting the nail’s sensitive quick. For reptiles and fish, check temperature and cleanliness regularly — terrarium and aquarium conditions directly affect health.",
          "Plan preventive checkups and vaccinations with your vet. Save the clinic number and use reminders.",
        ],
        warning:
          "Sudden behaviour changes, pain or persistent refusal of food are not simply a bad mood — contact your vet.",
      },
      ru: {
        title: "Ежедневный уход и благополучие",
        summary: "Движение, чистота и своевременные осмотры.",
        tips: [
          "Ежедневно следите за аппетитом, питьём, выделениями и поведением. Записывайте вес и изменения в медкарту.",
          "Предлагайте подходящие виду движение, игры и отдых. Кошке нужна когтеточка, мелким питомцам — укрытия и безопасное исследование пространства.",
          "Регулярно очищайте миски, лежанки, лотки и клетки. Ухаживайте за шерстью и когтями с учётом вида; не срезайте живую часть когтя. Рептилиям и рыбам регулярно проверяйте температуру и чистоту — условия в террариуме и аквариуме напрямую влияют на здоровье.",
          "Планируйте профилактические осмотры и прививки с ветеринаром. Сохраните номер клиники и используйте напоминания.",
        ],
        warning:
          "Внезапные изменения поведения, боль или длительный отказ от еды — не просто плохое настроение: свяжитесь с ветеринаром.",
      },
      fr: {
        title: "Soins quotidiens et bien-être",
        summary: "Activité, hygiène et suivi de santé.",
        tips: [
          "Observez chaque jour appétit, prise d’eau, déjections et comportement. Notez le poids et les changements dans la fiche santé.",
          "Proposez activité, jeux et repos adaptés à l’espèce. Les chats ont besoin d’un griffoir ; les petits animaux, de cachettes et d’exploration sécurisée.",
          "Nettoyez régulièrement gamelles, couchages, litières et cages. Entretenez pelage et griffes selon l’espèce ; ne coupez pas la partie vivante de la griffe. Pour reptiles et poissons, vérifiez régulièrement température et propreté — les conditions du terrarium et de l’aquarium influencent directement la santé.",
          "Planifiez bilans préventifs et vaccins avec le vétérinaire. Enregistrez le numéro de la clinique et utilisez les rappels.",
        ],
        warning:
          "Changement soudain de comportement, douleur ou refus prolongé de manger ne sont pas une simple mauvaise humeur : contactez le vétérinaire.",
      },
    },
  },
];
