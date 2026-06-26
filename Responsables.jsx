import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Responsables({ orgId }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [nuevo, setNuevo] = useState('')

  const cargar = async () => {
    if (!orgId) return
    setCargando(true)
    const { data, error } = await supabase.from('responsables').select('*')
      .eq('organizacion_id', orgId).order('orden').order('nombre')
    if (error) setError(error.message)
    setLista(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [orgId])

  const agregar = async () => {
    setError(null)
    const nombre = nuevo.trim()
    if (!nombre) { setError('Escribe un nombre.'); return }
    const orden = (lista.reduce((m, r) => Math.max(m, r.orden || 0), 0)) + 1
    const { error } = await supabase.from('responsables').insert({ nombre, orden, activo: true, organizacion_id: orgId })
    if (error) { setError(error.code === '23505' ? 'Ese responsable ya existe.' : error.message); return }
    setNuevo('')
    cargar()
  }

  const cambiarActivo = async (id, activo) => {
    await supabase.from('responsables').update({ activo }).eq('id', id)
    cargar()
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Responsables</h2>
          <p className="muted small">Opciones disponibles en el campo "Responsable" de cada tarea.</p>
        </div>
      </div>

      <div className="card form-inline">
        <input placeholder="Nombre del responsable o grupo (ej. Comité)" value={nuevo}
               onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} />
        <button className="btn primary" onClick={agregar}>Agregar</button>
      </div>

      {error && <div className="aviso error">{error}</div>}

      {cargando ? <div className="muted center pad">Cargando…</div> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>Estado</th></tr></thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>
                    <button className={r.activo ? 'chip act' : 'chip off'} onClick={() => cambiarActivo(r.id, !r.activo)}>
                      {r.activo ? 'activo' : 'inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={2} className="center muted pad">Aún no hay responsables.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 10 }}>
        Desactivar un responsable lo quita de las opciones nuevas, pero no afecta a las tareas que ya lo tienen asignado.
      </p>
    </div>
  )
}
