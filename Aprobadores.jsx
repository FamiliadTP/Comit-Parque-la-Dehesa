import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Aprobadores() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [nuevo, setNuevo] = useState({ email: '', nombre: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('aprobadores').select('*').order('email')
    if (error) setError(error.message)
    setLista(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const agregar = async () => {
    setError(null)
    const email = nuevo.email.trim().toLowerCase()
    if (!email) { setError('Escribe un correo.'); return }
    const { error } = await supabase.from('aprobadores')
      .upsert({ email, nombre: nuevo.nombre.trim() || null, activo: true }, { onConflict: 'email' })
    if (error) { setError(error.message); return }
    setNuevo({ email: '', nombre: '' })
    cargar()
  }

  const cambiarActivo = async (email, activo) => {
    await supabase.from('aprobadores').update({ activo }).eq('email', email)
    cargar()
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Aprobadores de presupuesto</h2>
          <p className="muted small">Solo estas personas pueden aprobar el presupuesto de una tarea.</p>
        </div>
      </div>

      <div className="card form-inline">
        <input placeholder="correo@ejemplo.com" value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} />
        <input placeholder="Nombre (opcional)" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <button className="btn primary" onClick={agregar}>Agregar</button>
      </div>

      {error && <div className="aviso error">{error}</div>}

      {cargando ? <div className="muted center pad">Cargando…</div> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Correo</th><th>Nombre</th><th>Estado</th></tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td className="muted">{u.nombre || '—'}</td>
                  <td>
                    <button className={u.activo ? 'chip act' : 'chip off'} onClick={() => cambiarActivo(u.email, !u.activo)}>
                      {u.activo ? 'activo' : 'inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={3} className="center muted pad">Aún no hay aprobadores.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
