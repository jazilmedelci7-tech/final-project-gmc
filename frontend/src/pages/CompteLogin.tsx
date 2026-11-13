import { FormEvent, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHero } from '../components/Layout'
import { api, errMsg } from '../api'
import { useClient } from '../clientAuth'

const vide = { email: '', password: '', nom: '', prenom: '', telephone: '', adresse: '' }

export default function CompteLogin() {
  const { client, loading, setClient } = useClient()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'connexion' | 'inscription'>(params.get('inscription') ? 'inscription' : 'connexion')
  const [f, setF] = useState(vide)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof vide) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  if (!loading && client) return <Navigate to={params.get('retour') === 'rdv' ? '/rendez-vous' : '/compte'} replace />
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = mode === 'connexion' ? await api.compteConnexion(f.email, f.password) : await api.compteInscription(f)
      setClient(r.client)
      nav(params.get('retour') === 'rdv' ? '/rendez-vous' : '/compte')
    } catch (error) { setErr(errMsg(error)) } finally { setBusy(false) }
  }
  const ins = mode === 'inscription'
  return (
    <>
      <PageHero title={ins ? 'Créer mon compte' : 'Connexion'} text={ins ? 'Gardez vos informations et celles de vos animaux pour prendre rendez-vous plus vite.' : 'Connectez-vous à votre compte client.'} />
      <section className="wrap max-w-xl py-12">
        <form onSubmit={submit} className="card grid gap-4 sm:grid-cols-2">
          {ins && <>
            <div><label className="label" htmlFor="nom">Nom</label><input id="nom" className="input" required value={f.nom} onChange={set('nom')} autoComplete="family-name" /></div>
            <div><label className="label" htmlFor="prenom">Prénom</label><input id="prenom" className="input" value={f.prenom} onChange={set('prenom')} autoComplete="given-name" /></div>
            <div><label className="label" htmlFor="telephone">Téléphone</label><input id="telephone" type="tel" className="input" required value={f.telephone} onChange={set('telephone')} autoComplete="tel" /></div>
            <div><label className="label" htmlFor="adresse">Adresse (facultatif)</label><input id="adresse" className="input" value={f.adresse} onChange={set('adresse')} autoComplete="street-address" /></div>
          </>}
          <div className="sm:col-span-2"><label className="label" htmlFor="email">E-mail</label><input id="email" type="email" className="input" required value={f.email} onChange={set('email')} autoComplete="email" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="password">Mot de passe{ins && ' (8 caractères minimum)'}</label><input id="password" type="password" className="input" required minLength={ins ? 8 : 1} value={f.password} onChange={set('password')} autoComplete={ins ? 'new-password' : 'current-password'} /></div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary w-full disabled:opacity-60" disabled={busy}>{busy ? 'Un instant…' : ins ? 'Créer mon compte' : 'Me connecter'}</button>
            {err && <p role="alert" className="mt-3 font-bold text-red-700">{err}</p>}
          </div>
          <p className="text-sm sm:col-span-2">
            {ins ? 'Déjà un compte ? ' : "Pas encore de compte ? "}
            <button type="button" className="font-bold text-brand hover:underline" onClick={() => { setMode(ins ? 'connexion' : 'inscription'); setErr('') }}>{ins ? 'Me connecter' : 'Créer un compte'}</button>
          </p>
        </form>
      </section>
    </>
  )
}
