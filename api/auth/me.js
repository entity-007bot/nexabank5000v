// api/auth/me.js
const { sql, authenticate, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return fail(res, 'Method not allowed', 405);

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  try {
    const { rows: users } = await sql`
      SELECT id, first_name, last_name, email, phone, address, city,
             postcode, user_id, client_no, created_at
      FROM users WHERE id = ${payload.userId} LIMIT 1
    `;
    if (!users.length) return fail(res, 'User not found', 404);
    const user = users[0];

    const { rows: accounts } = await sql`
      SELECT id, account_type, account_name, account_number, sort_code,
             balance, currency, aer, status, created_at
      FROM accounts
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    return ok(res, {
      user: {
        id:        user.id,
        firstName: user.first_name,
        lastName:  user.last_name,
        email:     user.email,
        phone:     user.phone,
        address:   user.address,
        city:      user.city,
        postcode:  user.postcode,
        userId:    user.user_id,
        clientNo:  user.client_no,
      },
      accounts: accounts.map(a => ({
        id:        a.id,
        type:      a.account_type,
        name:      a.account_name,
        number:    a.account_number,
        sortCode:  a.sort_code,
        balance:   parseFloat(a.balance),
        currency:  a.currency,
        aer:       a.aer,
        status:    a.status,
      })),
    });

  } catch (err) {
    console.error('/me error:', err);
    return fail(res, 'Server error', 500);
  }
};
