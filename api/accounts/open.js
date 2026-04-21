// api/accounts/open.js
const { sql, authenticate, genAccountNumber, ok, fail, cors } = require('../../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return fail(res, 'Method not allowed', 405);

  const payload = authenticate(req);
  if (!payload) return fail(res, 'Unauthorized', 401);

  const { accountType, accountName, initialDeposit = 0 } = req.body || {};

  const validTypes = ['current','savings','investment'];
  if (!validTypes.includes(accountType)) return fail(res, 'Invalid account type');

  try {
    const accNumber = await genAccountNumber();
    const accName   = accountName?.trim() || (accountType === 'current' ? 'Current Account' : accountType === 'savings' ? 'Savings Account' : 'Investment Portfolio');
    const aer       = accountType === 'savings' ? '3.5%' : accountType === 'investment' ? null : null;
    const deposit   = Math.max(0, parseFloat(initialDeposit) || 0);

    const { rows: [account] } = await sql`
      INSERT INTO accounts
        (user_id, account_type, account_name, account_number, balance, aer)
      VALUES
        (${payload.userId}, ${accountType}, ${accName}, ${accNumber}, ${deposit}, ${aer})
      RETURNING id, account_type, account_name, account_number, sort_code, balance, currency, aer, status
    `;

    // Record initial deposit as a transaction if > 0
    if (deposit > 0) {
      await sql`
        INSERT INTO transactions
          (account_id, user_id, description, category, tx_type, amount, balance_after, reference, status)
        VALUES
          (${account.id}, ${payload.userId}, 'Initial Deposit', 'Transfer',
           'credit', ${deposit}, ${deposit}, ${'TXN-INIT-'+account.id.slice(0,8).toUpperCase()}, 'completed')
      `;
    }

    return ok(res, {
      account: {
        id:       account.id,
        type:     account.account_type,
        name:     account.account_name,
        number:   account.account_number,
        sortCode: account.sort_code,
        balance:  parseFloat(account.balance),
        currency: account.currency,
        aer:      account.aer,
        status:   account.status,
      }
    }, 201);

  } catch (err) {
    console.error('open account error:', err);
    return fail(res, 'Failed to open account', 500);
  }
};
