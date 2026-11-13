import { useEffect, useState } from 'react'
import { api, ClientAdmin, errMsg } from '../../api'
import { ageFrom, fmt } from '../../data'
import { ErrorBox } from '../../ui'

export default function Clients() {
  const [list, setList] = useState<ClientAdmin[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const charger = () => { setErr(''); api.clientsAdmin().then(setList).catch((e) => setErr(errMsg(e))) }
  useEffect(charger, [])
  const n = q.trim().toLowerCase()
  const vus = (list ?? []).filter((c) => !n || [c.nom, c.prenom, c.email, c.telephone, ...c.animaux.map((a) => a.nom)].join(' ').toLowerCase().includes(n))
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Comptes clients</h1>
        <input aria-label="Rechercher" className="input max-w-xs" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && <ErrorBox message={err} onRetry={charger} />}
      {list && list.length === 0 && <p className="text-brand-muted">Aucun client ne s'est encore inscrit sur le site.</p>}
      <div className="grid gap-4">
        {vus.map((c) => (
          <article key={c.id} className="card">
            <h2 className="text-lg font-extrabold">{c.prenom} {c.nom}</h2>
            <p className="text-sm text-brand-muted">{c.email} · {c.telephone}{c.adresse && ` · ${c.adresse}`} · inscrit le {fmt(c.createdAt.slice(0, 10))} · {c.nbRendezVous} rendez-vous</p>
            {c.animaux.length === 0 ? <p className="mt-2 text-sm">Aucun animal enregistré.</p> : (
              <ul className="mt-3 grid gap-1 text-sm">
                {c.animaux.map((a) => <li key={a.id}><strong>{a.nom}</strong> — {[a.espece, a.race, a.sexe, a.naissance && ageFrom(a.naissance), a.poids && `${a.poids} kg`, a.robe, a.puce && `puce ${a.puce}`].filter(Boolean).join(' · ')}{a.notes && ` (${a.notes})`}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
