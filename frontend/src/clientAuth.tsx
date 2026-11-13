import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api, ClientCompte } from './api'

interface Ctx { client: ClientCompte | null; loading: boolean; setClient: (c: ClientCompte | null) => void; logout: () => Promise<void> }
const ClientCtx = createContext<Ctx>({ client: null, loading: true, setClient: () => {}, logout: async () => {} })
export const useClient = () => useContext(ClientCtx)

/** Garde en mémoire le client connecté (compte du site, différent de l'espace du vétérinaire). */
export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientCompte | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.compteSession().then((r) => setClient(r.client)).catch(() => setClient(null)).finally(() => setLoading(false)) }, [])
  const logout = useCallback(async () => { try { await api.compteDeconnexion() } catch { /* déjà déconnecté */ } setClient(null) }, [])
  return <ClientCtx.Provider value={{ client, loading, setClient, logout }}>{children}</ClientCtx.Provider>
}
