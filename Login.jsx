import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { CLASIF, ESTRAT, PRIORIDAD, ESTADO, ORIGEN, PRIORIDAD_STYLE, ESTADO_STYLE, formatoMonto } from './constants'
import TareaModal from './TareaModal'

const PRIO_ORDEN = { 'Alta': 0, 'Media': 1, 'Baja': 2 }

export default function Tareas({ perfil }) {
  const [tareas, setTareas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [seleccion, setSeleccion] = useState(null) // tarea en edición, o 'nueva'
  const [conteos, setConteos] = useState({})

  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fClasif, setFClasif] = useState('')
  const [fEstrat, setFEstrat] = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [ocultarDescartadas, setOcultarDescartadas] = useState(true)

  const cargar = async () => {
    setCargando(true); setError(null)
    const { data, error } = await supabase.from('tareas').select('*').order('id', { ascending: true })
    if (error) { setError(error.message); setCargando(false); return }
    setTareas(data || [])
    const { data: adj } = await supabase.from('adjuntos').select('tarea_id')
    const c = {}
    ;(adj || []).forEach(a => { c[a.tarea_id] = (c[a.tarea_id] || 0) + 1 })
    setConteos(c)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return tareas
      .filter(x => !(ocultarDescartadas && x.estado === 'Descartada'))
      .filter(x => !fEstado || x.estado === fEstado)
      .filter(x => !fClasif || x.clasificacion === fClasif)
      .filter(x => !fEstrat || x.estrategia === fEstrat)
      .filter(x => !fPrioridad || x.prioridad === fPrioridad)
      .filter(x => !fOrigen || x.origen === fOrigen)
      .filter(x => !t || (x.nombre || '').toLowerCase().includes(t) || (x.comentarios || '').toLowerCase().includes(t) || (x.responsable || '').toLowerCase().includes(t))
      .sort((a, b) => (PRIO_ORDEN[a.prioridad] ?? 9) - (PRIO_ORDEN[b.prioridad] ?? 9) || a.id - b.id)
  }, [tareas, busqueda, fEstado, fClasif, fEstrat, fPrioridad, fOrigen, ocultarDescartadas])

  const limpiar = () => { setBusqueda(''); setFEstado(''); setFClasif(''); setFEstrat(''); setFPrioridad(''); setFOrigen('') }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Tareas y proyectos</h2>
          <p className="muted small">{filtradas.length} de {tareas.length} tareas</p>
        </div>
        <button className="btn primary" onClick={() => setSeleccion('nueva')}>+ Nueva tarea</button>
      </div>

      <div className="filtros">
        <input className="buscar" placeholder="Buscar por nombre, responsable o comentario…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <Sel value={fEstado} onChange={setFEstado} opciones={ESTADO} label="Estado" />
        <Sel value={fPrioridad} onChange={setFPrioridad} opciones={PRIORIDAD} label="Prioridad" />
        <Sel value={fClasif} onChange={setFClasif} opciones={CLASIF} label="Clasificación" />
        <Sel value={fEstrat} onChange={setFEstrat} opciones={ESTRAT} label="Estrategia" />
        <Sel value={fOrigen} onChange={setFOrigen} opciones={ORIGEN} label="Origen" />
        <button className="btn ghost" onClick={limpiar}>Limpiar</button>
      </div>

      <label className="check">
        <input type="checkbox" checked={ocultarDescartadas} onChange={e => setOcultarDescartadas(e.target.checked)} />
        Ocultar descartadas
      </label>

      {error && <div className="aviso error">No se pudieron cargar las tareas: {error}</div>}
      {cargando ? <div className="muted center pad">Cargando tareas…</div> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Tarea</th>
                <th>Clasificación</th>
                <th>Prioridad</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th className="num">Valor bruto</th>
                <th className="num">Adj.</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(t => (
                <tr key={t.id} onClick={() => setSeleccion(t)} className="fila"
                    style={{ borderLeft: `4px solid ${(ESTADO_STYLE[t.estado] || {}).color || '#ccc'}` }}>
                  <td className="num muted">{t.id}</td>
                  <td className="nombre">{t.nombre}</td>
                  <td className="muted">{t.clasificacion || '—'}</td>
                  <td><Chip texto={t.prioridad} estilos={PRIORIDAD_STYLE} /></td>
                  <td className="muted">{t.responsable || '—'}</td>
                  <td><Chip texto={t.estado} estilos={ESTADO_STYLE} /></td>
                  <td className="num">{formatoMonto(t.valor_bruto, t.moneda)}</td>
                  <td className="num muted">{conteos[t.id] || ''}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="center muted pad">No hay tareas que coincidan con los filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {seleccion && (
        <TareaModal
          tarea={seleccion === 'nueva' ? null : seleccion}
          perfil={perfil}
          onCerrar={() => setSeleccion(null)}
          onGuardado={() => { setSeleccion(null); cargar() }}
        />
      )}
    </div>
  )
}

function Sel({ value, onChange, opciones, label }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={value ? 'on' : ''}>
      <option value="">{label}: todos</option>
      {opciones.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Chip({ texto, estilos }) {
  if (!texto) return <span className="muted">—</span>
  const s = estilos[texto] || { color: '#555', bg: '#eee' }
  return <span className="chip" style={{ color: s.color, background: s.bg }}>{texto}</span>
}
