import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'
import { generateAccountNo } from '../../../lib/utils'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const u = (req as any).user
  const { type, name } = req.body
  if (!type) return res.status(400).json({ error: 'Account type required' })

  try {
    const account = await prisma.account.create({
      data: {
        userId: u.id,
        accountNo: generateAccountNo(),
        type: type,
        name: name || (type === 'SAVINGS' ? 'Savings Account' : type === 'INVESTMENT' ? 'Investment Portfolio' : 'Current Account'),
        balance: 0,
      }
    })
    return res.status(201).json(account)
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to open account', detail: err.message })
  }
}

export default requireAuth(handler)
