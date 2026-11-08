import type { Lang } from "./i18n";

/** Texts for password reset, account deletion and backups (kept apart from the main dictionaries). */
export interface AccountCopy {
  showPw: string;
  hidePw: string;
  forgot: string;
  needEmail: string;
  resetSent: string;
  newPwTitle: string;
  newPwBody: string;
  newPw: string;
  savePw: string;
  pwSaved: string;
  banner: string;
  deleteBtn: string;
  deleteTitle: string;
  deleteBody: string;
  deleteFamilyNote: string;
  deleteConfirm: string;
  deleted: string;
  deleteFail: string;
  backupTitle: string;
  backupBody: string;
  exportBtn: string;
  importBtn: string;
  importQTitle: string;
  importQBody: string;
  importQConfirm: string;
  imported: string;
  importBad: string;
  exportFail: string;
  storageFull: string;
}

export const accountCopy: Record<Lang, AccountCopy> = {
  lv: {
    showPw: "Parādīt paroli",
    hidePw: "Paslēpt paroli",
    forgot: "Aizmirsi paroli?",
    needEmail: "Ieraksti savu e-pastu un nospied vēlreiz.",
    resetSent: "Ja šāds konts pastāv, uz e-pastu nosūtīta saite paroles maiņai.",
    newPwTitle: "Jauna parole",
    newPwBody: "Ieraksti jauno paroli savam kontam.",
    newPw: "Jaunā parole",
    savePw: "Saglabāt paroli",
    pwSaved: "Parole nomainīta.",
    banner: "Iestati jaunu paroli",
    deleteBtn: "Dzēst kontu",
    deleteTitle: "Dzēst kontu?",
    deleteBody:
      "Konts un visi mākoņa dati tiks neatgriezeniski dzēsti. Dati šajā tālrunī paliks, līdz tu tos izdzēsīsi vai noņemsi lietotni.",
    deleteFamilyNote: " Tu esi ģimenes izveidotājs — vadība pāries nākamajam dalībniekam, un kopīgie dati paliks viņiem.",
    deleteConfirm: "Dzēst",
    deleted: "Konts dzēsts.",
    deleteFail: "Neizdevās dzēst kontu",
    backupTitle: "Rezerves kopija",
    backupBody:
      "Tavi dati tiek glabāti šajā tālrunī (un mākonī, ja esi pieteicies). Saglabā kopiju failā — tā palīdzēs atjaunot datus, ja tālrunis pazustu vai lietotne tiktu dzēsta.",
    exportBtn: "Saglabāt kopiju failā",
    importBtn: "Atjaunot no faila",
    importQTitle: "Atjaunot datus?",
    importQBody: "Pašreizējie dati šajā ierīcē tiks aizvietoti ar datiem no faila.",
    importQConfirm: "Atjaunot",
    imported: "Dati atjaunoti.",
    importBad: "Šis nav derīgs Ķepatiņa kopijas fails.",
    exportFail: "Neizdevās izveidot kopiju.",
    storageFull:
      "Tālruņa atmiņa ir pilna — jaunākās izmaiņas netika saglabātas. Izveido rezerves kopiju iestatījumos.",
  },
  en: {
    showPw: "Show password",
    hidePw: "Hide password",
    forgot: "Forgot password?",
    needEmail: "Enter your email and tap again.",
    resetSent: "If this account exists, we sent a password reset link to your email.",
    newPwTitle: "New password",
    newPwBody: "Enter a new password for your account.",
    newPw: "New password",
    savePw: "Save password",
    pwSaved: "Password changed.",
    banner: "Set a new password",
    deleteBtn: "Delete account",
    deleteTitle: "Delete account?",
    deleteBody:
      "Your account and all cloud data will be permanently deleted. Data on this phone stays until you delete it or remove the app.",
    deleteFamilyNote: " You created the family group — the next member will take over and keep the shared data.",
    deleteConfirm: "Delete",
    deleted: "Account deleted.",
    deleteFail: "Couldn't delete the account",
    backupTitle: "Backup",
    backupBody:
      "Your data is kept on this phone (and in the cloud if you're signed in). Save a copy to a file — it lets you restore everything if the phone is lost or the app is removed.",
    exportBtn: "Save a copy to a file",
    importBtn: "Restore from a file",
    importQTitle: "Restore data?",
    importQBody: "The data on this device will be replaced with the data from the file.",
    importQConfirm: "Restore",
    imported: "Data restored.",
    importBad: "This is not a valid Ķepatiņa backup file.",
    exportFail: "Couldn't create the backup.",
    storageFull:
      "Phone storage is full — the latest changes were not saved. Make a backup in Settings.",
  },
  ru: {
    showPw: "Показать пароль",
    hidePw: "Скрыть пароль",
    forgot: "Забыли пароль?",
    needEmail: "Введите e-mail и нажмите ещё раз.",
    resetSent: "Если такой аккаунт есть, мы отправили на почту ссылку для смены пароля.",
    newPwTitle: "Новый пароль",
    newPwBody: "Введите новый пароль для вашего аккаунта.",
    newPw: "Новый пароль",
    savePw: "Сохранить пароль",
    pwSaved: "Пароль изменён.",
    banner: "Задайте новый пароль",
    deleteBtn: "Удалить аккаунт",
    deleteTitle: "Удалить аккаунт?",
    deleteBody:
      "Аккаунт и все данные в облаке будут удалены навсегда. Данные на этом телефоне останутся, пока вы не удалите их или само приложение.",
    deleteFamilyNote: " Вы создали семейную группу — управление перейдёт следующему участнику, и общие данные останутся у него.",
    deleteConfirm: "Удалить",
    deleted: "Аккаунт удалён.",
    deleteFail: "Не удалось удалить аккаунт",
    backupTitle: "Резервная копия",
    backupBody:
      "Ваши данные хранятся на этом телефоне (и в облаке, если вы вошли в аккаунт). Сохраните копию в файл — она поможет восстановить всё, если телефон потеряется или приложение удалят.",
    exportBtn: "Сохранить копию в файл",
    importBtn: "Восстановить из файла",
    importQTitle: "Восстановить данные?",
    importQBody: "Данные на этом устройстве будут заменены данными из файла.",
    importQConfirm: "Восстановить",
    imported: "Данные восстановлены.",
    importBad: "Это не файл резервной копии Ķepatiņa.",
    exportFail: "Не удалось создать копию.",
    storageFull:
      "Память телефона заполнена — последние изменения не сохранены. Сделайте резервную копию в настройках.",
  },
  fr: {
    showPw: "Afficher le mot de passe",
    hidePw: "Masquer le mot de passe",
    forgot: "Mot de passe oublié ?",
    needEmail: "Saisissez votre e-mail puis appuyez de nouveau.",
    resetSent:
      "Si ce compte existe, un lien de réinitialisation du mot de passe a été envoyé à votre e-mail.",
    newPwTitle: "Nouveau mot de passe",
    newPwBody: "Saisissez un nouveau mot de passe pour votre compte.",
    newPw: "Nouveau mot de passe",
    savePw: "Enregistrer le mot de passe",
    pwSaved: "Mot de passe modifié.",
    banner: "Définir un nouveau mot de passe",
    deleteBtn: "Supprimer le compte",
    deleteTitle: "Supprimer le compte ?",
    deleteBody:
      "Votre compte et toutes les données du cloud seront supprimés définitivement. Les données de ce téléphone restent jusqu’à ce que vous les supprimiez ou désinstalliez l’application.",
    deleteFamilyNote:
      " Vous avez créé le groupe familial — le membre suivant en deviendra responsable et gardera les données partagées.",
    deleteConfirm: "Supprimer",
    deleted: "Compte supprimé.",
    deleteFail: "Impossible de supprimer le compte",
    backupTitle: "Sauvegarde",
    backupBody:
      "Vos données sont conservées sur ce téléphone (et dans le cloud si vous êtes connecté). Enregistrez une copie dans un fichier pour tout restaurer si le téléphone est perdu ou l’application supprimée.",
    exportBtn: "Enregistrer une copie dans un fichier",
    importBtn: "Restaurer depuis un fichier",
    importQTitle: "Restaurer les données ?",
    importQBody: "Les données de cet appareil seront remplacées par celles du fichier.",
    importQConfirm: "Restaurer",
    imported: "Données restaurées.",
    importBad: "Ce n’est pas un fichier de sauvegarde Ķepatiņa valide.",
    exportFail: "Impossible de créer la sauvegarde.",
    storageFull:
      "La mémoire du téléphone est pleine — les dernières modifications n’ont pas été enregistrées. Faites une sauvegarde dans les réglages.",
  },
};
