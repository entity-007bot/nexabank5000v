import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteCookie } from 'cookies-next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  deleteCookie('nexabank_token', { req, res })
  return res.status(200).json({ message: 'Logged out' })
}
