import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelFidelizacion from './PanelFidelizacion'
import PanelMiFidelizacion from './PanelMiFidelizacion'

// ── Nivel alcanzado (vendedor): se evalúa de mayor a menor. ──
function nivelDe(config, fact) {
  if (!config) return null
  const f = Number(fact) || 0
  const escalas = [
    ['diamante', config.diamante_min, config.diamante_pct],
    ['oro', config.oro_min, config.oro_pct],
    ['plata', config.plata_min, config.plata_pct],
    ['bronce', config.bronce_min, config.bronce_pct],
  ]
  for (const [nivel, min] of escalas) {
    if (Number(min) > 0 && f >= Number(min)) return nivel
  }
  return null
}

// ── Niveles activos ordenados de menor a mayor (comprador: para "próximo nivel"). ──
function nivelesActivos(config) {
  if (!config) return []
  return [
    { nivel: 'bronce', min: Number(config.bronce_min), pct: Number(config.bronce_pct) },
    { nivel: 'plata', min: Number(config.plata_min), pct: Number(config.plata_pct) },
    { nivel: 'oro', min: Number(config.oro_min), pct: Number(config.oro_pct) },
    { nivel: 'diamante', min: Number(config.diamante_min), pct: Number(config.diamante_pct) },
  ].filter((n) => n.min > 0).sort((a, b) => a.min - b.min)
}

function calcularComprador(config, acumulado) {
  const niveles = nivelesActivos(config)
  const f = Number(acumulado) || 0
  let actual = null
  for (const n of niveles) {
    if (f >= n.min) actual = n
  }
  const proximo = niveles.find((n) => n.min > f) || null
  const pct = actual ? actual.pct : 0
  return {
    nivel: actual?.nivel || null,
    retorno: Math.round(f * pct) / 100,
    proximo: proximo?.nivel || null,
    faltaProximo: proximo ? Math.max(0, proximo.min - f) : 0,
    pctProximo: proximo?.pct || 0,
  }
}

export default async function FidelizacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const admin = createAdminClient()

  // La modalidad define qué vista mostrar.
  const { data: miPescaderia } = await admin
    .from('pescaderias')
    .select('modalidad')
    .eq('id', perfil.pescaderia_id)
    .maybeSingle()

  const haceReparto =
    miPescaderia?.modalidad === 'local_reparto' || miPescaderia?.modalidad === 'solo_reparto'

  const ahora = new Date()
  const mesLabel = ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // ───────────── COMPRADOR (solo_local): "retorno cobrado" por proveedor ─────────────
  if (!haceReparto) {
    const { data: relaciones } = await admin
      .from('clientes')
      .select('id, pescaderia_id')
      .eq('usuario_id', user.id)

    const proveedores = []
    for (const rel of relaciones || []) {
      const { data: config } = await admin
        .from('fidelizacion_config')
        .select('*')
        .eq('pescaderia_id', rel.pescaderia_id)
        .maybeSingle()
      if (!config || !config.activo) continue

      const { data: pesc } = await admin
        .from('pescaderias')
        .select('nombre')
        .eq('id', rel.pescaderia_id)
        .maybeSingle()

      const { data: ciclos } = await admin
        .from('fidelizacion_ciclos')
        .select('id, facturacion_acumulada, fecha_inicio, fecha_cierre, estado, nivel_alcanzado, beneficio_otorgado, cerrado_at')
        .eq('pescaderia_id', rel.pescaderia_id)
        .eq('cliente_id', rel.id)

      const activo = (ciclos || []).find(
        (c) => c.estado === 'activo' && c.fecha_cierre && new Date(c.fecha_cierre) > ahora
      ) || null

      const cerrados = (ciclos || [])
        .filter((c) => c.estado === 'cerrado')
        .sort((a, b) => new Date(b.cerrado_at || 0) - new Date(a.cerrado_at || 0))
        .slice(0, 24)

      const acumulado = activo ? Number(activo.facturacion_acumulada) || 0 : 0

      proveedores.push({
        pescaderia_id: rel.pescaderia_id,
        nombre: pesc?.nombre || 'Proveedor',
        tieneActivo: !!activo,
        acumulado,
        ...calcularComprador(config, acumulado),
        cerrados,
      })
    }

    proveedores.sort((a, b) => Number(b.tieneActivo) - Number(a.tieneActivo) || b.acumulado - a.acumulado)

    return <PanelMiFidelizacion proveedores={proveedores} mesLabel={mesLabel} />
  }

  // ───────────── PROVEEDOR (hace reparto): config + ranking + retornos pagados ─────────────
  const { data: config } = await admin
    .from('fidelizacion_config')
    .select('*')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .maybeSingle()

  const { data: ciclos } = await admin
    .from('fidelizacion_ciclos')
    .select('id, cliente_id, facturacion_acumulada, fecha_inicio, fecha_cierre, estado, nivel_alcanzado, beneficio_otorgado, cerrado_at')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .order('facturacion_acumulada', { ascending: false })

  const ids = [...new Set((ciclos || []).map((c) => c.cliente_id))]
  const nombres = {}
  if (ids.length) {
    const { data: clis } = await admin.from('clientes').select('id, nombre').in('id', ids)
    for (const c of clis || []) nombres[c.id] = c.nombre
  }

  const activos = (ciclos || [])
    .filter((c) => c.estado === 'activo' && c.fecha_cierre && new Date(c.fecha_cierre) > ahora)
    .map((c) => ({
      ...c,
      nombre: nombres[c.cliente_id] || 'Cliente',
      nivel: nivelDe(config, c.facturacion_acumulada),
    }))

  const cerrados = (ciclos || [])
    .filter((c) => c.estado === 'cerrado')
    .sort((a, b) => new Date(b.cerrado_at || 0) - new Date(a.cerrado_at || 0))
    .slice(0, 30)
    .map((c) => ({ ...c, nombre: nombres[c.cliente_id] || 'Cliente' }))

  return <PanelFidelizacion config={config} activos={activos} cerrados={cerrados} mesLabel={mesLabel} />
}
