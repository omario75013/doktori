import { db, adminNotifications } from "@doktori/db";

export async function createAdminNotification(params: {
  type: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<void> {
  try {
    await db.insert(adminNotifications).values(params);
  } catch (e) {
    console.error("[admin-notifications] failed to create notification:", e);
  }
}
