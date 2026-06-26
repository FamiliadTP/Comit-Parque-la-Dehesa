import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Usuarios({ orgId }) {
  const [lista, setLista] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [nuevo, setNuevo] = useState({ email: '', nombre: '', rol: 'editor' })

  const cargar = async () => {
    if (!orgId) return
    setCargando(true)
    const { data: ua, error: e1 } = await supabase.from('usuarios_autorizados').select('*')
      .eq('organizacion_id', orgId).order('email')
    const { data: pf } = await supabase.from('perfiles').select('*')
    if (e1) setError(e1.message)
    setLista(ua || [])
    setPerfiles(pf || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [orgId])

  const yaIngreso = (email) => perfiles.some(p => (p.email || '').toLowerCase() === (email || '').toLowerCase())

  const agregar = async () => {
    setError(null); setAviso(null)
    const email = nuevo.email.trim().toLowerCase()
    if (!email) { setError('Escribe un correo.'); return }
    const { error } = await supabase.from('usuarios_autorizados')
      .upsert({ email, nombre: nuevo.nombre.trim() || null, rol: nuevo.rol, activo: true, organizacion_id: orgId }, { onConflict: 'email,organizacion_id' })
    if (error) { setError(error.message); return }
    setNuevo({ email: '', nombre: '', rol: 'editor' })
    cargar()
  }

  const cambiarRol = async (email, rol) => {
    await supabase.from('usuarios_autorizados').update({ rol }).eq('email', email).eq('organizacion_id', orgId)
    cargar()
  }

  const cambiarActivo = async (email, activo) => {
    await supabase.from('usuarios_autorizados').update({ activo }).eq('email', email).eq('organizacion_id', orgId)
    cargar()
  }

  // Envía a la persona un correo para que ella misma defina una nueva contraseña.
  const recuperar = async (email) => {
    setError(null); setAviso(null)
    if (!window.confirm(`¿Enviar a ${email} un correo para restablecer su contraseña?`)) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) { setError(error.message); return }
    setAviso(`Listo: se envió un correo de recuperación a ${email}.`)
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Usuarios autorizados</h2>
          <p className="muted small">Solo quienes estén en esta lista pueden entrar a esta organización.</p>
        </div>
      </div>

      <div className="card form-inline">
        <input placeholder="correo@ejemplo.com" value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} />
        <input placeholder="Nombre (opcional)" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <select value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value })}>
          <option value="editor">editor</option>
          <option value="superadmin">superadmin</option>
        </select>
        <button className="btn primary" onClick={agregar}>Agregar</button>
      </div>

      {error && <div className="aviso error">{error}</div>}
      {aviso && <div className="aviso ok">{aviso}</div>}

      {cargando ? <div className="muted center pad">Cargando…</div> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acceso</th><th>Contraseña</th></tr>
            </thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td className="muted">{u.nombre || '—'}</td>
                  <td>
                    <select value={u.rol} onChange={e => cambiarRol(u.email, e.target.value)}>
                      <option value="editor">editor</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </td>
                  <td>
                    <button className={u.activo ? 'chip act' : 'chip off'} onClick={() => cambiarActivo(u.email, !u.activo)}>
                      {u.activo ? 'activo' : 'inactivo'}
                    </button>
                  </td>
                  <td className="muted small">{yaIngreso(u.email) ? 'ya ingresó' : 'pendiente de primer ingreso'}</td>
                  <td>
                    {yaIngreso(u.email)
                      ? <button className="btn ghost small" onClick={() => recuperar(u.email)}>Enviar recuperación</button>
                      : <span className="muted small">—</span>}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={6} className="center muted pad">Aún no hay usuarios en la lista.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 10 }}>
        "Enviar recuperación" le manda a la persona un correo para que ella misma cree una nueva contraseña.
      </p>
    </div>
  )
}
