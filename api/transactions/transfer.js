// api/transactions/transfer.js
const { sql, authenticate, genTxRef, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return fail(res, 'Method not allowed', 405);

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  const { fromAccountId, toAccountId, recipientName, recipientIban,
          amount, memo } = req.body || {};

  if (!fromAccountId)           return fail(res, 'Source account is required');
  if (!amount || amount <= 0)   return fail(res, 'Amount must be greater than 0');
  if (!recipientName && !toAccountId) return fail(res, 'Recipient name is required');

  const transferAmt = parseFloat(amount);

  try {
    // Load source account (must belong to user)
    const { rows: srcRows } = await sql`
      SELECT id, balance, account_name, user_id
      FROM accounts
      WHERE id = ${fromAccountId} AND user_id = ${payload.userId} AND status = 'active'
      LIMIT 1
    `;
    if (!srcRows.length) return fail(res, 'Source account not found or inactive', 403);
    const src = srcRows[0];

    const srcBalance = parseFloat(src.balance);
    if (srcBalance < transferAmt) return fail(res, 'Insufficient funds');

    const ref = genTxRef();

    // ── Internal transfer (own account) ──────────────────────
    if (toAccountId) {
      const { rows: dstRows } = await sql`
        SELECT id, balance, account_name, user_id
        FROM accounts
        WHERE id = ${toAccountId} AND user_id = ${payload.userId} AND status = 'active'
        LIMIT 1
      `;
      if (!dstRows.length) return fail(res, 'Destination account not found', 404);
      const dst = dstRows[0];

      const newSrcBal = +(srcBalance - transferAmt).toFixed(2);
      const newDstBal = +(parseFloat(dst.balance) + transferAmt).toFixed(2);

      // Update both balances atomically-ish
      await sql`UPDATE accounts SET balance = ${newSrcBal} WHERE id = ${src.id}`;
      await sql`UPDATE accounts SET balance = ${newDstBal} WHERE id = ${dst.id}`;

      // Debit tx on source
      await sql`
        INSERT INTO transactions
          (account_id, user_id, description, category, tx_type, amount, balance_after,
           reference, recipient_name, memo, status)
        VALUES
          (${src.id}, ${payload.userId},
           ${'Transfer to ' + dst.account_name}, 'Transfer',
           'debit', ${transferAmt}, ${newSrcBal},
           ${ref}, ${dst.account_name}, ${memo||null}, 'completed')
      `;

      // Credit tx on destination
      await sql`
        INSERT INTO transactions
          (account_id, user_id, description, category, tx_type, amount, balance_after,
           reference, recipient_name, memo, status)
        VALUES
          (${dst.id}, ${payload.userId},
           ${'Transfer from ' + src.account_name}, 'Transfer',
           'credit', ${transferAmt}, ${newDstBal},
           ${ref}, ${src.account_name}, ${memo||null}, 'completed')
      `;

      return ok(res, { reference: ref, newBalance: newSrcBal });
    }

    // ── External transfer ─────────────────────────────────────
    const newSrcBal = +(srcBalance - transferAmt).toFixed(2);
    await sql`UPDATE accounts SET balance = ${newSrcBal} WHERE id = ${src.id}`;
    await sql`
      INSERT INTO transactions
        (account_id, user_id, description, category, tx_type, amount, balance_after,
         reference, recipient_name, recipient_iban, memo, status)
      VALUES
        (${src.id}, ${payload.userId},
         ${'Payment to ' + recipientName}, 'Transfer',
         'debit', ${transferAmt}, ${newSrcBal},
         ${ref}, ${recipientName}, ${recipientIban||null}, ${memo||null}, 'completed')
    `;

    return ok(res, { reference: ref, newBalance: newSrcBal });

  } catch (err) {
    console.error('transfer error:', err);
    return fail(res, 'Transfer failed. Please try again.', 500);
  }
};
