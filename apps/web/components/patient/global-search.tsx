"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Stethoscope,
  Calendar,
  FileText,
  Users,
  Heart,
  X,
} from "lucide-react";

interface DoctorHit {
  name: string;
  slug: string;
  specialty?: string | null;
  city?: string | null;
  photoUrl?: string | null;
}

interface Appointment {
  id: string;
  startsAt: string;
  doctorName: string;
  doctorSlug: string;
  beneficiaryName: string | null;
  reason: string | null;
}

interface Dependent {
  id: string;
  name: string;
  relation: string | null;
}

interface Favorite {
  doctorSlug: string;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorPhotoUrl: string | null;
}

interface Attachment {
  id: string;
  title: string;
  filename: string;
  category: string;
  fileUrl: string;
}

type Group = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    key: string;
    title: string;
    sub?: string;
    href: string;
    photoUrl?: string | null;
  }>;
};

const CATEGORY_LABEL: Record<string, string> = {
  rx: "Ordonnance",
  lab: "Analyse",
  xr: "Radiologie",
  rep: "Compte-rendu",
  ins: "Carte assurance",
  autre: "Document",
};

export function GlobalSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorHit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Lazy-load patient-owned data on first focus (cached for session)
  async function loadOwn() {
    if (loaded) return;
    setLoaded(true);
    Promise.all([
      fetch("/api/appointments/patient", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setAppointments(Array.isArray(d) ? d : []))
        .catch(() => {}),
      fetch("/api/me/dependents", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setDependents(Array.isArray(d.items) ? d.items : []))
        .catch(() => {}),
      fetch("/api/me/favorites", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setFavorites(Array.isArray(d.items) ? d.items : []))
        .catch(() => {}),
      fetch("/api/me/attachments", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setAttachments(Array.isArray(d.items) ? d.items : []))
        .catch(() => {}),
    ]);
  }

  // Debounced doctor search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDoctors([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d) => setDoctors(Array.isArray(d.hits) ? d.hits.slice(0, 5) : []))
        .catch(() => {});
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const groups: Group[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);

    const docMatches = doctors.map((d) => ({
      key: `doc-${d.slug}`,
      title: d.name,
      sub: [d.specialty, d.city].filter(Boolean).join(" · "),
      href: `/medecin/${d.slug}`,
      photoUrl: d.photoUrl,
    }));

    const apptMatches = appointments
      .filter(
        (a) =>
          matches(a.doctorName) || matches(a.beneficiaryName) || matches(a.reason),
      )
      .slice(0, 5)
      .map((a) => ({
        key: `appt-${a.id}`,
        title: a.doctorName,
        sub: new Date(a.startsAt).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        href: "/mes-rdv",
      }));

    const depMatches = dependents
      .filter((d) => matches(d.name) || matches(d.relation))
      .slice(0, 5)
      .map((d) => ({
        key: `dep-${d.id}`,
        title: d.name,
        sub: d.relation ?? undefined,
        href: "/ma-famille",
      }));

    const favMatches = favorites
      .filter((f) => matches(f.doctorName) || matches(f.doctorSpecialty))
      .slice(0, 5)
      .map((f) => ({
        key: `fav-${f.doctorSlug}`,
        title: f.doctorName,
        sub: f.doctorSpecialty ?? undefined,
        href: `/medecin/${f.doctorSlug}`,
        photoUrl: f.doctorPhotoUrl,
      }));

    const attMatches = attachments
      .filter((a) => matches(a.title) || matches(a.filename))
      .slice(0, 5)
      .map((a) => ({
        key: `att-${a.id}`,
        title: a.title || a.filename,
        sub: CATEGORY_LABEL[a.category] ?? "Document",
        href: a.fileUrl,
      }));

    const out: Group[] = [];
    if (docMatches.length) out.push({ key: "doc", label: "Médecins", icon: Stethoscope, items: docMatches });
    if (apptMatches.length) out.push({ key: "appt", label: "Rendez-vous", icon: Calendar, items: apptMatches });
    if (depMatches.length) out.push({ key: "dep", label: "Proches", icon: Users, items: depMatches });
    if (favMatches.length) out.push({ key: "fav", label: "Favoris", icon: Heart, items: favMatches });
    if (attMatches.length) out.push({ key: "att", label: "Documents", icon: FileText, items: attMatches });
    return out;
  }, [query, doctors, appointments, dependents, favorites, attachments]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noreferrer");
    } else {
      router.push(href);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={wrapRef} className="tb-search relative">
      <form onSubmit={onSubmit} role="search" className="flex items-center gap-2 w-full">
        <Search className="w-4 h-4 shrink-0" strokeWidth={2} />
        <input
          name="q"
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            void loadOwn();
          }}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px]"
          aria-label="Recherche globale"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer"
            className="p-1 rounded hover:bg-[color:var(--surface-2)]"
            style={{ color: "var(--ink-500)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {open && query.trim().length >= 1 && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            background: "#fff",
            border: "1px solid var(--line-cool)",
            boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
            top: "100%",
          }}
        >
          {groups.length === 0 ? (
            <div className="px-3 py-3 text-[13px]" style={{ color: "var(--ink-500)" }}>
              Aucun résultat — appuyez sur Entrée pour chercher dans tous les médecins.
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              {groups.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.key}>
                    <div
                      className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: "var(--ink-500)", background: "var(--surface-2)" }}
                    >
                      <Icon className="w-3 h-3" />
                      {g.label}
                    </div>
                    <ul>
                      {g.items.map((it) => {
                        const initials = it.title
                          .replace(/^Dr\.?\s*/i, "")
                          .split(/\s+/)
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <li key={it.key}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                go(it.href);
                              }}
                              className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[color:var(--surface-2)]"
                            >
                              <div
                                className="w-8 h-8 rounded-full overflow-hidden grid place-items-center text-[10.5px] font-extrabold text-white shrink-0"
                                style={{
                                  background:
                                    "linear-gradient(135deg, var(--primary-400), var(--primary-600))",
                                }}
                              >
                                {it.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={it.photoUrl}
                                    alt={it.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  initials || "?"
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-semibold text-[13.5px] truncate"
                                  style={{ color: "var(--ink-900)" }}
                                >
                                  {it.title}
                                </div>
                                {it.sub && (
                                  <div
                                    className="text-[11.5px] truncate"
                                    style={{ color: "var(--ink-500)" }}
                                  >
                                    {it.sub}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
