// lib/migrate.js
// Run once on deploy to create all database tables.
// Safe to re-run — uses CREATE TABLE IF NOT EXISTS.

const { sql } = require('@vercel/postgres');

async function migrate() {
  console.log('Running NexaBank database migrations…');

  // ── Users table ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name    VARCHAR(80)  NOT NULL,
      last_name     VARCHAR(80)  NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      phone         VARCHAR(30),
      address       TEXT,
      city          VARCHAR(80),
      postcode      VARCHAR(20),
      nationality   VARCHAR(80),
      national_id   VARCHAR(80),
      user_id       VARCHAR(60)  NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      client_no     VARCHAR(20)  NOT NULL UNIQUE,
      verified      BOOLEAN      DEFAULT FALSE,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Accounts table ───────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_type  VARCHAR(20)  NOT NULL CHECK (account_type IN ('current','savings','investment')),
      account_name  VARCHAR(120) NOT NULL,
      account_number VARCHAR(12) NOT NULL UNIQUE,
      sort_code     VARCHAR(10)  NOT NULL DEFAULT '20-74-09',
      balance       NUMERIC(18,2) NOT NULL DEFAULT 0.00,
      currency      VARCHAR(5)   NOT NULL DEFAULT 'USD',
      aer           VARCHAR(10),
      status        VARCHAR(20)  NOT NULL DEFAULT 'active',
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Transactions table ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id     UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      user_id        UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      description    VARCHAR(255) NOT NULL,
      category       VARCHAR(60)  NOT NULL DEFAULT 'Other',
      tx_type        VARCHAR(10)  NOT NULL CHECK (tx_type IN ('credit','debit')),
      amount         NUMERIC(18,2) NOT NULL CHECK (amount > 0),
      balance_after  NUMERIC(18,2) NOT NULL,
      reference      VARCHAR(60)  NOT NULL,
      recipient_name VARCHAR(120),
      recipient_iban VARCHAR(40),
      memo           TEXT,
      status         VARCHAR(20)  NOT NULL DEFAULT 'completed',
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Cards table ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id     UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      user_id        UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      card_number    VARCHAR(20)  NOT NULL UNIQUE,
      card_type      VARCHAR(20)  NOT NULL DEFAULT 'debit',
      expiry         VARCHAR(7)   NOT NULL DEFAULT '12/28',
      daily_limit    NUMERIC(18,2) NOT NULL DEFAULT 5000.00,
      status         VARCHAR(20)  NOT NULL DEFAULT 'active',
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Standing orders table ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS standing_orders (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id     UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      recipient_name VARCHAR(120) NOT NULL,
      recipient_iban VARCHAR(40),
      amount         NUMERIC(18,2) NOT NULL,
      frequency      VARCHAR(20)  NOT NULL DEFAULT 'monthly',
      next_date      DATE         NOT NULL,
      reference      VARCHAR(120),
      status         VARCHAR(20)  NOT NULL DEFAULT 'active',
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Savings goals table ──────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           VARCHAR(120) NOT NULL,
      target_amount  NUMERIC(18,2) NOT NULL,
      saved_amount   NUMERIC(18,2) NOT NULL DEFAULT 0.00,
      color          VARCHAR(30)  DEFAULT 'var(--or)',
      created_at     TIMESTAMPTZ  DEFAULT NOW()
    );
  `;

  // ── Indexes for performance ──────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tx_account    ON transactions(account_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tx_user       ON transactions(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tx_created    ON transactions(created_at DESC);`;

  console.log('✅  All migrations complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
