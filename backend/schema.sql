-- Intellecta Database Schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  iq_score INTEGER NOT NULL,
  age_group VARCHAR(20) CHECK (age_group IN ('kids','teens','adults','seniors')),
  percentile INTEGER,
  is_paid BOOLEAN DEFAULT FALSE,
  payment_id VARCHAR(100),
  cert_id VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  payment_id VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_iq ON results(iq_score DESC);
CREATE INDEX IF NOT EXISTS idx_results_age ON results(age_group);
CREATE INDEX IF NOT EXISTS idx_results_paid ON results(is_paid);
CREATE INDEX IF NOT EXISTS idx_results_cert ON results(cert_id);
