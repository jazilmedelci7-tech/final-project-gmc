import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))
// Lit backend/.env où que la commande soit lancée
dotenv.config({ path: path.resolve(here, '../.env'), quiet: true })

/** Nombre lu dans backend/.env, borné ; la valeur par défaut est utilisée si le champ est vide ou invalide (0 est une valeur valide). */
function num(v: string | undefined, def: number, min: number, max: number) {
  const n = v === undefined || v.trim() === '' ? NaN : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vet-site',
  jwtSecretEnv: process.env.JWT_SECRET || undefined,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  isProd: process.env.NODE_ENV === 'production',
  // Derrière un hébergeur (Render, Railway, Azure…) : TRUST_PROXY=1 pour lire la vraie adresse des visiteurs
  trustProxy: num(process.env.TRUST_PROXY, 0, 0, 5),
  // Front et back sont séparés : ce serveur n'envoie que l'API. (Si ../frontend/dist existe, il est aussi servi : pratique pour tout lancer sur un seul serveur.)
  distDir: path.resolve(here, '../../frontend/dist'),
  // Anciennes radios (avant le passage à la base) : lues dans ce dossier si présentes. Les nouvelles sont dans MongoDB.
  uploadsDir: process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(here, '../uploads'),
  // Notifications au vétérinaire (facultatif) : message Telegram chaque jour quand des rappels arrivent
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
  telegramApi: process.env.TELEGRAM_API_URL || 'https://api.telegram.org',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || undefined,
  notifyHour: num(process.env.NOTIFY_HOUR, 8, 0, 23),
  notifyDaysBefore: num(process.env.NOTIFY_DAYS_BEFORE, 3, 0, 30),
  // Code à fournir pour créer le tout premier mot de passe depuis le site (empêche un inconnu de le créer à ta place).
  // À définir sur l'hébergeur ; laisse vide en local.
  setupCode: process.env.SETUP_CODE?.trim() || undefined,
  sessionHours: 12,
}
