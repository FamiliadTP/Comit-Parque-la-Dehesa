import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Tareas from './Tareas'
import Bitacora from './Bitacora'
import Usuarios from './Usuarios'
import Responsables from './Responsables'

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | login | noauth | ok
  const [tab, setTab] = useState('tareas')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let activo = true
    if (!session) { setPerfil(null); setEstado('login'); return }
    setEstado('cargando')
    supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        if (data) { setPerfil(data); setEstado('ok') }
        else { setPerfil(null); setEstado('noauth') }
      })
    return () => { activo = false }
  }, [session])

  const salir = () => supabase.auth.signOut()

  if (estado === 'cargando') return <div className="center muted">Cargando…</div>
  if (estado === 'login') return <Login />

  if (estado === 'noauth') {
    return (
      <div className="center">
        <div className="card narrow">
          <h2>Acceso no habilitado</h2>
          <p className="muted">
            La cuenta <strong>{session.user.email}</strong> no está en la lista de personas
            autorizadas. Pide al administrador del sistema que te agregue.
          </p>
          <button className="btn" onClick={salir}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  const esSuper = perfil?.rol === 'superadmin'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">PD</span>
          <div>
            <div className="brand-name">Parque la Dehesa</div>
            <div className="brand-sub">Control de proyectos</div>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'tareas' ? 'tab on' : 'tab'} onClick={() => setTab('tareas')}>Tareas</button>
          <button className={tab === 'historico' ? 'tab on' : 'tab'} onClick={() => setTab('historico')}>Histórico</button>
          {esSuper && <button className={tab === 'eliminadas' ? 'tab on' : 'tab'} onClick={() => setTab('eliminadas')}>Eliminadas</button>}
          {esSuper && <button className={tab === 'responsables' ? 'tab on' : 'tab'} onClick={() => setTab('responsables')}>Responsables</button>}
          {esSuper && <button className={tab === 'usuarios' ? 'tab on' : 'tab'} onClick={() => setTab('usuarios')}>Usuarios</button>}
          {esSuper && <button className={tab === 'bitacora' ? 'tab on' : 'tab'} onClick={() => setTab('bitacora')}>Bitácora</button>}
        </nav>
        <div className="user">
          <span className="user-mail">{perfil.nombre || session.user.email}</span>
          {esSuper && <span className="pill">superadmin</span>}
          <button className="btn ghost" onClick={salir}>Salir</button>
        </div>
      </header>

      <main className="content">
        {tab === 'tareas' && <Tareas perfil={perfil} vista="activas" />}
        {tab === 'historico' && <Tareas perfil={perfil} vista="historico" />}
        {tab === 'eliminadas' && esSuper && <Tareas perfil={perfil} vista="eliminadas" />}
        {tab === 'responsables' && esSuper && <Responsables />}
        {tab === 'usuarios' && esSuper && <Usuarios />}
        {tab === 'bitacora' && esSuper && <Bitacora />}
      </main>
    </div>
  )
}
