-- Waiting-room counter — number of patients physically waiting at the
-- cabinet right now. Tracked per doctor; the secretary increments /
-- decrements from the mobile dashboard, the doctor sees the same
-- counter live. Stored in a tiny dedicated table (rather than on the
-- doctors row) so we also keep an `updated_at` for staleness checks.

CREATE TABLE IF NOT EXISTS "doctor_waiting_room" (
  "doctor_id" uuid PRIMARY KEY REFERENCES "doctors"("id") ON DELETE CASCADE,
  "count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by_type" varchar(16),
  "updated_by_id" uuid
);
