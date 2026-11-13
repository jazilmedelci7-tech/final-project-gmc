import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PageHero } from '../components/Layout'
import { AnimalCompte, AnimalCompteInput, api, errMsg } from '../api'
import { useClient } from '../clientAuth'
import { ageFrom, fmt, Rdv, todayLocal } from '../data'
import { especes, getEspece } from '../animals'
import { Confirm, ErrorBox, useToast } from '../ui'

const vide: AnimalCompteInput = { nom: '', espece: '', race: '', sexe: '', sterilise: '', naissance: '', poids: '', robe: '', puce: '', tatouage: '', notes: '' }

function AnimalForm({ initial, onSave, onCancel }: { initial: AnimalCompteInput; onSave: (a: AnimalCompteInput) => Promise<void>; onCancel: () => void }) {
  const [a, setA] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof AnimalCompteInput) => (e: { target: { value: string } }) => setA({ ...a, [k]: e.target.value })
  const esp = getEspece(a.espece)
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { await onSave(a) } catch (x) { setErr(errMsg(x)) } finally { setBusy(false) } }
  return (
    <form onSubmit={submit} className="card grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="a-nom">Nom de l'animal</label><input id="a-nom" className="input" required value={a.nom} onChange={set('nom')} /></div>
      <div><label className="label" htmlFor="a-esp">Espèce</label>
        <select id="a-esp" className="input" value={a.espece} onChange={(e) => setA({ ...a, espece: e.target.value, race: '', robe: '' })}>
          <option value="">Choisir…</option>{especes.map((e) => <option key={e.nom}>{e.nom}</option>)}
        </select></div>
      <div><label className="label" htmlFor="a-race">Race</label><input id="a-race" className="input" list="a-races" value={a.race} onChange={set('race')} /><datalist id="a-races">{esp?.races.map((r) => <option key={r} value={r} />)}</datalist></div>
      <div><label className="label" htmlFor="a-robe">Couleur / robe</label><input id="a-robe" className="input" list="a-robes" value={a.robe} onChange={set('robe')} /><datalist id="a-robes">{esp?.robes.map((r) => <option key={r} value={r} />)}</datalist></div>
      <div><label className="label" htmlFor="a-sexe">Sexe</label><select id="a-sexe" className="input" value={a.sexe} onChange={set('sexe')}><option value="">—</option><option>Mâle</option><option>Femelle</option></select></div>
      <div><label className="label" htmlFor="a-ster">Stérilisé(e)</label><select id="a-ster" className="input" value={a.sterilise} onChange={set('sterilise')}><option value="">—</option><option>Oui</option><option>Non</option></select></div>
      <div><label className="label" htmlFor="a-naiss">Date de naissance</label><input id="a-naiss" type="date" className="input" max={todayLocal()} value={a.naissance} onChange={set('naissance')} /></div>
      <div><label className="label" htmlFor="a-poids">Poids (kg)</label><input id="a-poids" className="input" inputMode="decimal" value={a.poids} onChange={set('poids')} /></div>
      <div><label className="label" htmlFor="a-puce">N° de puce</label><input id="a-puce" className="input" value={a.puce} onChange={set('puce')} /></div>
      <div><label className="label" htmlFor="a-tat">N° de tatouage</label><input id="a-tat" className="input" value={a.tatouage} onChange={set('tatouage')} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="a-notes">Remarques (allergies, traitements…)</label><textarea id="a-notes" rows={3} className="input" value={a.notes} onChange={set('notes')} /></div>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button className="btn btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
      {err && <p role="alert" className="font-bold text-red-700 sm:col-span-2">{err}</p>}
    </form>
  )
}

export default function Compte() {
  const { client, loading, setClient, logout } = useClient()
  const toast = useToast()
  const nav = useNavigate()
  const [animaux, setAnimaux] = useState<AnimalCompte[] | null>(null)
  const [rdvs, setRdvs] = useState<Rdv[]>([])
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState<AnimalCompte | 'new' | null>(null)
  const [del, setDel] = useState<AnimalCompte | null>(null)
  const [profil, setProfil] = useState({ nom: '', prenom: '', telephone: '', adresse: '' })
  const [pw, setPw] = useState({ current: '', password: '' })
  const [suppr, setSuppr] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const charger = () => { setErr(''); Promise.all([api.animaux(), api.mesRdvs()]).then(([a, r]) => { setAnimaux(a); setRdvs(r) }).catch((e) => setErr(errMsg(e))) }
  useEffect(() => { if (client) { setProfil({ nom: client.nom, prenom: client.prenom, telephone: client.telephone, adresse: client.adresse }); charger() } }, [client?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null
  if (!client) return <Navigate to="/compte/connexion" replace />

  const saveProfil = async (e: FormEvent) => { e.preventDefault(); setMsg(''); try { setClient((await api.compteModifier(profil)).client); toast('Informations enregistrées') } catch (x) { setMsg(errMsg(x)) } }
  const savePw = async (e: FormEvent) => { e.preventDefault(); setMsg(''); try { await api.compteMotDePasse(pw.current, pw.password); setPw({ current: '', password: '' }); toast('Mot de passe changé') } catch (x) { setMsg(errMsg(x)) } }
  const saveAnimal = async (a: AnimalCompteInput) => {
    if (edit && edit !== 'new') { const r = await api.updateAnimal(edit.id, a); setAnimaux((l) => l!.map((x) => (x.id === r.id ? r : x))) }
    else { const r = await api.createAnimal(a); setAnimaux((l) => [...(l ?? []), r]) }
    setEdit(null); toast('Animal enregistré')
  }
  const supprimerAnimal = async () => { if (!del) return; try { await api.deleteAnimal(del.id); setAnimaux((l) => l!.filter((x) => x.id !== del.id)); toast('Animal supprimé') } catch (x) { setErr(errMsg(x)) } setDel(null) }
  const supprimerCompte = async (e: FormEvent) => { e.preventDefault(); setMsg(''); try { await api.compteSupprimer(suppr ?? ''); setClient(null); nav('/') } catch (x) { setMsg(errMsg(x)) } }

  return (
    <>
      <PageHero title={`Bonjour ${client.prenom || client.nom}`} text="Vos informations, vos animaux et vos demandes de rendez-vous." />
      <section className="wrap grid gap-10 py-12">
        {err && <ErrorBox message={err} onRetry={charger} />}
        {msg && <p role="alert" className="font-bold text-red-700">{msg}</p>}

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-extrabold">Mes animaux</h2>{edit === null && <button className="btn btn-primary btn-sm" onClick={() => setEdit('new')}>Ajouter un animal</button>}</div>
          {edit !== null && <div className="mb-6"><AnimalForm initial={edit === 'new' ? vide : (({ id: _i, ...r }) => r)(edit)} onSave={saveAnimal} onCancel={() => setEdit(null)} /></div>}
          {animaux && animaux.length === 0 && edit === null && <p className="text-brand-muted">Aucun animal enregistré pour l'instant.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {animaux?.map((a) => (
              <article key={a.id} className="card">
                <h3 className="text-lg font-extrabold">{a.nom}</h3>
                <p className="text-sm text-brand-muted">{[a.espece, a.race, a.sexe, a.naissance && ageFrom(a.naissance), a.poids && `${a.poids} kg`, a.robe].filter(Boolean).join(' · ') || 'Informations à compléter'}</p>
                {a.notes && <p className="mt-2 text-sm">{a.notes}</p>}
                <div className="mt-4 flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(a)}>Modifier</button><button className="btn btn-danger btn-sm" onClick={() => setDel(a)}>Supprimer</button></div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <form onSubmit={saveProfil} className="card grid gap-4 sm:grid-cols-2">
            <h2 className="text-xl font-extrabold sm:col-span-2">Mes informations</h2>
            <p className="text-sm text-brand-muted sm:col-span-2">E-mail : <strong>{client.email}</strong></p>
            <div><label className="label" htmlFor="p-nom">Nom</label><input id="p-nom" className="input" required value={profil.nom} onChange={(e) => setProfil({ ...profil, nom: e.target.value })} /></div>
            <div><label className="label" htmlFor="p-pre">Prénom</label><input id="p-pre" className="input" value={profil.prenom} onChange={(e) => setProfil({ ...profil, prenom: e.target.value })} /></div>
            <div><label className="label" htmlFor="p-tel">Téléphone</label><input id="p-tel" type="tel" className="input" required value={profil.telephone} onChange={(e) => setProfil({ ...profil, telephone: e.target.value })} /></div>
            <div><label className="label" htmlFor="p-adr">Adresse</label><input id="p-adr" className="input" value={profil.adresse} onChange={(e) => setProfil({ ...profil, adresse: e.target.value })} /></div>
            <div className="sm:col-span-2"><button className="btn btn-primary">Enregistrer</button></div>
          </form>

          <div className="grid h-fit gap-6">
            <div className="card">
              <h2 className="mb-3 text-xl font-extrabold">Mes rendez-vous</h2>
              {rdvs.length === 0 ? <p className="text-brand-muted">Aucune demande pour l'instant.</p> : <ul className="grid gap-2 text-sm">{rdvs.map((r) => <li key={r.id}><strong>{fmt(r.date)}</strong> · {r.animal} · {r.statut}</li>)}</ul>}
              <Link to="/rendez-vous" className="btn btn-primary btn-sm mt-4 inline-block">Prendre rendez-vous</Link>
            </div>
            <form onSubmit={savePw} className="card grid gap-3">
              <h2 className="text-xl font-extrabold">Changer mon mot de passe</h2>
              <input aria-label="Mot de passe actuel" type="password" className="input" placeholder="Mot de passe actuel" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <input aria-label="Nouveau mot de passe" type="password" className="input" placeholder="Nouveau (8 caractères minimum)" required minLength={8} autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
              <button className="btn btn-ghost">Changer</button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
          <button className="btn btn-ghost" onClick={async () => { await logout(); nav('/') }}>Me déconnecter</button>
          {suppr === null ? <button className="text-sm font-bold text-red-700 hover:underline" onClick={() => setSuppr('')}>Supprimer mon compte</button> : (
            <form onSubmit={supprimerCompte} className="flex flex-wrap items-center gap-2">
              <input aria-label="Mot de passe" type="password" className="input" placeholder="Mot de passe pour confirmer" required value={suppr} onChange={(e) => setSuppr(e.target.value)} />
              <button className="btn btn-danger btn-sm">Supprimer définitivement</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuppr(null)}>Annuler</button>
            </form>
          )}
        </div>
      </section>
      <Confirm open={!!del} title="Supprimer cet animal ?" text={del ? `${del.nom} sera retiré de votre compte.` : ''} onConfirm={supprimerAnimal} onCancel={() => setDel(null)} />
    </>
  )
}
