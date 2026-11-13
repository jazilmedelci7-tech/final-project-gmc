import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { Setting } from './models.js'

export const COOKIE = 'vet_session'
let secret: string | null = null

/** Clé de signature : variable JWT_SECRET si définie, sinon une clé aléatoire générée une fois et gardée dans la base. */
export async function loadSecret(): Promise<void> {
  if (config.jwtSecretEnv) { secret = config.jwtSecretEnv; return }
  const found = await Setting.findOne({ key: 'jwtSecret' })
  if (found) { secret = found.value; return }
  const fresh = crypto.randomBytes(48).toString('hex')
  try {
    await Setting.create({ key: 'jwtSecret', value: fresh })
    secret = fresh
  } catch {
    secret = (await Setting.findOne({ key: 'jwtSecret' }))!.value // créée entre-temps par un autre processus
  }
}

export function startSession(res: Response): void {
  if (!secret) throw new Error('Clé de session non chargée')
  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: `${config.sessionHours}h` })
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: config.cookieSecure, maxAge: config.sessionHours * 3600 * 1000, path: '/',
  })
}
export const endSession = (res: Response) => { res.clearCookie(COOKIE, { path: '/' }) }

export function isAuthenticated(req: Request): boolean {
  const token = req.cookies?.[COOKIE]
  if (!token || typeof token !== 'string' || !secret) return false
  // Le rôle doit être « admin » : le jeton d'un compte client (signé avec la même clé) ne donne jamais accès au vétérinaire
  try { const p = jwt.verify(token, secret, { algorithms: ['HS256'] }); return typeof p === 'object' && p.role === 'admin' } catch { return false }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) { next(); return }
  res.status(401).json({ error: 'Connexion requise' })
}

/* ---------- Comptes clients : cookie et rôle séparés de ceux du vétérinaire ---------- */
export const CLIENT_COOKIE = 'client_session'

export function startClientSession(res: Response, clientId: string): void {
  if (!secret) throw new Error('Clé de session non chargée')
  const token = jwt.sign({ role: 'client', sub: clientId }, secret, { expiresIn: '7d' })
  res.cookie(CLIENT_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: config.cookieSecure, maxAge: 7 * 24 * 3600 * 1000, path: '/' })
}
export const endClientSession = (res: Response) => { res.clearCookie(CLIENT_COOKIE, { path: '/' }) }

/** Identifiant du client connecté, ou null. */
export function clientIdFrom(req: Request): string | null {
  const token = req.cookies?.[CLIENT_COOKIE]
  if (!token || typeof token !== 'string' || !secret) return null
  try {
    const p = jwt.verify(token, secret, { algorithms: ['HS256'] })
    return typeof p === 'object' && p.role === 'client' && typeof p.sub === 'string' && /^[a-f0-9]{24}$/i.test(p.sub) ? p.sub : null
  } catch { return null }
}

export function requireClient(req: Request, res: Response, next: NextFunction): void {
  const id = clientIdFrom(req)
  if (!id) { res.status(401).json({ error: 'Connecte-toi à ton compte.' }); return }
  res.locals.clientId = id
  next()
}
