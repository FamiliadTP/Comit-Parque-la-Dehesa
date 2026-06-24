export const ORIGEN = ['Comité', 'Administración', 'Asamblea']
export const CLASIF = ['Reparación', 'Mantención', 'Adquisición', 'Mejora/Proyecto', 'Legal/Normativo', 'Gestión/Administrativo', 'Seguridad']
export const ESTRAT = ['Mejora de valor', 'Reducir gastos', 'Cumplimiento legal', 'Seguridad', 'Continuidad del servicio', 'Comunicación/comunidad']
export const PRIORIDAD = ['Alta', 'Media', 'Baja']
export const ESTADO = ['Propuesta', 'Aprobada', 'En cotización', 'En proceso', 'En pausa', 'Realizada', 'Descartada']
export const MONEDA = ['CLP', 'UF', 'USD']
export const TIPO_ADJ = ['Cotización', 'Presupuesto', 'Informe', 'Registro', 'Otro']

export const PRIORIDAD_STYLE = {
  'Alta':  { color: '#9B2C2C', bg: '#FBE8E6' },
  'Media': { color: '#945C00', bg: '#FCF0DA' },
  'Baja':  { color: '#2F6B4F', bg: '#E7F3EC' },
}

export const ESTADO_STYLE = {
  'Propuesta':     { color: '#4A5568', bg: '#EDF0F4' },
  'Aprobada':      { color: '#1F6FB2', bg: '#E5F0FA' },
  'En cotización': { color: '#6B4FA0', bg: '#EFEAFA' },
  'En proceso':    { color: '#1F7A6B', bg: '#E1F3EF' },
  'En pausa':      { color: '#8A6D00', bg: '#FAF2D6' },
  'Realizada':     { color: '#2F6B4F', bg: '#E7F3EC' },
  'Descartada':    { color: '#8A8F98', bg: '#F0F1F3' },
}

const PESOS = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const DEC = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatoMonto(valor, moneda) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = Number(valor)
  if (Number.isNaN(n)) return '—'
  if (moneda === 'CLP') return '$' + PESOS.format(n)
  if (moneda === 'UF') return DEC.format(n) + ' UF'
  if (moneda === 'USD') return 'US$' + DEC.format(n)
  return PESOS.format(n)
}

export function fechaCorta(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '—' }
}

export function fechaHora(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}
