import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { hashPassword, signToken } from '../../../lib/auth'
import { generateAccountNo, generateClientNo, generateUserId } from '../../../lib/utils'
import { setCookie } from 'cookies-next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { firstName, lastName, email, phone, address, city, postcode,
          nationality, nationalId, password, accountType } = req.body

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await hashPassword(password)
    const userId   = generateUserId()
    const clientNo = generateClientNo()
    const accountNo = generateAccountNo()

    const user = await prisma.user.create({
      data: {
        firstName, lastName, email,
        phone: phone || null, address: address || null,
        city: city || null, postcode: postcode || null,
        nationality: nationality || null, nationalId: nationalId || null,
        passwordHash, userId, clientNo,
        isVerified: true,
        accounts: {
          create: {
            accountNo,
            type: accountType === 'SAVINGS' ? 'SAVINGS' : 'CURRENT',
            name: accountType === 'SAVINGS' ? 'Savings Account' : 'Current Account',
            balance: 0,
          }
        }
      },
      include: { accounts: true }
    })

    const token = signToken({ id: user.id, email: user.email, role: user.role, userId: user.userId })
    setCookie('nexabank_token', token, { req, res, maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: 'lax' })

    return res.status(201).json({
      token,
      user: { id: user.id, firstName, lastName, email, userId, clientNo, role: user.role },
      account: user.accounts[0]
    })
  } catch (err: any) {
    console.error('Register error:', err)
    return res.status(500).json({ error: 'Registration failed', detail: err.message })
  }
}
