import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { ORIGEN, CLASIF, ESTRAT, PRIORIDAD, ESTADO, MONEDA, TIPO_ADJ, formatoMonto, fechaHora } from './constants'

const VACIA = {
  nombre: '', objetivo: '', origen: '', clasificacion: '', estrategia: '',
  prioridad: '', responsable: '', estado: 'Propuesta', fecha_compromiso: '',
  moneda: 'CLP', valor_neto: '', impuestos: '', comentarios: '',
}

export default function TareaModal({ tarea, perfil, onCerrar, onGuardado }) {
  const esNueva = !tarea
  const [f, setF] = useState(VACIA)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [adjuntos, setAdjuntos] = useState([])
  const [tipoAdj, setTipoAdj] = useState('Cotización')
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (tarea) {
      setF({
        nombre: tarea.nombre || '', objetivo: tarea.objetivo || '', origen: tarea.origen || '',
        clasificacion: tarea.clasificacion || '', estrategia: tarea.estrategia || '',
        prioridad: tarea.prioridad || '', responsable: tarea.responsable || '',
        estado: tarea.estado || 'Propuesta', fecha_compromiso: tarea.fecha_compromiso || '',
        moneda: tarea.moneda || 'CLP', valor_neto: tarea.valor_neto ?? '',
        impuestos: tarea.impuestos ?? '', comentarios: tarea.comentarios || '',
      })
      cargarAdjuntos(tarea.id)
    }
  }, [tarea])

  const cargarAdjuntos = async (id) => {
    const { data } = await supabase.from('adjuntos').select('*').eq('tarea_id', id).order('id', { ascending: false })
    setAdjuntos(data || [])
  }

  const set = (campo, valor) => setF(prev => ({ ...prev, [campo]: valor }))

  const bruto = (Number(f.valor_neto) || 0) + (Number(f.impuestos) || 0)

  const calcular19 = () => {
    const neto = Number(f.valor_neto)
    if (!Number.isNaN(neto) && f.valor_neto !== '') set('impuestos', Math.round(neto * 0.19))
  }

  const guardar = async () => {
    if (!f.nombre.trim()) { setError('La tarea necesita un nombre.'); return }
    setGuardando(true); setError(null)
    const payload = {
      nombre: f.nombre.trim(),
      objetivo: f.objetivo || null,
      origen: f.origen || null,
      clasificacion: f.clasificacion || null,
      estrategia: f.estrategia || null,
      prioridad: f.prioridad || null,
      responsable: f.responsable || null,
      estado: f.estado || 'Propuesta',
      fecha_compromiso: f.fecha_compromiso || null,
      moneda: f.moneda || null,
      valor_neto: f.valor_neto === '' ? null : Number(f.valor_neto),
      impuestos: f.impuestos === '' ? null : Number(f.impuestos),
      comentarios: f.comentarios || null,
    }
    let res
    if (esNueva) res = await supabase.from('tareas').insert(payload).select().single()
    else res = await supabase.from('tareas').update(payload).eq('id', tarea.id).select().single()
    setGuardando(false)
    if (res.error) { setError(res.error.message); return }
    onGuardado()
  }

  const subir = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !tarea) return
    setSubiendo(true); setError(null)
    const limpio = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${tarea.id}/${Date.now()}_${limpio}`
    const up = await supabase.storage.from('adjuntos').upload(path, file)
    if (up.error) { setError('No se pudo subir el archivo: ' + up.error.message); setSubiendo(false); return }
    const ins = await supabase.from('adjuntos').insert({
      tarea_id: tarea.id, tipo: tipoAdj, nombre_archivo: file.name, storage_path: path,
    })
    if (ins.error) setError('Archivo subido, pero no se registró: ' + ins.error.message)
    await cargarAdjuntos(tarea.id)
    setSubiendo(false)
    e.target.value = ''
  }

  const abrir = async (a) => {
    const { data, error } = await supabase.storage.from('adjuntos').createSignedUrl(a.storage_path, 120)
    if (error) { setError('No se pudo abrir el archivo: ' + error.message); return }
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{esNueva ? 'Nueva tarea' : `Tarea #${tarea.id}`}</h2>
          <button className="x" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-body">
          <label>Nombre de la tarea *</label>
          <input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Reparación del portón vehicular" />

          <label>Objetivo</label>
          <textarea rows={2} value={f.objetivo} onChange={e => set('objetivo', e.target.value)} placeholder="¿Qué se busca lograr?" />

          <div className="grid2">
            <Campo label="Origen"><Select value={f.origen} onChange={v => set('origen', v)} ops={ORIGEN} /></Campo>
            <Campo label="Responsable"><input value={f.responsable} onChange={e => set('responsable', e.target.value)} /></Campo>
            <Campo label="Clasificación"><Select value={f.clasificacion} onChange={v => set('clasificacion', v)} ops={CLASIF} /></Campo>
            <Campo label="Estrategia"><Select value={f.estrategia} onChange={v => set('estrategia', v)} ops={ESTRAT} /></Campo>
            <Campo label="Prioridad"><Select value={f.prioridad} onChange={v => set('prioridad', v)} ops={PRIORIDAD} /></Campo>
            <Campo label="Estado"><Select value={f.estado} onChange={v => set('estado', v)} ops={ESTADO} sinVacio /></Campo>
            <Campo label="Fecha compromiso"><input type="date" value={f.fecha_compromiso || ''} onChange={e => set('fecha_compromiso', e.target.value)} /></Campo>
            <Campo label="Moneda"><Select value={f.moneda} onChange={v => set('moneda', v)} ops={MONEDA} sinVacio /></Campo>
          </div>

          <div className="presupuesto">
            <Campo label="Valor neto">
              <input type="number" value={f.valor_neto} onChange={e => set('valor_neto', e.target.value)} placeholder="0" />
            </Campo>
            <Campo label={<>Impuestos <button type="button" className="mini" onClick={calcular19}>19%</button></>}>
              <input type="number" value={f.impuestos} onChange={e => set('impuestos', e.target.value)} placeholder="0" />
            </Campo>
            <Campo label="Valor bruto">
              <div className="bruto">{formatoMonto(bruto, f.moneda)}</div>
            </Campo>
          </div>

          <label>Comentarios</label>
          <textarea rows={2} value={f.comentarios} onChange={e => set('comentarios', e.target.value)} />

          <div className="adjuntos">
            <h3>Presupuestos y documentos</h3>
            {esNueva ? (
              <p className="muted small">Guarda la tarea primero para poder adjuntar archivos.</p>
            ) : (
              <>
                <div className="adj-subir">
                  <select value={tipoAdj} onChange={e => setTipoAdj(e.target.value)}>
                    {TIPO_ADJ.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="btn ghost file">
                    {subiendo ? 'Subiendo…' : 'Adjuntar archivo'}
                    <input type="file" hidden onChange={subir} disabled={subiendo} />
                  </label>
                </div>
                {adjuntos.length === 0 ? <p className="muted small">Sin archivos todavía.</p> : (
                  <ul className="adj-lista">
                    {adjuntos.map(a => (
                      <li key={a.id}>
                        <button className="link" onClick={() => abrir(a)}>{a.nombre_archivo}</button>
                        <span className="muted small">{a.tipo} · {fechaHora(a.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {error && <div className="aviso error">{error}</div>}
        </div>

        <div className="modal-foot">
          <span className="muted small">
            {!esNueva && tarea.updated_at && `Última actualización: ${fechaHora(tarea.updated_at)}`}
          </span>
          <div>
            <button className="btn ghost" onClick={onCerrar}>Cancelar</button>
            <button className="btn primary" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : (esNueva ? 'Crear tarea' : 'Guardar cambios')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return <div className="campo"><label>{label}</label>{children}</div>
}

function Select({ value, onChange, ops, sinVacio }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      {!sinVacio && <option value="">—</option>}
      {ops.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
