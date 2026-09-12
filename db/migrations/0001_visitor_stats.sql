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

INSERT INTO arsvine_visitor_totals (id, total_visitors)
VALUES (TRUE, 0)
ON CONFLICT (id) DO NOTHING;
