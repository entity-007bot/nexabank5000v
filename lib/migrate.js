// lib/migrate.js
const { sql } = require('./db');

async function migrate() {
  console.log("Running NexaBank migrations...");

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

  await sql`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(80),
    postcode VARCHAR(20),
    nationality VARCHAR(80),
    national_id VARCHAR(80),
    user_id VARCHAR(60) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    client_no VARCHAR(20) UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `;

  await sql`
  CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(20),
    account_name VARCHAR(120),
    account_number VARCHAR(12) UNIQUE,
    sort_code VARCHAR(10) DEFAULT '20-74-09',
    balance NUMERIC(18,2) DEFAULT 0,
    currency VARCHAR(5) DEFAULT 'USD',
    aer VARCHAR(10),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `;

  await sql`
  CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255),
    category VARCHAR(60),
    tx_type VARCHAR(10),
    amount NUMERIC(18,2),
    balance_after NUMERIC(18,2),
    reference VARCHAR(60),
    recipient_name VARCHAR(120),
    recipient_iban VARCHAR(40),
    memo TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `;

  console.log("✅ Database migration complete");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
