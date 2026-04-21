import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const u = (req as any).user
  const { fromAccountId, toAccountNo, amount, description, reference } = req.body

  if (!fromAccountId || !toAccountNo || !amount) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const amt = parseFloat(String(amount))
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' })
  if (amt > 50000) return res.status(400).json({ error: 'Amount exceeds single transfer limit of $50,000' })

  try {
    // Fetch sender's account
    const fromAccount = await prisma.account.findFirst({
      where: { id: fromAccountId, userId: u.id, isActive: true, isFrozen: false }
    })
    if (!fromAccount) return res.status(404).json({ error: 'Source account not found or frozen' })
    if (Number(fromAccount.balance) < amt) return res.status(400).json({ error: 'Insufficient funds' })

    // Find recipient account
    const toAccount = await prisma.account.findFirst({
      where: { accountNo: String(toAccountNo), isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true } } }
    })
    if (!toAccount) return res.status(404).json({ error: 'Recipient account not found. Check the account number.' })
    if (toAccount.userId === u.id && toAccount.id === fromAccountId) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' })
    }

    // Execute in a transaction
    const result = await prisma.$transaction([
      prisma.account.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amt } }
      }),
      prisma.account.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amt } }
      }),
      prisma.transfer.create({
        data: {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          fromUserId: u.id,
          toUserId: toAccount.userId,
          amount: amt,
          description: description || 'Bank Transfer',
          reference: reference || null,
          status: 'COMPLETED',
          type: toAccount.userId === u.id ? 'INTERNAL' : 'EXTERNAL',
        },
        include: {
          fromAccount: { select: { accountNo: true, name: true } },
          toAccount:   { select: { accountNo: true, name: true } },
          toUser: { select: { firstName: true, lastName: true } },
        }
      })
    ])

    return res.status(200).json({
      transfer: result[2],
      newBalance: Number(fromAccount.balance) - amt,
      recipient: `${(toAccount as any).user.firstName} ${(toAccount as any).user.lastName}`
    })
  } catch (err: any) {
    console.error('Transfer error:', err)
    return res.status(500).json({ error: 'Transfer failed', detail: err.message })
  }
}

export default requireAuth(handler)
