-- Create tables for Duvbo Grindar charging portal

-- Drop existing tables if they exist
DROP TABLE IF EXISTS hourly_energy CASCADE;
DROP TABLE IF EXISTS spotprices CASCADE;
DROP TABLE IF EXISTS chargers CASCADE;

-- Create chargers table
CREATE TABLE chargers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Create hourly_energy table
CREATE TABLE hourly_energy (
    id SERIAL PRIMARY KEY,
    charger_id TEXT NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    kwh NUMERIC NOT NULL,
    UNIQUE(charger_id, ts)
);

-- Create spotprices table
CREATE TABLE spotprices (
    ts TIMESTAMPTZ PRIMARY KEY,
    price_sek_per_kwh NUMERIC NOT NULL
);

-- Create settings table for fixed costs and other configuration
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for better query performance
CREATE INDEX idx_hourly_energy_charger_ts ON hourly_energy(charger_id, ts);
CREATE INDEX idx_hourly_energy_ts ON hourly_energy(ts);
CREATE INDEX idx_spotprices_ts ON spotprices(ts);

-- Seed chargers (EH001 through EH010)
INSERT INTO chargers (id, name) VALUES 
    ('EH001', 'Charger 1'),
    ('EH002', 'Charger 2'),
    ('EH003', 'Charger 3'),
    ('EH004', 'Charger 4'),
    ('EH005', 'Charger 5'),
    ('EH006', 'Charger 6'),
    ('EH007', 'Charger 7'),
    ('EH008', 'Charger 8'),
    ('EH009', 'Charger 9'),
    ('EH010', 'Charger 10');

-- Initialize default settings
INSERT INTO settings (key, value, description) VALUES 
    ('use_fixed_price', 'false', 'Whether to use fixed price instead of spot prices'),
    ('fixed_price_sek_per_kwh', '0', 'Fixed price in SEK per kWh when use_fixed_price is true (overrides all other pricing)'),
    ('vat_percentage', '25', 'VAT percentage applied to spot prices (e.g., 25 for 25%)'),
    ('fixed_cost_sek_per_kwh', '0', 'Fixed cost per kWh added on top of spot price and VAT (e.g., grid fees, markup)');

-- Grant necessary permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
