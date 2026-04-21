export function generateAccountNo(): string {
  return String(Math.floor(10000000 + Math.random() * 89999999))
}

export function generateClientNo(): string {
  return 'CL-' + String(Math.floor(100000 + Math.random() * 899999))
}

export function generateUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function fmtMoney(n: number | string | any): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
