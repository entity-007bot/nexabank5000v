import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { getCookie } from 'cookies-next'

const SECRET = process.env.JWT_SECRET || 'nexabank-dev-secret-change-in-prod'

export function signToken(payload: object, expiresIn = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string) {
  try { return jwt.verify(token, SECRET) as jwt.JwtPayload }
  catch { return null }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function getTokenFromRequest(req: NextApiRequest) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = getCookie('nexabank_token', { req })
  return cookie ? String(cookie) : null
}

export function requireAuth(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = verifyToken(token)
    if (!payload) return res.status(401).json({ error: 'Invalid token' })
    ;(req as any).user = payload
    return handler(req, res)
  }
}

export function requireAdmin(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = verifyToken(token)
    if (!payload) return res.status(401).json({ error: 'Invalid token' })
    if (payload.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' })
    ;(req as any).user = payload
    return handler(req, res)
  }
}
