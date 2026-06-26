import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [modo, setModo] = useState('ingresar') // ingresar | crear
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState(null)
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setMsg(null); setCargando(true)
    try {
      if (modo === 'ingresar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password: clave })
        if (error) throw error
        setMsg({ tipo: 'ok', texto: 'Acceso creado. Si te pide confirmar el correo, revísalo; si no, ya puedes ingresar.' })
      }
    } catch (err) {
      setMsg({ tipo: 'error', texto: traducir(err.message) })
    } finally {
      setCargando(false)
    }
  }

  const recuperar = async () => {
    if (!email) { setMsg({ tipo: 'error', texto: 'Escribe tu correo y vuelve a tocar el enlace.' }); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMsg(error
      ? { tipo: 'error', texto: traducir(error.message) }
      : { tipo: 'ok', texto: 'Te enviamos un correo para restablecer la contraseña.' })
  }

  return (
    <div className="center login-bg">
      <div className="card login">
        <div className="login-head">
          <span className="brand-mark big">GP</span>
          <h1>Gestión de Proyectos y Tareas</h1>
          <p className="muted">Plataforma de control y seguimiento</p>
        </div>

        <form onSubmit={enviar}>
          <label>Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
          <label>Contraseña</label>
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••••" required minLength={6} />

          {msg && <div className={msg.tipo === 'error' ? 'aviso error' : 'aviso ok'}>{msg.texto}</div>}

          <button className="btn primary full" disabled={cargando}>
            {cargando ? 'Procesando…' : (modo === 'ingresar' ? 'Ingresar' : 'Crear acceso')}
          </button>
        </form>

        <div className="login-foot">
          {modo === 'ingresar' ? (
            <>
              <button className="link" onClick={() => { setModo('crear'); setMsg(null) }}>¿Primera vez? Crear acceso</button>
              <button className="link" onClick={recuperar}>Olvidé mi contraseña</button>
            </>
          ) : (
            <button className="link" onClick={() => { setModo('ingresar'); setMsg(null) }}>Ya tengo acceso, ingresar</button>
          )}
        </div>

        <p className="muted small" style={{ textAlign: 'center', marginTop: 16 }}>Desarrollado por EXA</p>
      </div>
    </div>
  )
}

function traducir(m) {
  if (!m) return 'Ocurrió un error. Inténtalo de nuevo.'
  if (m.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered')) return 'Ese correo ya tiene acceso. Usa "Ingresar".'
  if (m.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return m
}
