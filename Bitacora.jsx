import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { fechaHora } from './constants'

export default function Bitacora({ orgId }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!orgId) return
    setCargando(true)
    supabase.from('auditoria').select('*').eq('organizacion_id', orgId)
      .order('created_at', { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setFilas(data || [])
        setCargando(false)
      })
  }, [orgId])

  const t = q.trim().toLowerCase()
  const vis = filas.filter(r => !t ||
    (r.usuario_email || '').toLowerCase().includes(t) ||
    (r.campo || '').toLowerCase().includes(t) ||
    (r.registro_id || '').toLowerCase().includes(t))

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Bitácora de cambios</h2>
          <p className="muted small">Registro de quién creó o modificó cada tarea.</p>
        </div>
        <input className="buscar" placeholder="Filtrar por usuario, campo o N° de tarea…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {error && <div className="aviso error">{error}</div>}
      {cargando ? <div className="muted center pad">Cargando…</div> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Usuario</th><th>Acción</th><th>Tarea</th>
                <th>Campo</th><th>Antes</th><th>Después</th>
              </tr>
            </thead>
            <tbody>
              {vis.map(r => (
                <tr key={r.id}>
                  <td className="nowrap muted">{fechaHora(r.created_at)}</td>
                  <td>{r.usuario_email || <span className="muted">sistema</span>}</td>
                  <td><span className={r.accion === 'INSERT' ? 'chip ins' : 'chip upd'}>{r.accion === 'INSERT' ? 'Creó' : 'Modificó'}</span></td>
                  <td className="muted">#{r.registro_id}</td>
                  <td className="muted">{r.campo || '—'}</td>
                  <td className="celda-val muted">{r.valor_anterior || '—'}</td>
                  <td className="celda-val">{r.valor_nuevo || '—'}</td>
                </tr>
              ))}
              {vis.length === 0 && <tr><td colSpan={7} className="center muted pad">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
