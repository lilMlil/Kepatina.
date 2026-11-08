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
