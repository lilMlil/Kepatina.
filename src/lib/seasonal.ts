import type { Lang } from "./i18n";
import type { Species } from "./reminders";
export type Season = 0 | 1 | 2 | 3;
export function seasonFor(date = new Date()): Season {
  return Math.floor(((date.getMonth() + 1) % 12) / 3) as Season;
}
interface Tip {
  species?: Species[];
  copy: Record<Lang, [string, string]>;
  source: string;
}
const outdoor: Species[] = ["Suns", "Kaķis"];
export const seasonalTips: Record<Season, Tip[]> = {
  0: [
    {
      species: outdoor,
      copy: {
        ru: [
          "Лапы и холод",
          "Сокращайте прогулки в сильный мороз. После улицы смывайте соль с лап и тщательно высушивайте их.",
        ],
        lv: [
          "Ķepas un aukstums",
          "Stiprā salā saīsini pastaigas. Pēc pastaigas noskalo sāli no ķepām un rūpīgi nosusini.",
        ],
        en: [
          "Paws and cold",
          "Shorten walks in severe cold. Rinse salt from paws after walks and dry them thoroughly.",
        ],
        fr: [
          "Pattes et froid",
          "Raccourcissez les promenades par grand froid. Rincez le sel des pattes et séchez-les soigneusement.",
        ],
      },
      source: "https://www.avma.org/resources-tools/pet-owners/petcare/cold-weather-animal-safety",
    },
    {
      copy: {
        ru: [
          "Антифриз опасен",
          "Храните антифриз вне доступа животных. При подозрении на попадание внутрь немедленно обращайтесь к ветеринару.",
        ],
        lv: [
          "Antifrīzs ir bīstams",
          "Glabā antifrīzu dzīvniekiem nepieejami. Ja ir aizdomas par norīšanu, nekavējoties sazinies ar veterinārārstu.",
        ],
        en: [
          "Antifreeze is dangerous",
          "Keep antifreeze away from animals. Suspected ingestion requires immediate veterinary care.",
        ],
        fr: [
          "Antigel dangereux",
          "Gardez l’antigel hors de portée. Toute ingestion suspectée nécessite des soins vétérinaires immédiats.",
        ],
      },
      source: "https://www.avma.org/resources-tools/pet-owners/petcare/cold-weather-animal-safety",
    },
    {
      species: ["Jūrascūciņa"],
      copy: {
        ru: [
          "Сквозняки и холод",
          "Держите морскую свинку в тёплом помещении без сквозняков и резких перепадов температуры. Морозу и сырости она не переносит; сухая подстилка и сено должны быть всегда.",
        ],
        lv: [
          "Caurvējš un aukstums",
          "Jūrascūciņu tur siltā telpā bez caurvēja un krasām temperatūras izmaiņām. Sals un mitrums viņai nav piemēroti; nodrošini sausu pakaišu un pastāvīgi pieejamu sienu.",
        ],
        en: [
          "Draughts and cold",
          "Keep your guinea pig in a warm room without draughts or sudden temperature changes. Frost and damp are not suitable for her; provide dry bedding and constant access to hay.",
        ],
        fr: [
          "Courants d’air et froid",
          "Gardez le cochon d’Inde dans une pièce chaude, sans courants d’air ni variations brutales de température. Le gel et l’humidité ne lui conviennent pas ; prévoyez une litière sèche et du foin à volonté.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs",
    },
    {
      species: ["Rāpuļi"],
      copy: {
        ru: [
          "Тепло зимой",
          "Проверьте лампу обогрева, УФ-лампу и термостат: зимой в комнате прохладнее. Измеряйте температуру термометром в тёплой и холодной зонах и подготовьте план на случай отключения электричества.",
        ],
        lv: [
          "Siltums ziemā",
          "Pārbaudi sildlampu, UV lampu un termostatu — ziemā telpās ir vēsāks. Temperatūru silto un vēso zonu mēri ar termometru un sagatavo rīcības plānu elektrības atslēgšanas gadījumam.",
        ],
        en: [
          "Warmth in winter",
          "Check the heat lamp, UV lamp and thermostat: rooms are cooler in winter. Measure the warm and cool zones with a thermometer and plan for a power cut.",
        ],
        fr: [
          "De la chaleur en hiver",
          "Vérifiez la lampe chauffante, la lampe UV et le thermostat : les pièces sont plus fraîches en hiver. Mesurez les zones chaude et fraîche avec un thermomètre et prévoyez une solution en cas de coupure de courant.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/reptiles",
    },
    {
      species: ["Zivtiņas"],
      copy: {
        ru: [
          "Температура воды зимой",
          "Проверьте работу обогревателя и термометра, особенно у тропических рыб. Не ставьте аквариум у окна или батареи; при покупке рыб в мороз перевозите их в утеплённой упаковке.",
        ],
        lv: [
          "Ūdens temperatūra ziemā",
          "Pārbaudi sildītāju un termometru, īpaši tropu zivīm. Akvāriju nenovieto pie loga vai radiatora; aukstumā zivis pārvadā siltumizolētā iepakojumā.",
        ],
        en: [
          "Water temperature in winter",
          "Check the heater and thermometer, especially for tropical fish. Do not place the tank next to a window or radiator; transport fish in an insulated bag in cold weather.",
        ],
        fr: [
          "Température de l’eau en hiver",
          "Vérifiez le chauffage et le thermomètre, surtout pour les poissons tropicaux. Ne placez pas l’aquarium près d’une fenêtre ou d’un radiateur ; transportez les poissons dans un emballage isolant par temps froid.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/fish",
    },
  ],
  1: [
    {
      species: outdoor,
      copy: {
        ru: [
          "Защита от клещей",
          "Проверяйте шерсть после прогулок. Подберите защиту с ветеринаром; средства для собак могут быть токсичны для кошек.",
        ],
        lv: [
          "Aizsardzība pret ērcēm",
          "Pēc pastaigām pārbaudi kažoku. Līdzekli izvēlies ar veterinārārstu; suņu līdzekļi var būt toksiski kaķiem.",
        ],
        en: [
          "Tick protection",
          "Check the coat after walks. Choose protection with your vet; dog products can be toxic to cats.",
        ],
        fr: [
          "Protection contre les tiques",
          "Inspectez le pelage après les sorties. Choisissez la protection avec le vétérinaire ; les produits pour chiens peuvent être toxiques pour les chats.",
        ],
      },
      source:
        "https://www.fda.gov/animal-veterinary/animal-health-literacy/safe-use-flea-and-tick-products-pets",
    },
    {
      copy: {
        ru: [
          "Весенняя уборка",
          "Убирайте чистящие средства, удобрения и приманки для вредителей в закрытые шкафы. Не допускайте животных к обработанным поверхностям до высыхания.",
        ],
        lv: [
          "Pavasara tīrīšana",
          "Tīrīšanas līdzekļus, mēslojumu un kaitēkļu ēsmas glabā slēgti. Nelaid dzīvniekus pie apstrādātām virsmām līdz tās nožuvušas.",
        ],
        en: [
          "Spring cleaning",
          "Store cleaners, fertilizers and pest baits securely. Keep pets away from treated surfaces until dry.",
        ],
        fr: [
          "Nettoyage de printemps",
          "Rangez nettoyants, engrais et appâts en lieu sûr. Éloignez les animaux des surfaces traitées jusqu’au séchage.",
        ],
      },
      source: "https://www.aspca.org/pet-care/general-pet-care/springtime-safety-tips",
    },
  ],
  2: [
    {
      copy: {
        ru: [
          "Защита от перегрева",
          "Обеспечьте тень, свежую воду и прохладное место без прямого солнца. Никогда не оставляйте животное в припаркованной машине.",
        ],
        lv: [
          "Sargā no pārkaršanas",
          "Nodrošini ēnu, svaigu ūdeni un vēsu vietu bez tiešas saules. Nekad neatstāj dzīvnieku stāvošā automašīnā.",
        ],
        en: [
          "Prevent overheating",
          "Provide shade, fresh water and a cool place out of direct sun. Never leave an animal in a parked car.",
        ],
        fr: [
          "Éviter la surchauffe",
          "Prévoyez ombre, eau fraîche et un endroit frais sans soleil direct. Ne laissez jamais un animal dans une voiture garée.",
        ],
      },
      source: "https://www.avma.org/resources-tools/pet-owners/petcare/warm-weather-pet-safety",
    },
    {
      species: ["Suns"],
      copy: {
        ru: [
          "Горячий асфальт",
          "Гуляйте в прохладные часы, выбирайте траву и избегайте горячего асфальта, который может обжечь лапы.",
        ],
        lv: [
          "Karsts asfalts",
          "Pastaigājies vēsākajās stundās, izvēlies zāli un izvairies no karsta asfalta, kas var apdedzināt ķepas.",
        ],
        en: [
          "Hot pavement",
          "Walk during cooler hours, choose grass and avoid hot pavement that can burn paws.",
        ],
        fr: [
          "Sol brûlant",
          "Sortez aux heures fraîches, privilégiez l’herbe et évitez les sols brûlants qui peuvent brûler les pattes.",
        ],
      },
      source: "https://www.avma.org/resources-tools/pet-owners/petcare/warm-weather-pet-safety",
    },
    {
      species: ["Jūrascūciņa"],
      copy: {
        ru: [
          "Перегрев у морской свинки",
          "Морские свинки очень плохо переносят жару. Держите клетку в тени и прохладном проветриваемом месте, подальше от прямого солнца; всегда оставляйте свежую воду.",
        ],
        lv: [
          "Jūrascūciņas pārkaršana",
          "Jūrascūciņas karstumu panes ļoti slikti. Būri tur ēnā, vēsā un vēdināmā vietā, prom no tiešas saules; vienmēr nodrošini svaigu ūdeni.",
        ],
        en: [
          "Guinea pig overheating",
          "Guinea pigs cope very badly with heat. Keep the cage in a cool, ventilated place out of direct sun, and always provide fresh water.",
        ],
        fr: [
          "Surchauffe du cochon d’Inde",
          "Les cochons d’Inde supportent très mal la chaleur. Placez la cage dans un endroit frais et aéré, à l’abri du soleil direct, et laissez toujours de l’eau fraîche.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/rodents/guineapigs",
    },
    {
      species: ["Rāpuļi"],
      copy: {
        ru: [
          "Террариум и летняя жара",
          "Не ставьте террариум на прямое солнце: стекло быстро перегревается. Обеспечьте вентиляцию, холодную зону и проверяйте температуру термометром.",
        ],
        lv: [
          "Terārijs un vasaras karstums",
          "Nenovieto terāriju tiešā saulē — stikls ātri pārkarst. Nodrošini ventilāciju, vēsāku zonu un pārbaudi temperatūru ar termometru.",
        ],
        en: [
          "Terrarium in summer heat",
          "Do not put the terrarium in direct sun: glass overheats quickly. Provide ventilation and a cooler zone, and check the temperature with a thermometer.",
        ],
        fr: [
          "Terrarium et chaleur estivale",
          "Ne placez pas le terrarium en plein soleil : la vitre surchauffe vite. Assurez la ventilation et une zone plus fraîche, et vérifiez la température avec un thermomètre.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/reptiles",
    },
    {
      species: ["Zivtiņas"],
      copy: {
        ru: [
          "Жара и кислород в аквариуме",
          "В тёплой воде меньше кислорода. Не ставьте аквариум на солнце, обеспечьте аэрацию, а в сильную жару кормите немного и убирайте остатки корма.",
        ],
        lv: [
          "Karstums un skābeklis akvārijā",
          "Siltā ūdenī ir mazāk skābekļa. Akvāriju nenovieto saulē, nodrošini aerāciju, bet lielā karstumā baro mazāk un izņem barības atliekas.",
        ],
        en: [
          "Heat and oxygen in the tank",
          "Warm water holds less oxygen. Keep the tank out of the sun, provide aeration, and in very hot weather feed lightly and remove leftover food.",
        ],
        fr: [
          "Chaleur et oxygène dans l’aquarium",
          "L’eau chaude contient moins d’oxygène. Gardez l’aquarium à l’abri du soleil, assurez une aération et, par forte chaleur, nourrissez peu et retirez les restes.",
        ],
      },
      source: "https://www.rspca.org.uk/adviceandwelfare/pets/fish",
    },
  ],
  3: [
    {
      species: outdoor,
      copy: {
        ru: [
          "Видимость в темноте",
          "Используйте светоотражающие аксессуары на прогулках. Проверьте контакты в QR-жетоне и данные микрочипа.",
        ],
        lv: [
          "Redzamība tumsā",
          "Pastaigās izmanto atstarojošus aksesuārus. Pārbaudi QR žetona kontaktus un mikroshēmas datus.",
        ],
        en: [
          "Visibility after dark",
          "Use reflective accessories on walks. Check your QR tag contacts and microchip details.",
        ],
        fr: [
          "Visibilité dans l’obscurité",
          "Utilisez des accessoires réfléchissants. Vérifiez les contacts du médaillon QR et les données de la puce.",
        ],
      },
      source: "https://www.bluecross.org.uk/advice/dog/wellbeing-and-care/winter-care-for-dogs",
    },
    {
      copy: {
        ru: [
          "Грибы и приманки",
          "Не позволяйте питомцу есть незнакомые грибы и приманки для грызунов. При подозрении на отравление немедленно звоните ветеринару.",
        ],
        lv: [
          "Sēnes un ēsmas",
          "Neļauj mīlulim ēst nepazīstamas sēnes vai grauzēju ēsmas. Ja ir aizdomas par saindēšanos, nekavējoties zvani veterinārārstam.",
        ],
        en: [
          "Mushrooms and baits",
          "Do not let pets eat unknown mushrooms or rodent baits. Call a vet immediately if poisoning is suspected.",
        ],
        fr: [
          "Champignons et appâts",
          "Ne laissez pas les animaux manger des champignons inconnus ou des appâts. Appelez immédiatement le vétérinaire si une intoxication est suspectée.",
        ],
      },
      source: "https://www.aspca.org/pet-care/general-pet-care/autumn-safety-tips",
    },
  ],
};
export function tipsFor(season: Season, species?: Species) {
  return seasonalTips[season].filter(
    (t) => !t.species || (species !== undefined && t.species.includes(species)),
  );
}
