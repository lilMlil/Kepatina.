// Run automatically by `npm run android:init` right after `cap add android`.
// Adds the permissions the app needs (notifications, exact alarms, location).
import { readFileSync, writeFileSync, existsSync, cpSync } from "node:fs";

const file = "android/app/src/main/AndroidManifest.xml";
if (!existsSync(file)) {
  console.error("AndroidManifest.xml not found — run `npx cap add android` first.");
  process.exit(1);
}
let xml = readFileSync(file, "utf8");
const perms = [
  "android.permission.INTERNET",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.VIBRATE",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
];
const missing = perms.filter((p) => !xml.includes(`"${p}"`));
if (missing.length) {
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
  xml = xml.replace(/<\/manifest>\s*$/, `${lines}\n</manifest>\n`);
}
// Portrait only, like a normal phone app.
if (!xml.includes("android:screenOrientation")) {
  xml = xml.replace("<activity", '<activity\n            android:screenOrientation="portrait"');
}
// Deep link: the confirmation e-mail opens lv.kepatina.app://auth-callback straight in the app.
if (!xml.includes("auth-callback")) {
  const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="lv.kepatina.app" android:host="auth-callback" />
            </intent-filter>
        </activity>`;
  xml = xml.replace("</activity>", filter);
}
writeFileSync(file, xml);
console.log("AndroidManifest.xml patched:", missing.length ? missing.join(", ") : "nothing to add");

// Notification small icon (white paw) used by capacitor.config.ts → ic_stat_kepatina
if (existsSync("assets/android-notification")) {
  cpSync("assets/android-notification", "android/app/src/main/res", { recursive: true });
  console.log("Notification icon copied.");
}
