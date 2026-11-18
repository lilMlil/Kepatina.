// Run automatically by `npm run ios:init` after `cap add ios`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = "ios/App/App/Info.plist";
if (!existsSync(file)) {
  console.error("Info.plist not found — run `npx cap add ios` first.");
  process.exit(1);
}

let plist = readFileSync(file, "utf8");
if (!plist.includes("<key>NSMicrophoneUsageDescription</key>")) {
  const updated = plist.replace(
    /<\/dict>(\s*<\/plist>\s*)$/,
    "    <key>NSMicrophoneUsageDescription</key>\n    <string>Ķepatiņa uses the microphone only when you record a family chat voice message.</string>\n</dict>$1",
  );
  if (updated === plist) throw new Error("Could not find the root dictionary in Info.plist.");
  plist = updated;
}
writeFileSync(file, plist);
console.log("Info.plist patched: microphone permission");
