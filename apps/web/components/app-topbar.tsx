import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationsBell } from "@/components/notifications-bell";
import { ProfileMenu } from "@/components/profile-menu";

type Role = "doctor" | "admin" | "clinic" | "secretary" | "patient";

type Props = {
  role: Role;
  /** Title shown on the left of the topbar (defaults to "Doktori") */
  title?: string;
  /** Show the notifications bell. Defaults to true for doctor/secretary. */
  showNotifications?: boolean;
};

export async function AppTopBar({ role, title, showNotifications }: Props) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "fr";
  const user = session?.user;

  const notifEnabled =
    showNotifications ?? (role === "doctor" || role === "secretary" || role === "admin");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title ?? "Doktori"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher currentLocale={locale} />
        {notifEnabled && <NotificationsBell role={role} />}
        <ProfileMenu
          role={role}
          name={user?.name ?? null}
          email={user?.email ?? null}
          image={user?.image ?? null}
        />
      </div>
    </header>
  );
}
