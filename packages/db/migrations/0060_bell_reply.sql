-- 0060 — store the secretary's reply to a bell
ALTER TABLE doctor_bells
  ADD COLUMN IF NOT EXISTS acknowledgment_message text;
