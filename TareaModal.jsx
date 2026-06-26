import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { TIPO_ADJ, formatoMonto, fechaHora } from './constants'

const VACIA = {
  nombre: '', objetivo: '', origen: '', clasificacion: '', estrategia: '',
  prioridad: '', responsable: '', estado: 'Propuesta', fecha_compromiso: '',
  moneda: 'CLP', valor_neto: '', impuestos: '', comentarios: '',
}

// Asegura que el valor guardado aparezca en el menú aunque ya no esté en el catálogo.
function conActual(ops = [], val) {
  if (val && !ops.includes(val)) return [val, ...ops]
  return ops
}

export default function TareaModal({ tarea, perfil, orgId, esSuper = false, vista, responsables = [], cat = {}, esAprobador = false, onCerrar, onGuardado }) {
  const esNueva = !tarea
  const eliminada = !!tarea?.eliminada
  const aprobado = !!tarea?.presupuesto_aprobado
  const numero = tarea?.numero ?? tarea?.id
  const [aprobando, setAprobando] = useState(false)
  const [notaAprob, setNotaAprob] = useState('')
  const [f, setF] = useState(VACIA)
  const inicial = useRef(VACIA)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [adjuntos, setAdjuntos] = useState([])
  const [tipoAdj, setTipoAdj] = useState('Cotización')
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (tarea) {
      const datos = {
        nombre: tarea.nombre || '', objetivo: tarea.objetivo || '', origen: tarea.origen || '',
        clasificacion: tarea.clasificacion || '', estrategia: tarea.estrategia || '',
        prioridad: tarea.prioridad || '', responsable: tarea.responsable || '',
        estado: tarea.estado || 'Propuesta', fecha_compromiso: tarea.fecha_compromiso || '',
        moneda: tarea.moneda || 'CLP', valor_neto: tarea.valor_neto ?? '',
        impuestos: tarea.impuestos ?? '', comentarios: tarea.comentarios || '',
      }
      setF(datos); inicial.current = datos
      cargarAdjuntos(tarea.id)
    } else {
      const est = cat.estado?.includes('Propuesta') ? 'Propuesta' : (cat.estado?.[0] || 'Propuesta')
      const mon = cat.moneda?.includes('CLP') ? 'CLP' : (cat.moneda?.[0] || 'CLP')
      const base = { ...VACIA, estado: est, moneda: mon }
      setF(base); inicial.current = base
    }
  }, [tarea, cat])

  const sucio = useMemo(() => JSON.stringify(f) !== JSON.stringify(inicial.current), [f])

  const cerrarSeguro = () => {
    if (sucio && !window.confirm('Tienes cambios sin guardar. ¿Cerrar de todas formas?')) return
    onCerrar()
  }

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

  const opcionesResp = useMemo(() => {
    const nombres = responsables.map(r => r.nombre)
    if (f.responsable && !nombres.includes(f.responsable)) return [f.responsable, ...nombres]
    return nombres
  }, [responsables, f.responsable])

  const guardar = async () => {
    if (!f.nombre.trim()) { setError('La tarea necesita un nombre.'); return }
    setGuardando(true); setError(null)
    const payload = {
      nombre: f.nombre.trim(), objetivo: f.objetivo || null, origen: f.origen || null,
      clasificacion: f.clasificacion || null, estrategia: f.estrategia || null,
      prioridad: f.prioridad || null, responsable: f.responsable || null,
      estado: f.estado || 'Propuesta', fecha_compromiso: f.fecha_compromiso || null,
      moneda: f.moneda || null,
      valor_neto: f.valor_neto === '' ? null : Number(f.valor_neto),
      impuestos: f.impuestos === '' ? null : Number(f.impuestos),
      comentarios: f.comentarios || null,
    }
    let res
    if (esNueva) res = await supabase.from('tareas').insert({ ...payload, organizacion_id: orgId }).select().single()
    else res = await supabase.from('tareas').update(payload).eq('id', tarea.id).select().single()
    setGuardando(false)
    if (res.error) { setError(res.error.message); return }
    inicial.current = f
    onGuardado()
  }

  const eliminar = async () => {
    if (!window.confirm(`¿Mover la tarea #${numero} a Eliminadas? Solo tú podrás verla y podrás restaurarla.`)) return
    const { error } = await supabase.rpc('eliminar_tarea', { p_id: tarea.id })
    if (error) { setError(error.message); return }
    onGuardado()
  }

  const restaurar = async () => {
    const { error } = await supabase.rpc('restaurar_tarea', { p_id: tarea.id })
    if (error) { setError(error.message); return }
    onGuardado()
  }

  const confirmarAprobacion = async () => {
    if (sucio) { setError('Guarda los cambios antes de aprobar el presupuesto.'); return }
    const { error } = await supabase.rpc('aprobar_presupuesto', { p_id: tarea.id, p_nota: notaAprob || null })
    if (error) { setError(error.message); return }
    onGuardado()
  }

  const revertirAprobacion = async () => {
    if (!window.confirm('¿Revertir la aprobación? El presupuesto volverá a quedar editable.')) return
    const { error } = await supabase.rpc('revertir_aprobacion', { p_id: tarea.id })
    if (error) { setError(error.message); return }
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
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h2>{esNueva ? 'Nueva tarea' : `Tarea #${numero}`}</h2>
          <button className="x" onClick={cerrarSeguro}>✕</button>
        </div>

        <div className="modal-body">
          {eliminada && (
            <div className="aviso warn">
              Esta tarea está en <strong>Eliminadas</strong>. Usa "Restaurar" para devolverla a la vista de todos.
            </div>
          )}

          <label>Nombre de la tarea *</label>
          <input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Reparación del portón vehicular" />

          <label>Objetivo</label>
          <textarea rows={2} value={f.objetivo} onChange={e => set('objetivo', e.target.value)} placeholder="¿Qué se busca lograr?" />

          <div className="grid2">
            <Campo label="Origen"><Select value={f.origen} onChange={v => set('origen', v)} ops={conActual(cat.origen, f.origen)} /></Campo>
            <Campo label="Responsable"><Select value={f.responsable} onChange={v => set('responsable', v)} ops={opcionesResp} /></Campo>
            <Campo label="Clasificación"><Select value={f.clasificacion} onChange={v => set('clasificacion', v)} ops={conActual(cat.clasificacion, f.clasificacion)} /></Campo>
            <Campo label="Estrategia"><Select value={f.estrategia} onChange={v => set('estrategia', v)} ops={conActual(cat.estrategia, f.estrategia)} /></Campo>
            <Campo label="Prioridad"><Select value={f.prioridad} onChange={v => set('prioridad', v)} ops={conActual(cat.prioridad, f.prioridad)} /></Campo>
            <Campo label="Estado"><Select value={f.estado} onChange={v => set('estado', v)} ops={conActual(cat.estado, f.estado)} sinVacio /></Campo>
            <Campo label="Fecha compromiso"><input type="date" value={f.fecha_compromiso || ''} onChange={e => set('fecha_compromiso', e.target.value)} /></Campo>
            <Campo label="Moneda"><Select value={f.moneda} onChange={v => set('moneda', v)} ops={conActual(cat.moneda, f.moneda)} sinVacio disabled={aprobado} /></Campo>
          </div>

          <div className="presupuesto">
            <Campo label="Valor neto">
              <input type="number" value={f.valor_neto} disabled={aprobado} onChange={e => set('valor_neto', e.target.value)} placeholder="0" />
            </Campo>
            <Campo label={<>Impuestos {!aprobado && <button type="button" className="mini" onClick={calcular19}>19%</button>}</>}>
              <input type="number" value={f.impuestos} disabled={aprobado} onChange={e => set('impuestos', e.target.value)} placeholder="0" />
            </Campo>
            <Campo label="Valor bruto">
              <div className="bruto">{formatoMonto(bruto, f.moneda)}</div>
            </Campo>
          </div>

          {!esNueva && (
            <div className="aprobacion">
              {aprobado ? (
                <div className="aprob-ok">
                  <div>
                    <strong>✓ Presupuesto aprobado</strong> por {tarea.aprobado_nombre || tarea.aprobado_por} · {fechaHora(tarea.aprobado_at)}
                    {tarea.aprobacion_nota && <div className="muted small">Nota: {tarea.aprobacion_nota}</div>}
                  </div>
                  {esSuper && <button className="btn ghost" onClick={revertirAprobacion}>Revertir aprobación</button>}
                </div>
              ) : esAprobador ? (
                aprobando ? (
                  <div className="aprob-form">
                    <label>Nota de aprobación (opcional)</label>
                    <textarea rows={2} value={notaAprob} onChange={e => setNotaAprob(e.target.value)} placeholder="Ej. Aprobado en reunión de comité del 20/06" />
                    <div className="aprob-acciones">
                      <button className="btn ghost" onClick={() => setAprobando(false)}>Cancelar</button>
                      <button className="btn primary" onClick={confirmarAprobacion}>Confirmar aprobación</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn aprobar" onClick={() => setAprobando(true)}>✓ Aprobar presupuesto</button>
                )
              ) : (
                <p className="muted small">El presupuesto aún no está aprobado.</p>
              )}
            </div>
          )}

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
          <div className="foot-left">
            {!esNueva && esSuper && !eliminada && (
              <button className="btn peligro" onClick={eliminar}>Eliminar</button>
            )}
            {eliminada && esSuper && (
              <button className="btn primary" onClick={restaurar}>Restaurar</button>
            )}
          </div>
          <div className="foot-right">
            <button className="btn ghost" onClick={cerrarSeguro}>Cancelar</button>
            {!eliminada && (
              <button className="btn primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : (esNueva ? 'Crear tarea' : 'Guardar cambios')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return <div className="campo"><label>{label}</label>{children}</div>
}

function Select({ value, onChange, ops, sinVacio, disabled }) {
  return (
    <select value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)}>
      {!sinVacio && <option value="">—</option>}
      {ops.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
