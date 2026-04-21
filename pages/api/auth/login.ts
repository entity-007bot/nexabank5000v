import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { comparePassword, signToken } from '../../../lib/auth'
import { setCookie } from 'cookies-next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: { where: { isActive: true } }
      }
    })

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (!user.isActive) return res.status(403).json({ error: 'Account suspended' })

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken({ id: user.id, email: user.email, role: user.role, userId: user.userId })
    setCookie('nexabank_token', token, { req, res, maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: 'lax' })

    return res.status(200).json({
      token,
      user: {
        id: user.id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, userId: user.userId, clientNo: user.clientNo, role: user.role
      },
      accounts: user.accounts
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Login failed' })
  }
}
