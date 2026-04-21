import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAdmin } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { accountId, freeze } = req.body
  try {
    const account = await prisma.account.update({
      where: { id: accountId },
      data: { isFrozen: Boolean(freeze) }
    })
    return res.status(200).json(account)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update account' })
  }
}

export default requireAdmin(handler)
