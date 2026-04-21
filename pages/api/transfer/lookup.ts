import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accountNo } = req.query
  if (!accountNo) return res.status(400).json({ error: 'Account number required' })

  try {
    const account = await prisma.account.findFirst({
      where: { accountNo: String(accountNo), isActive: true },
      include: { user: { select: { firstName: true, lastName: true } } }
    })
    if (!account) return res.status(404).json({ error: 'Account not found' })
    return res.status(200).json({
      accountNo: account.accountNo,
      accountName: account.name,
      holderName: `${account.user.firstName} ${account.user.lastName}`,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Lookup failed' })
  }
}

export default requireAuth(handler)
