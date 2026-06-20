import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelDeveloper from './PanelDeveloper'
import SplashAdmin from './SplashAdmin'

export default async function DashboardDeveloper() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'developer') redirect('/inicio')

  const admin = createAdminClient()

  const { data: pescaderias } = await admin
    .from('pescaderias')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: duenos } = await admin
    .from('usuarios')
    .select('id, nombre, email, pescaderia_id')
    .eq('rol', 'cliente')

  const duenoPorPescaderia = {}
  ;(duenos || []).forEach((d) => {
    if (d.pescaderia_id) {
      duenoPorPescaderia[d.pescaderia_id] = { id: d.id, nombre: d.nombre, email: d.email }
    }
  })

  // Métricas por tienda, para mostrarlas en cada tarjeta sin abrir el detalle
  const { data: pedidosAll } = await admin
    .from('pedidos')
    .select('pescaderia_id, total, created_at')

  const { data: clientesAll } = await admin
    .from('clientes')
    .select('pescaderia_id, usuario_id, email')

  const { data: productosAll } = await admin
    .from('productos')
    .select('pescaderia_id')

  const duenoIds = new Set((duenos || []).map((d) => d.id))
  const duenoEmails = new Set((duenos || []).map((d) => (d.email || '').toLowerCase()))
  const ahora = new Date()
  const MS_30D = 30 * 24 * 60 * 60 * 1000
  const productosPorPescaderia = {}
  for (const pr of (productosAll || [])) {
    productosPorPescaderia[pr.pescaderia_id] = (productosPorPescaderia[pr.pescaderia_id] || 0) + 1
  }

  const metricasPorPescaderia = {}
  const alertasPorPescaderia = {}
  for (const p of (pescaderias || [])) {
    const ped = (pedidosAll || []).filter((x) => x.pescaderia_id === p.id)
    const cli = (clientesAll || []).filter(
      (c) =>
        c.pescaderia_id === p.id &&
        !duenoIds.has(c.usuario_id) &&
        !duenoEmails.has((c.email || '').toLowerCase())
    )
    const totalFacturado = ped.reduce((acc, x) => acc + Number(x.total || 0), 0)
    const pedidosMes = ped.filter((x) => {
      const f = new Date(x.created_at)
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
    }).length
    metricasPorPescaderia[p.id] = {
      totalClientes: cli.length,
      totalPedidos: ped.length,
      pedidosMes,
      totalFacturado,
    }

    // Alertas de datos (diagnóstico rápido, sin logs)
    const alertas = []
    if (!duenoPorPescaderia[p.id]) alertas.push('Sin dueño')
    if (!(productosPorPescaderia[p.id] > 0)) alertas.push('Sin productos')
    if (p.plan === 'trial' && p.trial_hasta && new Date(p.trial_hasta) < ahora) alertas.push('Trial vencido')
    if (ped.length === 0) {
      alertas.push('Sin pedidos')
    } else {
      const ultimo = ped.reduce((max, x) => { const d = new Date(x.created_at); return d > max ? d : max }, new Date(0))
      if (ahora - ultimo > MS_30D) alertas.push('Sin pedidos hace +30 días')
    }
    alertasPorPescaderia[p.id] = alertas
  }

  const pescaderiasConDueno = (pescaderias || []).map((p) => ({
    ...p,
    dueno_nombre: duenoPorPescaderia[p.id]?.nombre || null,
    dueno_email: duenoPorPescaderia[p.id]?.email || null,
    dueno_auth_id: duenoPorPescaderia[p.id]?.id || null,
    metricas: metricasPorPescaderia[p.id] || null,
    alertas: alertasPorPescaderia[p.id] || [],
  }))

  const { data: catalogo } = await admin
    .from('catalogo_master')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return (
    <>
      <SplashAdmin />
      <PanelDeveloper pescaderias={pescaderiasConDueno} catalogo={catalogo || []} usuarioId={user.id} />
    </>
  )
}
