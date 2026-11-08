import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "lv.kepatina.app",
  appName: "Ķepatiņa",
  webDir: "dist",
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#fcfaf0",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_kepatina",
      iconColor: "#2f6b4f",
    },
  },
};

export default config;
