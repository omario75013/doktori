-- lab_order_workflow.sql
-- Idempotent: adds richer workflow columns to lab_orders.

DO $$
BEGIN
  -- internal_ref: lab's own reference number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='internal_ref'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN internal_ref varchar(40);
  END IF;

  -- specimen_collected_at: when sample / scan was taken
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='specimen_collected_at'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN specimen_collected_at timestamptz;
  END IF;

  -- expected_result_at: promised delivery date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='expected_result_at'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN expected_result_at timestamptz;
  END IF;

  -- result_uploaded_at: set automatically when result file is attached
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='result_uploaded_at'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN result_uploaded_at timestamptz;
  END IF;

  -- technician_id: who performed the test/scan
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='technician_id'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN technician_id uuid REFERENCES lab_users(id) ON DELETE SET NULL;
  END IF;

  -- result_summary: short note entered alongside the result
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lab_orders' AND column_name='result_summary'
  ) THEN
    ALTER TABLE lab_orders ADD COLUMN result_summary text;
  END IF;
END $$;
