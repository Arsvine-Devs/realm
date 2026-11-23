SELECT pg_advisory_xact_lock(hashtext('arsvine_visitor_stats'));

CREATE TABLE IF NOT EXISTS arsvine_visitor_identities (
  visitor_key CHAR(64) PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arsvine_visitor_daily_visits (
  visit_date DATE NOT NULL,
  visitor_key CHAR(64) NOT NULL,
  PRIMARY KEY (visit_date, visitor_key)
);

CREATE TABLE IF NOT EXISTS arsvine_visitor_daily_counts (
  visit_date DATE PRIMARY KEY,
  unique_visitors BIGINT NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arsvine_visitor_totals (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  total_visitors BIGINT NOT NULL DEFAULT 0 CHECK (total_visitors >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arsvine_visitor_baselines (
  baseline_name TEXT PRIMARY KEY,
  added_visitors BIGINT NOT NULL CHECK (added_visitors >= 0),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
  initial_total BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM arsvine_visitor_baselines WHERE baseline_name = 'initial-visitor-count'
  ) THEN
    RETURN;
  END IF;

  initial_total := 410 + floor(random() * 21)::integer;
  TRUNCATE arsvine_visitor_identities, arsvine_visitor_daily_visits, arsvine_visitor_daily_counts;

  INSERT INTO arsvine_visitor_totals (id, total_visitors)
  VALUES (TRUE, initial_total)
  ON CONFLICT (id) DO UPDATE
    SET total_visitors = EXCLUDED.total_visitors,
        updated_at = CURRENT_TIMESTAMP;

  INSERT INTO arsvine_visitor_baselines (baseline_name, added_visitors)
  VALUES ('initial-visitor-count', initial_total);
END $$;
