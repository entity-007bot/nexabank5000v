import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAdmin } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search, page = '1', limit = '20' } = req.query
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit))
    const where = search ? {
      OR: [
        { email: { contains: String(search), mode: 'insensitive' as const } },
        { firstName: { contains: String(search), mode: 'insensitive' as const } },
        { lastName: { contains: String(search), mode: 'insensitive' as const } },
        { clientNo: { contains: String(search), mode: 'insensitive' as const } },
      ]
    } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(String(limit)),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          userId: true, clientNo: true, role: true, isActive: true,
          isVerified: true, createdAt: true,
          accounts: { select: { id: true, type: true, balance: true, accountNo: true, isFrozen: true } }
        }
      }),
      prisma.user.count({ where })
    ])
    return res.status(200).json({ users, total, page: parseInt(String(page)), limit: parseInt(String(limit)) })
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default requireAdmin(handler)
