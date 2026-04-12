CREATE TABLE IF NOT EXISTS mobile_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event varchar(50) NOT NULL,
  platform varchar(10) NOT NULL, -- 'ios' | 'android' | 'web'
  app_version varchar(20),
  build_number varchar(10),
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mobile_analytics_event_idx ON mobile_analytics(event, created_at DESC);
CREATE INDEX mobile_analytics_platform_idx ON mobile_analytics(platform, created_at DESC);
CREATE INDEX mobile_analytics_version_idx ON mobile_analytics(app_version, created_at DESC);
