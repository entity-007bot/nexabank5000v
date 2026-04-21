// api/auth/login.js
const { sql, checkPassword, signToken, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return fail(res, 'Method not allowed', 405);

  const { identifier, password } = req.body || {};

  if (!identifier) return fail(res, 'Please enter your User ID or email');
  if (!password)   return fail(res, 'Please enter your password');

  try {
    // Find user by email OR user_id
    const { rows } = await sql`
      SELECT id, first_name, last_name, email, user_id, client_no, password_hash
      FROM users
      WHERE email = ${identifier.toLowerCase().trim()}
         OR user_id = ${identifier.trim()}
      LIMIT 1
    `;

    if (!rows.length) return fail(res, 'Invalid credentials', 401);

    const user = rows[0];
    const valid = await checkPassword(password, user.password_hash);
    if (!valid) return fail(res, 'Invalid credentials', 401);

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
    });

  } catch (err) {
    console.error('Login error:', err);
    return fail(res, 'Login failed. Please try again.', 500);
  }
};
