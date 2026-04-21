import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAdmin } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [totalUsers, totalAccounts, transferAgg, recentUsers, recentTransfers] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.transfer.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, isActive: true } }),
      prisma.transfer.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { firstName: true, lastName: true } } } })
    ])
    const totalBalances = await prisma.account.aggregate({ _sum: { balance: true } })

    return res.status(200).json({
      totalUsers,
      totalAccounts,
      totalTransfers: transferAgg._count,
      totalTransferVolume: Number(transferAgg._sum.amount || 0),
      totalDeposits: Number(totalBalances._sum.balance || 0),
      recentUsers,
      recentTransfers,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }
}

export default requireAdmin(handler)
