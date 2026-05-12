import { redirect } from "next/navigation";

// Peer-doctor chat moved to /messagerie (the patient ↔ doctor surface was
// retired). Preserve old deep links — `?peer=` and `?conv=` are read by
// the new page — by forwarding the full query string.
export default async function ReseauMessagerieRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
  }
  const target = qs.toString() ? `/messagerie?${qs.toString()}` : "/messagerie";
  redirect(target);
}
