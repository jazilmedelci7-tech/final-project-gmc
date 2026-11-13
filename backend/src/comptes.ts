import bcrypt from 'bcryptjs'
import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import type { z } from 'zod'
import { clientIdFrom, endClientSession, requireClient, startClientSession } from './auth.js'
import { AnimalClient, Client, Rdv } from './models.js'
import { animalClientSchema, changePasswordSchema, clientDeleteSchema, clientLoginSchema, clientProfileSchema, clientRegisterSchema } from './validation.js'

/** Espace des clients du cabinet : compte, informations personnelles, animaux, rendez-vous. Monté sur /api/compte. */
export const comptes = Router()

const MAX_ANIMAUX = 20
const connexionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives. Réessaie dans quelques minutes.' } })
const inscriptionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Trop de comptes créés depuis cette connexion. Réessaie plus tard." } })

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)
// Hash factice : on compare toujours un mot de passe, même si l'e-mail n'existe pas, pour ne pas révéler quels comptes existent
const FAUX_HASH = bcrypt.hashSync('mot-de-passe-factice', 12)

function parse<T extends z.ZodTypeAny>(schema: T, body: unknown, res: Response): z.infer<T> | null {
  const r = schema.safeParse(body)
  if (r.success) return r.data
  res.status(400).json({ error: r.error.issues[0]?.message ?? 'Données invalides' })
  return null
}
const me = (res: Response) => String(res.locals.clientId)

/* ---------- Inscription, connexion, session ---------- */
comptes.post('/inscription', inscriptionLimiter, async (req: Request, res: Response) => {
  const data = parse(clientRegisterSchema, req.body, res)
  if (!data) return
  if (await Client.exists({ email: data.email })) { res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail. Connecte-toi.' }); return }
  const { password, ...profil } = data
  let client
  try { client = await Client.create({ ...profil, passwordHash: await bcrypt.hash(password, 12) }) } catch (e) {
    if ((e as { code?: number }).code === 11000) { res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail. Connecte-toi.' }); return }
    throw e
  }
  startClientSession(res, String(client._id))
  res.status(201).json({ client })
})

comptes.post('/connexion', connexionLimiter, async (req: Request, res: Response) => {
  const data = parse(clientLoginSchema, req.body, res)
  if (!data) return
  const client = await Client.findOne({ email: data.email })
  const ok = await bcrypt.compare(data.password, client?.passwordHash ?? FAUX_HASH)
  if (!client || !ok) { res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' }); return }
  startClientSession(res, String(client._id))
  res.json({ client })
})

comptes.post('/deconnexion', (_req, res) => { endClientSession(res); res.json({ ok: true }) })

// Utilisée par le site à chaque chargement : répond toujours 200, avec le client ou null
comptes.get('/session', async (req, res) => {
  const id = clientIdFrom(req)
  const client = id ? await Client.findById(id) : null
  if (id && !client) endClientSession(res) // compte supprimé entre-temps
  res.json({ client })
})

/* ---------- Tout ce qui suit demande d'être connecté ---------- */
comptes.use(requireClient)

comptes.put('/moi', async (req, res) => {
  const data = parse(clientProfileSchema, req.body, res)
  if (!data) return
  const client = await Client.findByIdAndUpdate(me(res), data, { new: true })
  if (!client) { res.status(404).json({ error: 'Compte introuvable' }); return }
  res.json({ client })
})

comptes.put('/mot-de-passe', connexionLimiter, async (req, res) => {
  const data = parse(changePasswordSchema, req.body, res)
  if (!data) return
  const client = await Client.findById(me(res))
  if (!client) { res.status(404).json({ error: 'Compte introuvable' }); return }
  if (!(await bcrypt.compare(data.current, client.passwordHash))) { res.status(401).json({ error: 'Mot de passe actuel incorrect.' }); return }
  client.passwordHash = await bcrypt.hash(data.password, 12)
  await client.save()
  res.json({ ok: true })
})

// Suppression du compte (demande le mot de passe) : le compte et ses animaux disparaissent, les rendez-vous restent mais ne sont plus liés
comptes.delete('/moi', connexionLimiter, async (req, res) => {
  const data = parse(clientDeleteSchema, req.body, res)
  if (!data) return
  const client = await Client.findById(me(res))
  if (!client) { res.status(404).json({ error: 'Compte introuvable' }); return }
  if (!(await bcrypt.compare(data.password, client.passwordHash))) { res.status(401).json({ error: 'Mot de passe incorrect.' }); return }
  await AnimalClient.deleteMany({ owner: client._id })
  await Rdv.updateMany({ client: client._id }, { $set: { client: null } })
  await Client.deleteOne({ _id: client._id })
  endClientSession(res)
  res.json({ ok: true })
})

/* ---------- Animaux du client ---------- */
comptes.get('/animaux', async (_req, res) => {
  res.json(await AnimalClient.find({ owner: me(res) }).sort({ createdAt: 1 }))
})

comptes.post('/animaux', async (req, res) => {
  const data = parse(animalClientSchema, req.body, res)
  if (!data) return
  if ((await AnimalClient.countDocuments({ owner: me(res) })) >= MAX_ANIMAUX) { res.status(400).json({ error: `Tu ne peux pas enregistrer plus de ${MAX_ANIMAUX} animaux.` }); return }
  res.status(201).json(await AnimalClient.create({ ...data, owner: me(res) }))
})

// Chaque route vérifie que l'animal appartient bien au client connecté (filtre sur « owner »)
comptes.put('/animaux/:id', async (req, res) => {
  if (!isId(req.params.id)) { res.status(404).json({ error: 'Animal introuvable' }); return }
  const data = parse(animalClientSchema, req.body, res)
  if (!data) return
  const animal = await AnimalClient.findOneAndUpdate({ _id: req.params.id, owner: me(res) }, data, { new: true })
  if (!animal) { res.status(404).json({ error: 'Animal introuvable' }); return }
  res.json(animal)
})

comptes.delete('/animaux/:id', async (req, res) => {
  if (!isId(req.params.id)) { res.status(404).json({ error: 'Animal introuvable' }); return }
  const r = await AnimalClient.deleteOne({ _id: req.params.id, owner: me(res) })
  if (!r.deletedCount) { res.status(404).json({ error: 'Animal introuvable' }); return }
  res.status(204).end()
})

/* ---------- Rendez-vous du client ---------- */
comptes.get('/rendez-vous', async (_req, res) => {
  res.json(await Rdv.find({ client: me(res) }).sort({ createdAt: -1 }).limit(50))
})
