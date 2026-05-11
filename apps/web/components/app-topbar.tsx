import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
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
  const [session, cookieStore, tTop] = await Promise.all([
    auth(),
    cookies(),
    getTranslations("topbar"),
  ]);
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "fr";
  const user = session?.user;

  const notifEnabled =
    showNotifications ?? (role === "doctor" || role === "secretary" || role === "admin");

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-4 backdrop-blur px-4 lg:px-6"
      style={{
        background: "rgba(255,255,255,0.85)",
        borderBottom: "1px solid var(--line-cool)",
      }}
    >
      {title && (
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <span
            className="text-base font-extrabold truncate"
            style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
          >
            {title}
          </span>
        </div>
      )}

      {/* Global search — submits a GET to the most relevant search page based on role */}
      <form
        role="search"
        action={
          role === "doctor"
            ? "/patients"
            : role === "admin"
            ? "/admin/patients"
            : role === "secretary"
            ? "/secretaire/patients"
            : role === "clinic"
            ? "/clinique/medecins"
            : "/recherche"
        }
        method="GET"
        className="flex-1 max-w-[480px] hidden md:flex items-center gap-2 rounded-full px-3 h-9"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--line-cool)",
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--ink-500)" }} />
        <input
          name="q"
          type="search"
          autoComplete="off"
          placeholder={
            role === "doctor"
              ? tTop("searchDoctor")
              : role === "admin"
              ? tTop("searchAdmin")
              : tTop("searchDefault")
          }
          aria-label="Recherche globale"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px]"
          style={{ color: "var(--ink-900)" }}
        />
      </form>

      <div className="flex items-center gap-2 shrink-0 ms-auto">
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
