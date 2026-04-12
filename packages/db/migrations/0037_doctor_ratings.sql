ALTER TABLE doctors ADD COLUMN IF NOT EXISTS average_rating numeric(2,1) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Backfill from existing published reviews
UPDATE doctors d SET
  average_rating = sub.avg_rating,
  review_count = sub.cnt
FROM (
  SELECT doctor_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*) AS cnt
  FROM reviews WHERE status = 'published'
  GROUP BY doctor_id
) sub
WHERE d.id = sub.doctor_id;
