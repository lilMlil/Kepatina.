import type { Lang } from "./i18n";

export const CONTROLLER_NAME = "Zane Bajāre";
export const CONTACT_EMAIL = "zanehane.official@gmail.com";

export interface PrivacySection {
  h: string;
  p?: string[];
  ul?: string[];
}

export interface PrivacyDoc {
  title: string;
  updated: string;
  linkLabel: string;
  /** Short line shown under the sign-up form, before the link to the policy. */
  agree: string;
  intro: string;
  sections: PrivacySection[];
}

/** Replaces {name} and {email} in the policy text. */
export function fillPrivacy(text: string): string {
  return text.replaceAll("{name}", CONTROLLER_NAME).replaceAll("{email}", CONTACT_EMAIL);
}

export const privacyDocs: Record<Lang, PrivacyDoc> = {
  lv: {
    title: "Privātuma politika",
    updated: "Atjaunota: 2026. gada 8. novembrī",
    linkLabel: "Privātuma politika",
    agree: "Reģistrējoties tu piekrīti privātuma politikai:",
    intro:
      "Ķepatiņa ir mājdzīvnieku aprūpes lietotne. Šeit īsi un saprotami paskaidrots, kādus datus lietotne apstrādā, kur tie glabājas un ko tu vari ar tiem darīt.",
    sections: [
      {
        h: "1. Kas atbild par datiem",
        p: [
          "Lietotni izstrādā un par datu apstrādi atbild: {name} (turpmāk — “mēs”). Jautājumi par privātumu: {email}.",
        ],
      },
      {
        h: "2. Kādus datus lietotne apstrādā",
        p: ["Tikai tos, ko pats ievadi lietotnē:"],
        ul: [
          "Konts (tikai ja to izveido): e-pasta adrese un parole. Paroli glabā autentifikācijas pakalpojums šifrētā veidā — mēs to neredzam.",
          "Tavs profils: vārds, fotogrāfija un tālrunis (tiek izmantots pazudušā mājdzīvnieka birkā un mājdzīvnieka pasē).",
          "Mājdzīvnieku dati: vārds, suga, šķirne, dzimums, krāsa, dzimšanas datums, svars, mikročipa numurs, piezīmes, fotogrāfija, veterinārārsta vārds un tālrunis, sterilizācija.",
          "Aprūpes ieraksti: atgādinājumi, zāļu kursi, vakcinācijas, vizītes pie veterinārārsta, svara ieraksti, izdevumi, kontrolsaraksti.",
          "Iestatījumi: valoda un tēma.",
        ],
      },
      {
        h: "3. Kur dati tiek glabāti",
        p: [
          "Pēc noklusējuma visi dati glabājas tikai tavā ierīcē. Ja tu neesi pieteicies kontā, mēs tos nesaņemam un nekur nesūtām.",
          "Ja izveido kontu, datu kopija tiek sinhronizēta mākonī (pakalpojums Supabase), lai tu varētu lietot vairākas ierīces un ģimenes režīmu. Supabase darbojas kā mūsu datu apstrādātājs; dati var tikt glabāti uz tā un tā infrastruktūras partneru serveriem. Ja dati tiek pārsūtīti ārpus ES/EEZ, tiek izmantoti atbilstoši aizsardzības mehānismi (piemēram, standarta līguma klauzulas).",
          "Datu apstrādes tiesiskais pamats: lietotnes pakalpojuma sniegšana (VDAR 6. panta 1. punkta b) apakšpunkts), tava piekrišana atrašanās vietai un paziņojumiem (a) apakšpunkts) un pakalpojuma drošība (f) apakšpunkts).",
        ],
      },
      {
        h: "4. Atrašanās vieta",
        p: [
          "Atrašanās vieta tiek izmantota tikai tad, kad tu pats spied pogu, lai atrastu tuvākās veterinārās klīnikas, un tikai pēc tava atļaujas. Aptuvenās koordinātes tiek nosūtītas publiskiem Overpass API serveriem (OpenStreetMap kartes dati: overpass-api.de, overpass.private.coffee, overpass.kumi.systems), lai atrastu klīnikas tuvumā. Mēs koordinātes nesaglabājam, taču šo serveru uzturētāji tehniski saņem koordinātes un tavu IP adresi.",
          "Ja nospied saiti uz kartēm (piemēram, Google Maps), tālāk darbojas attiecīgā pakalpojuma privātuma politika.",
        ],
      },
      {
        h: "5. Atļaujas",
        ul: [
          "Paziņojumi: atgādinājumi tiek plānoti pašā ierīcē (lokāli). Tie neiet cauri nevienam serverim.",
          "Atrašanās vieta: tikai klīniku meklēšanai (skat. 4. punktu).",
          "Fotogrāfijas un faili: lai izvēlētos mājdzīvnieka foto un saglabātu vai atjaunotu datu kopiju.",
        ],
      },
      {
        h: "6. Kam dati ir pieejami",
        ul: [
          "Ģimenes režīms: ja izveido ģimeni vai pievienojies tai ar kodu, visi ģimenes dalībnieki redz un var mainīt kopīgos datus (mājdzīvniekus, atgādinājumus, ierakstus). Dalībnieki redz arī cits cita e-pasta adreses. Ģimenes kodu dod tikai tiem, kam uzticies.",
          "QR birka pazudušam dzīvniekam: informācija, ko tu izvēlies (dzīvnieka vārds, tavs vārds un tālrunis, veterinārārsta tālrunis, piezīme), tiek ierakstīta pašā QR kodā. Ikviens, kas to noskenē, to redzēs. Ieraksti tikai to, ko esi gatavs parādīt.",
          "Kopīgošana un datu kopija: faili un teksti, ko tu saglabā vai nosūti ar “Kopīgot”, ir tavā kontrolē. Datu kopijas fails nav šifrēts — glabā to drošā vietā.",
          "Pakalpojumu sniedzēji: Supabase (konti un datubāze) un Overpass serveri (klīniku meklēšana). Citiem trešajiem personām dati netiek nodoti.",
        ],
      },
      {
        h: "7. Ko mēs nedarām",
        p: [
          "Lietotnē nav reklāmu, analītikas vai izsekošanas rīku. Mēs nepārdodam datus un neveidojam tavu profilu mārketinga nolūkiem.",
        ],
      },
      {
        h: "8. Cik ilgi dati tiek glabāti un kā tos dzēst",
        ul: [
          "Datus ierīcē var dzēst pats: dzēšot ierakstus, notīrot lietotnes datus vai atinstalējot lietotni.",
          "Mākoņa datus glabājam, līdz tu dzēs kontu. Sadaļā Profils → Dzēst kontu tiek dzēsts tavs konts un personiskā datu kopija mākonī. Ja esi ģimenes īpašnieks un ģimenē ir citi dalībnieki, īpašnieka loma pāriet nākamajam dalībniekam, un kopīgie dati paliek ģimenei.",
          "Īslaicīgi tehniskie ieraksti par neveiksmīgiem ģimenes koda ievades mēģinājumiem tiek automātiski dzēsti.",
        ],
      },
      {
        h: "9. Tavas tiesības",
        p: [
          "Saskaņā ar VDAR tev ir tiesības piekļūt saviem datiem, tos labot, dzēst, ierobežot apstrādi, iebilst pret to un saņemt datus pārnesamā formā (Iestatījumi → Saglabāt kopiju failā). Piekrišanu (paziņojumi, atrašanās vieta) vari atsaukt jebkurā laikā ierīces iestatījumos. Lai izmantotu tiesības, raksti uz {email}.",
          "Ja uzskati, ka tavas tiesības ir pārkāptas, vari iesniegt sūdzību Datu valsts inspekcijai (dvi.gov.lv) vai savas valsts uzraudzības iestādei.",
        ],
      },
      {
        h: "10. Drošība",
        p: [
          "Dati tiek pārsūtīti šifrēti (HTTPS). Mākonī katra lietotāja dati ir aizsargāti ar piekļuves noteikumiem, lai tos varētu lasīt tikai pats lietotājs un viņa ģimene. Neviena sistēma nav pilnīgi droša, tāpēc izvēlies drošu paroli un bloķē ierīci.",
        ],
      },
      {
        h: "11. Bērni",
        p: [
          "Lietotne nav paredzēta bērniem līdz 13 gadu vecumam. Ja uzskati, ka bērns ir ievadījis savus datus, uzraksti mums un mēs tos izdzēsīsim.",
        ],
      },
      {
        h: "12. Izmaiņas",
        p: [
          "Ja politika mainīsies, atjaunosim datumu augšpusē. Būtiskas izmaiņas paziņosim lietotnē.",
        ],
      },
      {
        h: "13. Kontakti",
        p: ["{name} · {email}"],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated: 8 November 2026",
    linkLabel: "Privacy policy",
    agree: "By signing up you agree to the privacy policy:",
    intro:
      "Ķepatiņa is a pet-care app. This page explains in plain language what data the app handles, where it is stored and what you can do with it.",
    sections: [
      {
        h: "1. Who is responsible",
        p: [
          "The app is developed by {name} (“we”), who is responsible for the processing of your data. Privacy questions: {email}.",
        ],
      },
      {
        h: "2. What data the app handles",
        p: ["Only what you enter yourself:"],
        ul: [
          "Account (only if you create one): e-mail address and password. The password is stored by the authentication service in hashed form — we never see it.",
          "Your profile: name, photo and phone number (used in the lost-pet tag and the pet passport).",
          "Pet details: name, species, breed, sex, colour, birth date, weight, microchip number, notes, photo, vet name and phone, neutered status.",
          "Care records: reminders, medication courses, vaccinations, vet visits, weight entries, expenses, checklists.",
          "Settings: language and theme.",
        ],
      },
      {
        h: "3. Where the data is stored",
        p: [
          "By default all data stays on your device only. If you are not signed in, we do not receive it and it is not sent anywhere.",
          "If you create an account, a copy is synced to the cloud (Supabase) so you can use several devices and the family feature. Supabase acts as our data processor; data may be stored on its servers and those of its infrastructure partners. Where data leaves the EU/EEA, appropriate safeguards (for example standard contractual clauses) apply.",
          "Legal bases (GDPR): providing the app’s service (Art. 6(1)(b)), your consent for location and notifications (Art. 6(1)(a)) and security of the service (Art. 6(1)(f)).",
        ],
      },
      {
        h: "4. Location",
        p: [
          "Your location is used only when you tap the button to find nearby vet clinics, and only after you grant permission. Approximate coordinates are sent to public Overpass API servers (OpenStreetMap data: overpass-api.de, overpass.private.coffee, overpass.kumi.systems) to look up clinics nearby. We do not store the coordinates, but the operators of those servers technically receive them together with your IP address.",
          "If you open a link to a maps service (for example Google Maps), that service’s own privacy policy applies.",
        ],
      },
      {
        h: "5. Permissions",
        ul: [
          "Notifications: reminders are scheduled on the device itself (local). They do not pass through any server.",
          "Location: only for finding clinics (see section 4).",
          "Photos and files: to choose a pet photo and to save or restore a backup.",
        ],
      },
      {
        h: "6. Who can see your data",
        ul: [
          "Family mode: if you create or join a family with a code, every family member can see and edit the shared data (pets, reminders, records). Members can also see each other’s e-mail addresses. Share the family code only with people you trust.",
          "Lost-pet QR tag: the details you choose (pet name, your name and phone, vet phone, note) are written into the QR code itself. Anyone who scans it will see them. Include only what you are happy to show.",
          "Sharing and backups: files and texts you save or send with “Share” are under your control. The backup file is not encrypted — keep it somewhere safe.",
          "Service providers: Supabase (accounts and database) and Overpass servers (clinic search). Your data is not passed to any other third parties.",
        ],
      },
      {
        h: "7. What we do not do",
        p: [
          "The app has no ads, analytics or tracking tools. We do not sell your data and do not profile you for marketing.",
        ],
      },
      {
        h: "8. Retention and deletion",
        ul: [
          "You can delete data on your device yourself: delete records, clear the app’s data or uninstall the app.",
          "Cloud data is kept until you delete your account. Profile → Delete account removes your account and your personal cloud copy. If you own a family that still has other members, ownership passes to the next member and the shared data stays with the family.",
          "Short-lived technical records of failed family-code attempts are cleaned up automatically.",
        ],
      },
      {
        h: "9. Your rights",
        p: [
          "Under the GDPR you may access, correct and delete your data, restrict or object to its processing, and receive it in a portable form (Settings → Save a copy to a file). You can withdraw consent (notifications, location) at any time in your device settings. To exercise your rights, write to {email}.",
          "If you believe your rights have been violated, you can complain to the Data State Inspectorate of Latvia (dvi.gov.lv) or to the supervisory authority in your own country.",
        ],
      },
      {
        h: "10. Security",
        p: [
          "Data is transmitted encrypted (HTTPS). In the cloud each user’s data is protected by access rules so that only that user and their family can read it. No system is perfectly secure, so please choose a strong password and lock your device.",
        ],
      },
      {
        h: "11. Children",
        p: [
          "The app is not intended for children under 13. If you believe a child has entered their data, contact us and we will delete it.",
        ],
      },
      {
        h: "12. Changes",
        p: [
          "If this policy changes we will update the date above. Material changes will be announced in the app.",
        ],
      },
      {
        h: "13. Contact",
        p: ["{name} · {email}"],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "Обновлено: 8 ноября 2026 г.",
    linkLabel: "Политика конфиденциальности",
    agree: "Регистрируясь, вы соглашаетесь с политикой конфиденциальности:",
    intro:
      "Ķepatiņa — приложение для ухода за питомцами. Здесь простым языком объясняется, какие данные использует приложение, где они хранятся и что вы можете с ними делать.",
    sections: [
      {
        h: "1. Кто отвечает за данные",
        p: [
          "Приложение разрабатывает и за обработку данных отвечает: {name} (далее — «мы»). Вопросы о конфиденциальности: {email}.",
        ],
      },
      {
        h: "2. Какие данные обрабатывает приложение",
        p: ["Только те, что вы вводите сами:"],
        ul: [
          "Аккаунт (только если вы его создаёте): адрес электронной почты и пароль. Пароль хранится сервисом аутентификации в зашифрованном виде — мы его не видим.",
          "Ваш профиль: имя, фото и телефон (используется в жетоне потерянного питомца и в паспорте питомца).",
          "Данные питомцев: кличка, вид, порода, пол, окрас, дата рождения, вес, номер микрочипа, заметки, фото, имя и телефон ветеринара, стерилизация.",
          "Записи об уходе: напоминания, курсы лекарств, прививки, визиты к ветеринару, записи веса, расходы, чек-листы.",
          "Настройки: язык и тема.",
        ],
      },
      {
        h: "3. Где хранятся данные",
        p: [
          "По умолчанию все данные хранятся только на вашем устройстве. Если вы не вошли в аккаунт, мы их не получаем и никуда не отправляем.",
          "Если вы создаёте аккаунт, копия данных синхронизируется с облаком (Supabase), чтобы вы могли пользоваться несколькими устройствами и режимом «семья». Supabase выступает нашим обработчиком данных; данные могут храниться на его серверах и серверах его инфраструктурных партнёров. Если данные передаются за пределы ЕС/ЕЭЗ, применяются соответствующие гарантии (например, стандартные договорные положения).",
          "Правовые основания (GDPR): предоставление сервиса приложения (ст. 6(1)(b)), ваше согласие на геолокацию и уведомления (ст. 6(1)(a)) и безопасность сервиса (ст. 6(1)(f)).",
        ],
      },
      {
        h: "4. Геолокация",
        p: [
          "Местоположение используется только когда вы сами нажимаете кнопку поиска ближайших ветклиник и только после вашего разрешения. Приблизительные координаты отправляются на публичные серверы Overpass API (данные OpenStreetMap: overpass-api.de, overpass.private.coffee, overpass.kumi.systems) для поиска клиник поблизости. Мы не сохраняем координаты, но владельцы этих серверов технически получают их вместе с вашим IP-адресом.",
          "Если вы открываете ссылку на карты (например, Google Maps), дальше действует политика конфиденциальности этого сервиса.",
        ],
      },
      {
        h: "5. Разрешения",
        ul: [
          "Уведомления: напоминания планируются на самом устройстве (локально) и не проходят через сервер.",
          "Геолокация: только для поиска клиник (см. пункт 4).",
          "Фото и файлы: чтобы выбрать фото питомца и сохранить или восстановить резервную копию.",
        ],
      },
      {
        h: "6. Кто может видеть данные",
        ul: [
          "Режим «семья»: если вы создаёте семью или входите в неё по коду, все участники видят и могут изменять общие данные (питомцев, напоминания, записи). Участники также видят адреса электронной почты друг друга. Давайте код семьи только тем, кому доверяете.",
          "QR-жетон потерянного питомца: выбранные вами сведения (кличка, ваше имя и телефон, телефон ветеринара, заметка) записываются прямо в QR-код. Любой, кто его отсканирует, их увидит. Указывайте только то, что готовы показать.",
          "Поделиться и резервная копия: файлы и тексты, которые вы сохраняете или отправляете через «Поделиться», находятся под вашим контролем. Файл резервной копии не зашифрован — храните его в надёжном месте.",
          "Поставщики услуг: Supabase (аккаунты и база данных) и серверы Overpass (поиск клиник). Другим третьим лицам данные не передаются.",
        ],
      },
      {
        h: "7. Чего мы не делаем",
        p: [
          "В приложении нет рекламы, аналитики и средств отслеживания. Мы не продаём данные и не составляем ваш профиль в маркетинговых целях.",
        ],
      },
      {
        h: "8. Срок хранения и удаление",
        ul: [
          "Данные на устройстве вы можете удалить сами: удалив записи, очистив данные приложения или удалив приложение.",
          "Данные в облаке хранятся, пока вы не удалите аккаунт. В разделе Профиль → Удалить аккаунт удаляются ваш аккаунт и ваша личная копия в облаке. Если вы владелец семьи, в которой есть другие участники, роль владельца переходит следующему участнику, а общие данные остаются у семьи.",
          "Кратковременные технические записи о неудачных попытках ввода кода семьи удаляются автоматически.",
        ],
      },
      {
        h: "9. Ваши права",
        p: [
          "В соответствии с GDPR вы вправе получить доступ к своим данным, исправить и удалить их, ограничить обработку или возразить против неё, а также получить данные в переносимом виде (Настройки → Сохранить копию в файл). Согласие (уведомления, геолокация) можно отозвать в любой момент в настройках устройства. Чтобы воспользоваться правами, напишите на {email}.",
          "Если вы считаете, что ваши права нарушены, вы можете подать жалобу в Государственную инспекцию данных Латвии (dvi.gov.lv) или в надзорный орган вашей страны.",
        ],
      },
      {
        h: "10. Безопасность",
        p: [
          "Данные передаются в зашифрованном виде (HTTPS). В облаке данные каждого пользователя защищены правилами доступа, так что читать их могут только он сам и его семья. Ни одна система не защищена абсолютно, поэтому выбирайте надёжный пароль и блокируйте устройство.",
        ],
      },
      {
        h: "11. Дети",
        p: [
          "Приложение не предназначено для детей младше 13 лет. Если вы считаете, что ребёнок ввёл свои данные, напишите нам — мы их удалим.",
        ],
      },
      {
        h: "12. Изменения",
        p: [
          "При изменении политики мы обновим дату вверху. О существенных изменениях сообщим в приложении.",
        ],
      },
      {
        h: "13. Контакты",
        p: ["{name} · {email}"],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 8 novembre 2026",
    linkLabel: "Politique de confidentialité",
    agree: "En vous inscrivant, vous acceptez la politique de confidentialité :",
    intro:
      "Ķepatiņa est une application de soins pour animaux de compagnie. Cette page explique simplement quelles données l’application traite, où elles sont stockées et ce que vous pouvez en faire.",
    sections: [
      {
        h: "1. Qui est responsable",
        p: [
          "L’application est développée par {name} (« nous »), responsable du traitement de vos données. Questions sur la vie privée : {email}.",
        ],
      },
      {
        h: "2. Quelles données sont traitées",
        p: ["Uniquement celles que vous saisissez vous-même :"],
        ul: [
          "Compte (seulement si vous en créez un) : adresse e-mail et mot de passe. Le mot de passe est conservé de façon chiffrée par le service d’authentification — nous ne le voyons jamais.",
          "Votre profil : nom, photo et numéro de téléphone (utilisé sur la plaque d’animal perdu et dans le passeport de l’animal).",
          "Données des animaux : nom, espèce, race, sexe, couleur, date de naissance, poids, numéro de puce, notes, photo, nom et téléphone du vétérinaire, stérilisation.",
          "Suivi des soins : rappels, traitements, vaccins, visites chez le vétérinaire, pesées, dépenses, listes de contrôle.",
          "Réglages : langue et thème.",
        ],
      },
      {
        h: "3. Où les données sont stockées",
        p: [
          "Par défaut, toutes les données restent uniquement sur votre appareil. Si vous n’êtes pas connecté, nous ne les recevons pas et elles ne sont envoyées nulle part.",
          "Si vous créez un compte, une copie est synchronisée dans le cloud (Supabase) pour que vous puissiez utiliser plusieurs appareils et le mode famille. Supabase agit comme notre sous-traitant ; les données peuvent être hébergées sur ses serveurs et ceux de ses partenaires d’infrastructure. Lorsque des données quittent l’UE/EEE, des garanties appropriées (par exemple des clauses contractuelles types) s’appliquent.",
          "Bases légales (RGPD) : fourniture du service de l’application (art. 6, par. 1, b), votre consentement pour la localisation et les notifications (art. 6, par. 1, a) et la sécurité du service (art. 6, par. 1, f).",
        ],
      },
      {
        h: "4. Localisation",
        p: [
          "Votre position n’est utilisée que lorsque vous appuyez sur le bouton de recherche de cliniques vétérinaires proches, et seulement après votre autorisation. Des coordonnées approximatives sont envoyées à des serveurs publics Overpass API (données OpenStreetMap : overpass-api.de, overpass.private.coffee, overpass.kumi.systems) pour trouver des cliniques à proximité. Nous ne conservons pas ces coordonnées, mais les exploitants de ces serveurs les reçoivent techniquement, avec votre adresse IP.",
          "Si vous ouvrez un lien vers un service de cartes (par exemple Google Maps), la politique de confidentialité de ce service s’applique.",
        ],
      },
      {
        h: "5. Autorisations",
        ul: [
          "Notifications : les rappels sont programmés sur l’appareil lui-même (en local). Ils ne passent par aucun serveur.",
          "Localisation : uniquement pour chercher des cliniques (voir section 4).",
          "Photos et fichiers : pour choisir la photo d’un animal et enregistrer ou restaurer une sauvegarde.",
        ],
      },
      {
        h: "6. Qui peut voir vos données",
        ul: [
          "Mode famille : si vous créez une famille ou la rejoignez avec un code, chaque membre peut voir et modifier les données partagées (animaux, rappels, dossiers). Les membres voient aussi les adresses e-mail des autres. Ne donnez le code qu’aux personnes de confiance.",
          "Plaque QR d’animal perdu : les informations que vous choisissez (nom de l’animal, votre nom et téléphone, téléphone du vétérinaire, note) sont écrites dans le QR code lui-même. Toute personne qui le scanne les verra. N’indiquez que ce que vous acceptez de montrer.",
          "Partage et sauvegarde : les fichiers et textes que vous enregistrez ou envoyez via « Partager » restent sous votre contrôle. Le fichier de sauvegarde n’est pas chiffré — conservez-le en lieu sûr.",
          "Prestataires : Supabase (comptes et base de données) et serveurs Overpass (recherche de cliniques). Vos données ne sont transmises à aucun autre tiers.",
        ],
      },
      {
        h: "7. Ce que nous ne faisons pas",
        p: [
          "L’application ne contient ni publicité, ni outil d’analyse, ni traceur. Nous ne vendons pas vos données et ne vous profilons pas à des fins marketing.",
        ],
      },
      {
        h: "8. Durée de conservation et suppression",
        ul: [
          "Vous pouvez supprimer vous-même les données de l’appareil : supprimer des éléments, effacer les données de l’application ou la désinstaller.",
          "Les données du cloud sont conservées jusqu’à la suppression de votre compte. Profil → Supprimer le compte efface votre compte et votre copie personnelle dans le cloud. Si vous êtes propriétaire d’une famille comptant d’autres membres, la propriété passe au membre suivant et les données partagées restent à la famille.",
          "Les traces techniques de courte durée des tentatives échouées de code famille sont supprimées automatiquement.",
        ],
      },
      {
        h: "9. Vos droits",
        p: [
          "Conformément au RGPD, vous pouvez accéder à vos données, les rectifier, les effacer, limiter leur traitement ou vous y opposer, et les recevoir sous forme portable (Réglages → Enregistrer une copie dans un fichier). Vous pouvez retirer votre consentement (notifications, localisation) à tout moment dans les réglages de l’appareil. Pour exercer vos droits, écrivez à {email}.",
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation auprès de l’Inspection nationale des données de Lettonie (dvi.gov.lv) ou de l’autorité de contrôle de votre pays.",
        ],
      },
      {
        h: "10. Sécurité",
        p: [
          "Les données sont transmises de façon chiffrée (HTTPS). Dans le cloud, les données de chaque utilisateur sont protégées par des règles d’accès : seuls l’utilisateur et sa famille peuvent les lire. Aucun système n’est infaillible : choisissez un mot de passe solide et verrouillez votre appareil.",
        ],
      },
      {
        h: "11. Enfants",
        p: [
          "L’application n’est pas destinée aux enfants de moins de 13 ans. Si vous pensez qu’un enfant a saisi ses données, contactez-nous et nous les supprimerons.",
        ],
      },
      {
        h: "12. Modifications",
        p: [
          "Si cette politique change, nous mettrons à jour la date ci-dessus. Les changements importants seront annoncés dans l’application.",
        ],
      },
      {
        h: "13. Contact",
        p: ["{name} · {email}"],
      },
    ],
  },
};
