// api/transactions/pay.js
const { sql, authenticate, genTxRef, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return fail(res, 'Method not allowed', 405);

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  const { accountId, biller, referenceNo, amount, category = 'Bills' } = req.body || {};

  if (!accountId) return fail(res, 'Account is required');
  if (!biller)    return fail(res, 'Biller name is required');
  if (!amount || amount <= 0) return fail(res, 'Amount must be greater than 0');

  const payAmt = parseFloat(amount);

  try {
    const { rows } = await sql`
      SELECT id, balance FROM accounts
      WHERE id = ${accountId} AND user_id = ${payload.userId} AND status = 'active'
      LIMIT 1
    `;
    if (!rows.length) return fail(res, 'Account not found', 404);
    const acc = rows[0];

    if (parseFloat(acc.balance) < payAmt) return fail(res, 'Insufficient funds');

    const newBal = +(parseFloat(acc.balance) - payAmt).toFixed(2);
    const ref    = genTxRef();

    await sql`UPDATE accounts SET balance = ${newBal} WHERE id = ${acc.id}`;
    await sql`
      INSERT INTO transactions
        (account_id, user_id, description, category, tx_type, amount,
         balance_after, reference, recipient_name, memo, status)
      VALUES
        (${acc.id}, ${payload.userId},
         ${'Bill: ' + biller}, ${category},
         'debit', ${payAmt}, ${newBal},
         ${ref}, ${biller}, ${referenceNo || null}, 'completed')
    `;

    return ok(res, { reference: ref, newBalance: newBal });

  } catch (err) {
    console.error('pay error:', err);
    return fail(res, 'Payment failed. Please try again.', 500);
  }
};
