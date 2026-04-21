import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const u = (req as any).user
  const { accountId, limit = '50' } = req.query

  try {
    const where = accountId
      ? { AND: [{ OR: [{ fromAccountId: String(accountId) }, { toAccountId: String(accountId) }] }, { OR: [{ fromUserId: u.id }, { toUserId: u.id }] }] }
      : { OR: [{ fromUserId: u.id }, { toUserId: u.id }] }

    const transfers = await prisma.transfer.findMany({
      where: where as any,
      take: parseInt(String(limit)),
      orderBy: { createdAt: 'desc' },
      include: {
        fromAccount: { select: { accountNo: true, name: true, type: true } },
        toAccount:   { select: { accountNo: true, name: true, type: true } },
        fromUser: { select: { firstName: true, lastName: true } },
        toUser:   { select: { firstName: true, lastName: true } },
      }
    })
    return res.status(200).json(transfers)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transactions' })
  }
}

export default requireAuth(handler)
