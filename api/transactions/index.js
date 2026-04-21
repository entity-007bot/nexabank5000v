// api/transactions/index.js
const { sql, authenticate, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return fail(res, 'Method not allowed', 405);

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  const { accountId, type, search, limit = 60, offset = 0 } = req.query || {};

  try {
    let rows;

    if (accountId) {
      // Verify this account belongs to the user
      const { rows: acc } = await sql`
        SELECT id FROM accounts WHERE id = ${accountId} AND user_id = ${payload.userId} LIMIT 1
      `;
      if (!acc.length) return fail(res, 'Account not found or access denied', 403);

      if (type && type !== 'all') {
        ({ rows } = await sql`
          SELECT t.id, t.account_id, t.description, t.category, t.tx_type, t.amount,
                 t.balance_after, t.reference, t.recipient_name, t.memo, t.status, t.created_at,
                 a.account_name, a.account_number
          FROM transactions t
          JOIN accounts a ON a.id = t.account_id
          WHERE t.account_id = ${accountId}
            AND t.user_id    = ${payload.userId}
            AND t.tx_type    = ${type}
          ORDER BY t.created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `);
      } else {
        ({ rows } = await sql`
          SELECT t.id, t.account_id, t.description, t.category, t.tx_type, t.amount,
                 t.balance_after, t.reference, t.recipient_name, t.memo, t.status, t.created_at,
                 a.account_name, a.account_number
          FROM transactions t
          JOIN accounts a ON a.id = t.account_id
          WHERE t.account_id = ${accountId}
            AND t.user_id    = ${payload.userId}
          ORDER BY t.created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `);
      }
    } else {
      // All accounts
      ({ rows } = await sql`
        SELECT t.id, t.account_id, t.description, t.category, t.tx_type, t.amount,
               t.balance_after, t.reference, t.recipient_name, t.memo, t.status, t.created_at,
               a.account_name, a.account_number
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE t.user_id = ${payload.userId}
        ORDER BY t.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `);
    }

    // Optional description search (done in-memory for simplicity)
    let txList = rows;
    if (search) {
      const q = search.toLowerCase();
      txList = rows.filter(r =>
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)    ||
        r.reference.toLowerCase().includes(q)
      );
    }

    return ok(res, {
      transactions: txList.map(t => ({
        id:            t.id,
        accountId:     t.account_id,
        accountName:   t.account_name,
        accountNumber: t.account_number,
        description:   t.description,
        category:      t.category,
        type:          t.tx_type,
        amount:        parseFloat(t.amount),
        balanceAfter:  parseFloat(t.balance_after),
        reference:     t.reference,
        recipientName: t.recipient_name,
        memo:          t.memo,
        status:        t.status,
        createdAt:     t.created_at,
      }))
    });

  } catch (err) {
    console.error('transactions GET error:', err);
    return fail(res, 'Server error', 500);
  }
};
