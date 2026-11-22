// Run automatically by `npm run android:init` right after `cap add android`.
// Adds the permissions the app needs (notifications, exact alarms, location).
import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from "node:fs";

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
  "android.permission.RECORD_AUDIO",
  // Capacitor asks for this together with RECORD_AUDIO when the WebView opens the microphone;
  // without it the whole request is denied ("Permission denied") even if RECORD_AUDIO is granted.
  "android.permission.MODIFY_AUDIO_SETTINGS",
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

// "Open with" for documents (PDF, Word, ...): a tiny native plugin, see src/lib/native/open-file.ts.
// It hands a file from the app cache to whichever app can open it, through Capacitor's FileProvider.
const javaDir = "android/app/src/main/java/lv/kepatina/app";
if (existsSync(javaDir)) {
  mkdirSync(javaDir, { recursive: true });
  writeFileSync(
    `${javaDir}/FileOpenerPlugin.java`,
    `package lv.kepatina.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "FileOpener")
public class FileOpenerPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String path = call.getString("path");
        String mimeType = call.getString("mimeType", "*/*");
        if (path == null) {
            call.reject("path is missing");
            return;
        }
        try {
            File file = new File(Uri.parse(path).getPath());
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("no_app");
        } catch (Exception e) {
            call.reject("open_failed: " + e.getMessage());
        }
    }
}
`,
  );
  writeFileSync(
    `${javaDir}/MainActivity.java`,
    `package lv.kepatina.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileOpenerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`,
  );
  console.log("FileOpener plugin added.");
} else {
  console.warn("Android java folder not found; documents will open through the share sheet.");
}
