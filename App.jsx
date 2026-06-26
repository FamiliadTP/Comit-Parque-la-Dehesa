import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Tareas from './Tareas'
import Bitacora from './Bitacora'
import Usuarios from './Usuarios'
import Responsables from './Responsables'
import Aprobadores from './Aprobadores'
import Listas from './Listas'

const ORG_GUARDADA = 'org_activa'

// Iniciales para el cuadrito del logo, a partir del nombre de la organización.
function iniciales(nombre) {
  if (!nombre) return '··'
  const menores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e'])
  const palabras = nombre.split(/\s+/).filter(p => p && !menores.has(p.toLowerCase()))
  const ini = palabras.slice(0, 2).map(p => p[0]).join('')
  return (ini || nombre.slice(0, 2)).toUpperCase()
}

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [orgs, setOrgs] = useState([])           // organizaciones del usuario
  const [orgActiva, setOrgActiva] = useState(null) // id de la organización activa
  const [estado, setEstado] = useState('cargando') // cargando | login | noauth | ok
  const [recuperando, setRecuperando] = useState(false) // volvió desde el correo de recuperación
  const [tab, setTab] = useState('tareas')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      // Evita el reinicio en cascada cuando la ventana recupera el foco:
      // si es el mismo usuario, conserva la sesión anterior.
      setSession(prev => (prev?.user?.id === s?.user?.id ? prev : s))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let activo = true
    if (!session) { setPerfil(null); setOrgs([]); setOrgActiva(null); setEstado('login'); return }
    setEstado('cargando')
    ;(async () => {
      const { data: pf } = await supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle()
      const { data: ms } = await supabase
        .from('membresias')
        .select('organizacion_id, rol, organizaciones(nombre, slug)')
        .eq('activo', true)
      if (!activo) return
      const lista = (ms || []).map(m => ({
        id: m.organizacion_id,
        rol: m.rol,
        nombre: m.organizaciones?.nombre || 'Organización',
        slug: m.organizaciones?.slug || '',
      })).sort((a, b) => a.nombre.localeCompare(b.nombre))
      setPerfil(pf || { email: session.user.email })
      setOrgs(lista)
      if (lista.length === 0) { setEstado('noauth'); return }
      const guardada = Number(localStorage.getItem(ORG_GUARDADA))
      const elegida = lista.find(o => o.id === guardada) ? guardada : lista[0].id
      setOrgActiva(elegida)
      setEstado('ok')
    })()
    return () => { activo = false }
  }, [session])

  const cambiarOrg = (id) => {
    const n = Number(id)
    setOrgActiva(n)
    localStorage.setItem(ORG_GUARDADA, String(n))
    setTab('tareas')
  }

  const salir = () => supabase.auth.signOut()

  // Pantalla de nueva contraseña: tiene prioridad sobre todo lo demás.
  if (recuperando) return <NuevaClave onListo={() => setRecuperando(false)} onCancelar={() => { setRecuperando(false); salir() }} />

  if (estado === 'cargando') return <div className="center muted">Cargando…</div>
  if (estado === 'login') return <Login />
  if (estado === 'noauth') {
    return (
      <div className="center">
        <div className="card narrow">
          <h2>Acceso no habilitado</h2>
          <p className="muted">
            La cuenta <strong>{session.user.email}</strong> no está habilitada en ninguna
            organización. Pide al administrador del sistema que te agregue.
          </p>
          <button className="btn" onClick={salir}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  const org = orgs.find(o => o.id === orgActiva) || orgs[0]
  const esSuper = org?.rol === 'superadmin'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">{iniciales(org?.nombre)}</span>
          <div>
            <div className="brand-name">{org?.nombre}</div>
            <div className="brand-sub">Control de proyectos</div>
          </div>
          {orgs.length > 1 && (
            <select className="org-switch" value={orgActiva} onChange={e => cambiarOrg(e.target.value)} title="Cambiar de organización">
              {orgs.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          )}
        </div>
        <nav className="tabs">
          <button className={tab === 'tareas' ? 'tab on' : 'tab'} onClick={() => setTab('tareas')}>Tareas</button>
          <button className={tab === 'historico' ? 'tab on' : 'tab'} onClick={() => setTab('historico')}>Histórico</button>
          {esSuper && <button className={tab === 'eliminadas' ? 'tab on' : 'tab'} onClick={() => setTab('eliminadas')}>Eliminadas</button>}
          {esSuper && <button className={tab === 'responsables' ? 'tab on' : 'tab'} onClick={() => setTab('responsables')}>Responsables</button>}
          {esSuper && <button className={tab === 'aprobadores' ? 'tab on' : 'tab'} onClick={() => setTab('aprobadores')}>Aprobadores</button>}
          {esSuper && <button className={tab === 'listas' ? 'tab on' : 'tab'} onClick={() => setTab('listas')}>Listas</button>}
          {esSuper && <button className={tab === 'usuarios' ? 'tab on' : 'tab'} onClick={() => setTab('usuarios')}>Usuarios</button>}
          {esSuper && <button className={tab === 'bitacora' ? 'tab on' : 'tab'} onClick={() => setTab('bitacora')}>Bitácora</button>}
        </nav>
        <div className="user">
          <span className="user-mail">{perfil?.nombre || session.user.email}</span>
          {esSuper && <span className="pill">superadmin</span>}
          <button className="btn ghost" onClick={salir}>Salir</button>
        </div>
      </header>
      <main className="content">
        {tab === 'tareas' && <Tareas perfil={perfil} orgId={orgActiva} esSuper={esSuper} vista="activas" />}
        {tab === 'historico' && <Tareas perfil={perfil} orgId={orgActiva} esSuper={esSuper} vista="historico" />}
        {tab === 'eliminadas' && esSuper && <Tareas perfil={perfil} orgId={orgActiva} esSuper={esSuper} vista="eliminadas" />}
        {tab === 'responsables' && esSuper && <Responsables orgId={orgActiva} />}
        {tab === 'aprobadores' && esSuper && <Aprobadores orgId={orgActiva} />}
        {tab === 'listas' && esSuper && <Listas orgId={orgActiva} />}
        {tab === 'usuarios' && esSuper && <Usuarios orgId={orgActiva} />}
        {tab === 'bitacora' && esSuper && <Bitacora orgId={orgActiva} />}
      </main>
    </div>
  )
}

// Pantalla para definir una nueva contraseña al volver desde el correo de recuperación.
function NuevaClave({ onListo, onCancelar }) {
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [msg, setMsg] = useState(null)
  const [cargando, setCargando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (clave.length < 6) { setMsg({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' }); return }
    if (clave !== clave2) { setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' }); return }
    setCargando(true)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setCargando(false)
    if (error) { setMsg({ tipo: 'error', texto: error.message }); return }
    setMsg({ tipo: 'ok', texto: 'Contraseña actualizada. Entrando…' })
    setTimeout(onListo, 800)
  }

  return (
    <div className="center login-bg">
      <div className="card login">
        <div className="login-head">
          <h1>Nueva contraseña</h1>
          <p className="muted">Escribe tu nueva contraseña para terminar.</p>
        </div>
        <form onSubmit={guardar}>
          <label>Nueva contraseña</label>
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••••" required minLength={6} />
          <label>Repite la contraseña</label>
          <input type="password" value={clave2} onChange={e => setClave2(e.target.value)} placeholder="••••••••" required minLength={6} />
          {msg && <div className={msg.tipo === 'error' ? 'aviso error' : 'aviso ok'}>{msg.texto}</div>}
          <button className="btn primary full" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
        <div className="login-foot">
          <button className="link" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
