# Demo Credentials

All accounts share the same password: **Demo2026!**

---

## Clinic

| Field    | Value                            |
|----------|----------------------------------|
| Email    | contact@clinique-elmanar.tn      |
| Password | Demo2026!                        |
| URL      | /clinique-login                  |
| Name     | Clinique El Manar                |
| City     | Tunis                            |
| Plan     | clinique                         |

---

## Doctors

| Name              | Specialty         | City      | Email                      | Password  | URL         |
|-------------------|-------------------|-----------|-----------------------------|-----------|-------------|
| Dr. Sami Bouaziz  | Médecin Généraliste | Tunis   | sami.bouaziz@doktori.tn     | Demo2026! | /connexion  |
| Dr. Leila Khelifi | Dermatologue      | Tunis     | leila.khelifi@doktori.tn    | Demo2026! | /connexion  |
| Dr. Nour Hammami  | Pédiatre          | Tunis     | nour.hammami@doktori.tn     | Demo2026! | /connexion  |
| Dr. Yassine Tlili | Cardiologue       | La Marsa  | yassine.tlili@doktori.tn    | Demo2026! | /connexion  |

**Clinic doctors** (El Manar): Bouaziz (admin), Khelifi (member), Hammami (member)
**Independent**: Tlili (own cabinet in La Marsa, not linked to clinic)

---

## Secretaries

| Name             | Assigned To       | Email                      | Password  | URL                 |
|------------------|-------------------|-----------------------------|-----------|---------------------|
| Mme Fatma Saidi  | Dr. Bouaziz (clinic) | fatma.saidi@doktori.tn   | Demo2026! | /secretaire-login   |
| Mme Ines Gharbi  | Dr. Tlili (indep.)   | ines.gharbi@doktori.tn   | Demo2026! | /secretaire-login   |

---

## Patients (OTP login — phone number)

| Name              | Phone         | URL                  |
|-------------------|---------------|----------------------|
| Ahmed Ben Salah   | +21698111111  | /connexion-patient   |
| Mariem Trabelsi   | +21697222222  | /connexion-patient   |
| Khaled Mejri      | +21655333333  | /connexion-patient   |
| Sana Jebali       | +21690444444  | /connexion-patient   |
| Youssef Belhaj    | +21622555555  | /connexion-patient   |

---

## Demo Data Summary

### Appointments
| # | Patient           | Doctor            | Date          | Time  | Status    | Type        |
|---|-------------------|-------------------|---------------|-------|-----------|-------------|
| 1 | Ahmed Ben Salah   | Dr. Bouaziz       | Mon (D-5)     | 08:00 | completed | cabinet     |
| 2 | Mariem Trabelsi   | Dr. Khelifi       | Mon (D-5)     | 09:00 | completed | cabinet     |
| 3 | Khaled Mejri      | Dr. Tlili         | Tue (D-4)     | 08:00 | completed | cabinet     |
| 4 | Sana Jebali       | Dr. Hammami       | Tue (D-4)     | 14:00 | completed | teleconsult |
| 5 | Youssef Belhaj    | Dr. Bouaziz       | Wed (D-3)     | 10:00 | completed | cabinet     |
| 6 | Ahmed Ben Salah   | Dr. Tlili         | Wed (D-3)     | 14:00 | completed | teleconsult |
| 7 | Mariem Trabelsi   | Dr. Bouaziz       | Today         | 08:00 | confirmed | cabinet     |
| 8 | Khaled Mejri      | Dr. Khelifi       | Today         | 09:00 | confirmed | cabinet     |
| 9 | Sana Jebali       | Dr. Hammami       | Today         | 14:00 | pending   | cabinet     |
|10 | Youssef Belhaj    | Dr. Tlili         | Today         | 10:00 | confirmed | cabinet     |
|11 | Ahmed Ben Salah   | Dr. Khelifi       | Tomorrow      | 09:00 | pending   | teleconsult |
|12 | Mariem Trabelsi   | Dr. Tlili         | Tomorrow      | 08:00 | confirmed | cabinet     |
|13 | Khaled Mejri      | Dr. Hammami       | D+3           | 08:00 | pending   | cabinet     |

### Reviews (published, 4–5 stars)
- Ahmed → Dr. Bouaziz ⭐⭐⭐⭐⭐
- Mariem → Dr. Khelifi ⭐⭐⭐⭐⭐
- Khaled → Dr. Tlili ⭐⭐⭐⭐
- Sana → Dr. Hammami ⭐⭐⭐⭐⭐
- Youssef → Dr. Bouaziz ⭐⭐⭐⭐

### Subscriptions
All 4 doctors on **trial** status (active, 0 DT — 30-day trial window).

### Wallets (balance in millimes — divide by 1000 for DT)
| Doctor     | Balance   | Total Earned |
|------------|-----------|--------------|
| Dr. Bouaziz  | 120 DT  | 350 DT       |
| Dr. Khelifi  | 245 DT  | 580 DT       |
| Dr. Hammami  | 80 DT   | 210 DT       |
| Dr. Tlili    | 310 DT  | 720 DT       |

---

## Fixed UUIDs Reference

| Entity           | UUID                                     |
|------------------|------------------------------------------|
| Clinic El Manar  | c1000000-0000-0000-0000-000000000001     |
| Dr. Bouaziz      | d1000000-0000-0000-0000-000000000001     |
| Dr. Khelifi      | d1000000-0000-0000-0000-000000000002     |
| Dr. Hammami      | d1000000-0000-0000-0000-000000000003     |
| Dr. Tlili        | d1000000-0000-0000-0000-000000000004     |
| Secretary Fatma  | s1000000-0000-0000-0000-000000000001     |
| Secretary Ines   | s1000000-0000-0000-0000-000000000002     |
| Patient Ahmed    | p1000000-0000-0000-0000-000000000001     |
| Patient Mariem   | p1000000-0000-0000-0000-000000000002     |
| Patient Khaled   | p1000000-0000-0000-0000-000000000003     |
| Patient Sana     | p1000000-0000-0000-0000-000000000004     |
| Patient Youssef  | p1000000-0000-0000-0000-000000000005     |

---

## Migration

File: `packages/db/migrations/0052_demo_presentation_data.sql`

To apply:
```bash
# From project root
pnpm db:migrate
# or directly
psql $DATABASE_URL -f packages/db/migrations/0052_demo_presentation_data.sql
```

The migration is fully idempotent — safe to re-run (`ON CONFLICT DO NOTHING` on all inserts).
