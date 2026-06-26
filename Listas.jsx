import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { CATALOGO_TIPOS } from './catalogos'

export default function Listas({ orgId }) {
  const [tipo, setTipo] = useState(CATALOGO_TIPOS[0].tipo)
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [nuevo, setNuevo] = useState('')

  const def = CATALOGO_TIPOS.find(t => t.tipo === tipo)
  const hayPropios = lista.length > 0

  const cargar = async () => {
    setCargando(true); setError(null)
    const { data, error } = await supabase.from('catalogos')
      .select('*').eq('organizacion_id', orgId).eq('tipo', tipo).order('orden')
    if (error) setError(error.message)
    setLista(data || [])
    setCargando(false)
  }

  useEffect(() => { if (orgId) cargar() }, [orgId, tipo])

  const agregar = async () => {
    setError(null)
    const valor = nuevo.trim()
    if (!valor) { setError('Escribe un valor.'); return }
    const orden = lista.reduce((m, r) => Math.max(m, r.orden || 0), 0) + 1
    const { error } = await supabase.from('catalogos')
      .insert({ organizacion_id: orgId, tipo, valor, orden, activo: true })
    if (error) { setError(error.code === '23505' ? 'Ese valor ya existe en esta lista.' : error.message); return }
    setNuevo(''); cargar()
  }

  const cambiarActivo = async (id, activo) => {
    await supabase.from('catalogos').update({ activo }).eq('id', id)
    cargar()
  }

  // Copia los valores por defecto a esta organización para empezar a editarlos.
  const cargarBase = async () => {
    setError(null)
    const filas = def.def.map((valor, i) => ({ organizacion_id: orgId, tipo, valor, orden: i + 1, activo: true }))
    const { error } = await supabase.from('catalogos')
      .upsert(filas, { onConflict: 'organizacion_id,tipo,valor', ignoreDuplicates: true })
    if (error) { setError(error.message); return }
    cargar()
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Listas desplegables</h2>
          <p className="muted small">Valores que aparecen en los menús de cada tarea, para esta organización.</p>
        </div>
      </div>

      <div className="filtros">
        {CATALOGO_TIPOS.map(t => (
          <button key={t.tipo} className={t.tipo === tipo ? 'tab on' : 'tab'} onClick={() => setTipo(t.tipo)}>{t.label}</button>
        ))}
      </div>

      <div className="card form-inline">
        <input placeholder={`Nuevo valor de ${def.label.toLowerCase()}`} value={nuevo}
               onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} />
        <button className="btn primary" onClick={agregar}>Agregar</button>
      </div>

      {error && <div className="aviso error">{error}</div>}

      {!cargando && !hayPropios && (
        <div className="aviso warn">
          Esta organización aún usa los valores por defecto para <strong>{def.label}</strong>.
          <button className="btn ghost" style={{ marginLeft: 10 }} onClick={cargarBase}>Cargar valores por defecto para editarlos</button>
        </div>
      )}

      {cargando ? <div className="muted center pad">Cargando…</div> : hayPropios && (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Valor</th><th>Estado</th></tr></thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id}>
                  <td>{r.valor}</td>
                  <td>
                    <button className={r.activo ? 'chip act' : 'chip off'} onClick={() => cambiarActivo(r.id, !r.activo)}>
                      {r.activo ? 'activo' : 'inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted small" style={{ marginTop: 10 }}>
        Desactivar un valor lo quita de los menús nuevos, pero no afecta a las tareas que ya lo tienen.
      </p>
    </div>
  )
}
