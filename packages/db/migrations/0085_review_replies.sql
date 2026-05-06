-- Wave 5 — Doctor reply to patient review (Gap 4).
-- One reply per review, awaiting admin moderation.
CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  moderated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS review_replies_review_uidx ON review_replies (review_id);
CREATE INDEX IF NOT EXISTS review_replies_doctor_idx ON review_replies (doctor_id);
CREATE INDEX IF NOT EXISTS review_replies_status_idx ON review_replies (status);
