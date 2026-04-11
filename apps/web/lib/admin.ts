const emails = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return emails.includes(email.toLowerCase());
}

export function getSuperAdminEmails(): string[] {
  return [...emails];
}
