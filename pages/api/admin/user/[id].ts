import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { requireAdmin } from '../../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      include: {
        accounts: true,
        sentTransfers:     { take: 20, orderBy: { createdAt: 'desc' } },
        receivedTransfers: { take: 20, orderBy: { createdAt: 'desc' } },
      }
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { passwordHash, ...safe } = user
    return res.status(200).json(safe)
  }

  if (req.method === 'PATCH') {
    const { isActive, role, creditAmount, accountId } = req.body
    try {
      if (creditAmount !== undefined && accountId) {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: { increment: parseFloat(String(creditAmount)) } }
        })
      }
      const user = await prisma.user.update({
        where: { id: String(id) },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(role && { role }),
        },
        select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: true }
      })
      return res.status(200).json(user)
    } catch (err: any) {
      return res.status(500).json({ error: 'Update failed' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default requireAdmin(handler)
