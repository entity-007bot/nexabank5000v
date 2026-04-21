import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const u = (req as any).user
  try {
    const user = await prisma.user.findUnique({
      where: { id: u.id },
      include: {
        accounts: { where: { isActive: true } },
        sentTransfers: {
          take: 30, orderBy: { createdAt: 'desc' },
          include: { toAccount: { include: { user: { select: { firstName: true, lastName: true } } } } }
        },
        receivedTransfers: {
          take: 30, orderBy: { createdAt: 'desc' },
          include: { fromAccount: { include: { user: { select: { firstName: true, lastName: true } } } } }
        }
      }
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { passwordHash, ...safe } = user
    return res.status(200).json(safe)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
}

export default requireAuth(handler)
