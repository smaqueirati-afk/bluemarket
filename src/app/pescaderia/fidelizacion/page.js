import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelFidelizacion from './PanelFidelizacion'

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

  // Nombres de clientes
  const ids = [...new Set((ciclos || []).map((c) => c.cliente_id))]
  const nombres = {}
  if (ids.length) {
    const { data: clis } = await admin.from('clientes').select('id, nombre').in('id', ids)
    for (const c of clis || []) nombres[c.id] = c.nombre
  }

  const activos = (ciclos || [])
    .filter((c) => c.estado === 'activo')
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

  return <PanelFidelizacion config={config} activos={activos} cerrados={cerrados} />
}
