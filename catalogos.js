import { supabase } from './supabaseClient'
import { ORIGEN, CLASIF, ESTRAT, PRIORIDAD, ESTADO, MONEDA } from './constants'

// Tipos de lista que el superadmin puede personalizar por organización.
// `def` son los valores por defecto (los que usa hoy el condominio): si una
// organización todavía no tiene valores propios cargados, se usan estos.
export const CATALOGO_TIPOS = [
  { tipo: 'origen',        label: 'Origen',        def: ORIGEN },
  { tipo: 'clasificacion', label: 'Clasificación', def: CLASIF },
  { tipo: 'estrategia',    label: 'Estrategia',    def: ESTRAT },
  { tipo: 'prioridad',     label: 'Prioridad',     def: PRIORIDAD },
  { tipo: 'estado',        label: 'Estado',        def: ESTADO },
  { tipo: 'moneda',        label: 'Moneda',        def: MONEDA },
]

// Devuelve un objeto { origen:[...], clasificacion:[...], ... } con los valores
// activos de la organización. Si un tipo no tiene valores propios, cae a los
// valores por defecto, de modo que nada se rompe mientras no se personalice.
export async function cargarCatalogos(orgId) {
  const base = {}
  for (const { tipo, def } of CATALOGO_TIPOS) base[tipo] = def
  if (!orgId) return base

  const { data, error } = await supabase
    .from('catalogos')
    .select('tipo, valor, orden')
    .eq('organizacion_id', orgId)
    .eq('activo', true)
    .order('orden')
  if (error || !data) return base

  const porTipo = {}
  data.forEach(r => { (porTipo[r.tipo] ||= []).push(r.valor) })

  const out = { ...base }
  for (const { tipo } of CATALOGO_TIPOS) {
    if (porTipo[tipo] && porTipo[tipo].length) out[tipo] = porTipo[tipo]
  }
  return out
}
