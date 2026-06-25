import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'
import { CLASIF, ESTRAT, PRIORIDAD, ESTADO, ORIGEN, PRIORIDAD_STYLE, ESTADO_STYLE, formatoMonto, fechaCorta } from './constants'
import TareaModal from './TareaModal'

const PRIO_ORDEN = { 'Alta': 0, 'Media': 1, 'Baja': 2 }
const FINALIZADAS = ['Realizada', 'Descartada']

const TITULOS = {
  activas: 'Tareas y proyectos',
  historico: 'Histórico (realizadas y descartadas)',
  eliminadas: 'Tareas eliminadas',
}

export default function Tareas({ perfil, vista }) {
  const esSuper = perfil?.rol === 'superadmin'
  const [tareas, setTareas] = useState([])
  const [responsables, setResponsables] = useState([])
  const [esAprobador, setEsAprobador] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [conteos, setConteos] = useState({})

  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fClasif, setFClasif] = useState('')
  const [fEstrat, setFEstrat] = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [fResp, setFResp] = useState('')

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

  useEffect(() => { cargar() }, [vista])
  useEffect(() => {
    supabase.from('responsables').select('*').eq('activo', true).order('orden')
      .then(({ data }) => setResponsables(data || []))
  }, [])
  useEffect(() => {
    if (!perfil?.email) return
    supabase.from('aprobadores').select('email').ilike('email', perfil.email).eq('activo', true).maybeSingle()
      .then(({ data }) => setEsAprobador(!!data))
  }, [perfil])

  const porVista = (x) => {
    if (vista === 'eliminadas') return x.eliminada === true
    if (x.eliminada) return false
    if (vista === 'historico') return FINALIZADAS.includes(x.estado)
    return !FINALIZADAS.includes(x.estado) // activas
  }

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return tareas
      .filter(porVista)
      .filter(x => !fEstado || x.estado === fEstado)
      .filter(x => !fClasif || x.clasificacion === fClasif)
      .filter(x => !fEstrat || x.estrategia === fEstrat)
      .filter(x => !fPrioridad || x.prioridad === fPrioridad)
      .filter(x => !fOrigen || x.origen === fOrigen)
      .filter(x => !fResp || x.responsable === fResp)
      .filter(x => !t || (x.nombre || '').toLowerCase().includes(t) || (x.comentarios || '').toLowerCase().includes(t) || (x.responsable || '').toLowerCase().includes(t))
      .sort((a, b) => (PRIO_ORDEN[a.prioridad] ?? 9) - (PRIO_ORDEN[b.prioridad] ?? 9) || a.id - b.id)
  }, [tareas, vista, busqueda, fEstado, fClasif, fEstrat, fPrioridad, fOrigen, fResp])

  const totalVista = useMemo(() => tareas.filter(porVista).length, [tareas, vista])

  const limpiar = () => { setBusqueda(''); setFEstado(''); setFClasif(''); setFEstrat(''); setFPrioridad(''); setFOrigen(''); setFResp('') }

  const exportarExcel = () => {
    const filas = filtradas.map(t => ({
      'N°': t.id,
      'Tarea': t.nombre,
      'Objetivo': t.objetivo || '',
      'Origen': t.origen || '',
      'Clasificación': t.clasificacion || '',
      'Estrategia': t.estrategia || '',
      'Prioridad': t.prioridad || '',
      'Responsable': t.responsable || '',
      'Estado': t.estado || '',
      'Fecha compromiso': fechaCorta(t.fecha_compromiso),
      'Moneda': t.moneda || '',
      'Valor neto': t.valor_neto ?? '',
      'Impuestos': t.impuestos ?? '',
      'Valor bruto': t.valor_bruto ?? '',
      'Comentarios': t.comentarios || '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tareas')
    const hoy = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `tareas_${vista}_${hoy}.xlsx`)
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 className="page-title">{TITULOS[vista]}</h2>
          <p className="muted small">{filtradas.length} de {totalVista} tareas</p>
        </div>
        <div className="toolbar-acciones">
          <button className="btn ghost" onClick={exportarExcel}>↓ Exportar a Excel</button>
          {vista === 'activas' && <button className="btn primary" onClick={() => setSeleccion('nueva')}>+ Nueva tarea</button>}
        </div>
      </div>

      <div className="filtros">
        <input className="buscar" placeholder="Buscar por nombre, responsable o comentario…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <Sel value={fEstado} onChange={setFEstado} opciones={ESTADO} label="Estado" />
        <Sel value={fPrioridad} onChange={setFPrioridad} opciones={PRIORIDAD} label="Prioridad" />
        <Sel value={fClasif} onChange={setFClasif} opciones={CLASIF} label="Clasificación" />
        <Sel value={fEstrat} onChange={setFEstrat} opciones={ESTRAT} label="Estrategia" />
        <Sel value={fOrigen} onChange={setFOrigen} opciones={ORIGEN} label="Origen" />
        <Sel value={fResp} onChange={setFResp} opciones={responsables.map(r => r.nombre)} label="Responsable" />
        <button className="btn ghost" onClick={limpiar}>Limpiar</button>
      </div>

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
                  <td className="num">{formatoMonto(t.valor_bruto, t.moneda)}{t.presupuesto_aprobado && <span title="Presupuesto aprobado" className="candado">🔒</span>}</td>
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
          vista={vista}
          responsables={responsables}
          esAprobador={esAprobador}
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
