CREATE TABLE request_limits (
  bucket CHAR(64) NOT NULL,
  window_start BIGINT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE visits (
  visitor_hash CHAR(64) NOT NULL,
  visit_day CHAR(10) NOT NULL,
  PRIMARY KEY (visitor_hash, visit_day),
  INDEX visits_day (visit_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE report_deliveries (
  report_key VARCHAR(40) NOT NULL PRIMARY KEY,
  status VARCHAR(16) NOT NULL,
  claimed_at BIGINT NOT NULL,
  sent_at BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
