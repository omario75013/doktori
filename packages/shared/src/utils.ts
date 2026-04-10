export function generateSlug(name: string, specialty: string, city: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  return `${normalize(name)}-${normalize(specialty)}-${normalize(city)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("216")) return `+${digits}`;
  if (digits.startsWith("0")) return `+216${digits.slice(1)}`;
  return `+216${digits}`;
}
