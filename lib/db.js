const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexabank-dev-secret-change-in-production';
const JWT_TTL = '7d';

// ── DATABASE CONNECTION (FIXED) ──────────────────────────────

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const sql = (text, params) => pool.query(text, params);
