# Sidebar Additions Required

After both agents complete, add the following entries to `app/clinique/sidebar-nav.tsx`.

## Entries to add to the LINKS array

```typescript
// Add between "Agenda équipe" and "Rendez-vous":
{ href: "/clinique/planning", label: "Planning", icon: CalendarRange },

// Add after "Statistiques":
{ href: "/clinique/notes", label: "Notes internes", icon: StickyNote },
{ href: "/clinique/rapport-journalier", label: "Rapport journalier", icon: Printer },
```

## Import additions required

Add to the existing lucide-react import in `sidebar-nav.tsx`:

```typescript
import {
  // ... existing imports ...
  CalendarRange,
  StickyNote,
  Printer,
} from "lucide-react";
```

## Final LINKS order

1. Dashboard (LayoutDashboard)
2. Agenda équipe (CalendarDays)
3. **Planning** (CalendarRange) ← NEW
4. Rendez-vous (Calendar)
5. Médecins (Users)
6. Patients (UserRound)
7. Secrétaires (UserCog)
8. Statistiques (BarChart3)
9. **Notes internes** (StickyNote) ← NEW
10. **Rapport journalier** (Printer) ← NEW
11. Paramètres (Settings)
