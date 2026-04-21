// api/auth/register.js
const { sql, hashPassword, genAccountNumber, genClientNo, genUserId,
        signToken, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return fail(res, 'Method not allowed', 405);

  const {
    firstName, lastName, email, phone, address, city, postcode,
    nationality, nationalId, accountType, password
  } = req.body || {};

  // ── Validate ──────────────────────────────────────────────────
  if (!firstName || !lastName)  return fail(res, 'First and last name are required');
  if (!email)                   return fail(res, 'Email is required');
  if (!password || password.length < 8)
                                return fail(res, 'Password must be at least 8 characters');

  try {
    // Check email uniqueness
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;
    if (existing.length) return fail(res, 'An account with this email already exists');

    // Generate identifiers
    const [passwordHash, clientNo, userId, accountNumber] = await Promise.all([
      hashPassword(password),
      genClientNo(),
      genUserId(firstName, lastName),
      genAccountNumber(),
    ]);

    // Insert user
    const { rows: [user] } = await sql`
      INSERT INTO users
        (first_name, last_name, email, phone, address, city, postcode,
         nationality, national_id, user_id, password_hash, client_no, verified)
      VALUES
        (${firstName.trim()}, ${lastName.trim()}, ${email.toLowerCase().trim()},
         ${phone || null}, ${address || null}, ${city || null}, ${postcode || null},
         ${nationality || null}, ${nationalId || null},
         ${userId}, ${passwordHash}, ${clientNo}, true)
      RETURNING id, first_name, last_name, email, user_id, client_no
    `;

    // Create first account
    const accType   = accountType === 'savings' ? 'savings' : 'current';
    const accName   = accType === 'savings' ? 'Savings Account' : 'Current Account';
    const accAer    = accType === 'savings' ? '3.5%' : null;

    const { rows: [account] } = await sql`
      INSERT INTO accounts
        (user_id, account_type, account_name, account_number, balance, aer)
      VALUES
        (${user.id}, ${accType}, ${accName}, ${accountNumber}, 0.00, ${accAer})
      RETURNING id, account_type, account_name, account_number, sort_code, balance, aer, status
    `;

    // Issue JWT
    const token = signToken({ userId: user.id, userIdStr: user.user_id, email: user.email });

    return ok(res, {
      token,
      user: {
        id:        user.id,
        firstName: user.first_name,
        lastName:  user.last_name,
        email:     user.email,
        userId:    user.user_id,
        clientNo:  user.client_no,
      },
      account: {
        id:            account.id,
        type:          account.account_type,
        name:          account.account_name,
        number:        account.account_number,
        sortCode:      account.sort_code,
        balance:       parseFloat(account.balance),
        aer:           account.aer,
        status:        account.status,
      },
    }, 201);

  } catch (err) {
    console.error('Register error:', err);
    return fail(res, 'Registration failed. Please try again.', 500);
  }
};
