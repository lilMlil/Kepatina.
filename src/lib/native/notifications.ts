import { isNative } from "./platform";
import { notificationId, planNotifications, type PlanState } from "../notify-plan";

export type NotifPermission = "unsupported" | "default" | "granted" | "denied";

/** Current permission: native local notifications in the app, Notification API on the web. */
export async function getNotifPermission(): Promise<NotifPermission> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const r = await LocalNotifications.checkPermissions();
      return r.display === "granted" ? "granted" : r.display === "denied" ? "denied" : "default";
    } catch {
      return "unsupported";
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPermission;
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const r = await LocalNotifications.requestPermissions();
      return r.display === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }
  if (!("Notification" in window)) return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifPermission;
  } catch {
    return "denied";
  }
}

export async function showTestNotification(title: string, body: string) {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title,
          body,
          schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
        },
      ],
    });
    return;
  }
  try {
    new Notification(title, { body, icon: "./icon-192.png" });
  } catch {
    /* ignore */
  }
}

/**
 * Re-plans every upcoming reminder / medication dose as a native notification.
 * They fire even when the app is closed. Called whenever the data changes.
 */
export async function syncNativeSchedule(state: PlanState, title: string) {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length)
      await LocalNotifications.cancel({
        notifications: pending.notifications.filter((n) => n.id !== 1).map((n) => ({ id: n.id })),
      });
    if (perm.display !== "granted") return;
    const plan = planNotifications(state);
    if (!plan.length) return;
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: notificationId(p.key),
        title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    });
  } catch {
    /* scheduling is best-effort */
  }
}
