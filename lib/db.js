// lib/db.js  — shared helpers for all API routes

const { sql }    = require('@vercel/postgres');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexabank-dev-secret-change-in-production';
const JWT_TTL    = '7d';

// ── Auth helpers ──────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── Extract bearer token from request ────────────────────────

function getBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// ── Authenticate middleware (call inside each handler) ────────

function authenticate(req) {
  const token   = getBearerToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload;            // { userId, userIdStr, email }  or null
}

// ── Generate a unique account number ─────────────────────────

async function genAccountNumber() {
  while (true) {
    const num = String(Math.floor(10000000 + Math.random() * 89999999));
    const { rows } = await sql`
      SELECT id FROM accounts WHERE account_number = ${num} LIMIT 1
    `;
    if (!rows.length) return num;
  }
}

// ── Generate a unique client number ──────────────────────────

async function genClientNo() {
  while (true) {
    const no = 'CL-' + String(Math.floor(100000 + Math.random() * 899999));
    const { rows } = await sql`
      SELECT id FROM users WHERE client_no = ${no} LIMIT 1
    `;
    if (!rows.length) return no;
  }
}

// ── Generate a unique user_id string ─────────────────────────

async function genUserId(firstName, lastName) {
  const base = (firstName[0] + lastName).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12);
  let attempt = base;
  let i = 1;
  while (true) {
    const { rows } = await sql`
      SELECT id FROM users WHERE user_id = ${attempt} LIMIT 1
    `;
    if (!rows.length) return attempt;
    attempt = base + i++;
  }
}

// ── Generate transaction reference ───────────────────────────

function genTxRef() {
  return 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}

// ── Standard JSON responses ───────────────────────────────────

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, ...data });
}

function fail(res, message, status = 400) {
  res.status(status).json({ success: false, error: message });
}

// ── CORS preflight helper ─────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

module.exports = {
  sql, signToken, verifyToken, hashPassword, checkPassword,
  getBearerToken, authenticate, genAccountNumber, genClientNo,
  genUserId, genTxRef, ok, fail, cors
};
