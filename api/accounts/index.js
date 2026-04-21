// api/accounts/index.js
const { sql, authenticate, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, account_type, account_name, account_number, sort_code,
               balance, currency, aer, status, created_at
        FROM accounts
        WHERE user_id = ${payload.userId}
        ORDER BY created_at ASC
      `;
      return ok(res, {
        accounts: rows.map(a => ({
          id:       a.id,
          type:     a.account_type,
          name:     a.account_name,
          number:   a.account_number,
          sortCode: a.sort_code,
          balance:  parseFloat(a.balance),
          currency: a.currency,
          aer:      a.aer,
          status:   a.status,
        }))
      });
    } catch (err) {
      console.error('accounts GET error:', err);
      return fail(res, 'Server error', 500);
    }
  }

  return fail(res, 'Method not allowed', 405);
};
