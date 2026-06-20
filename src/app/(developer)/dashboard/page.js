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

  const duenoIds = new Set((duenos || []).map((d) => d.id))
  const duenoEmails = new Set((duenos || []).map((d) => (d.email || '').toLowerCase()))
  const ahora = new Date()

  const metricasPorPescaderia = {}
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
  }

  const pescaderiasConDueno = (pescaderias || []).map((p) => ({
    ...p,
    dueno_nombre: duenoPorPescaderia[p.id]?.nombre || null,
    dueno_email: duenoPorPescaderia[p.id]?.email || null,
    dueno_auth_id: duenoPorPescaderia[p.id]?.id || null,
    metricas: metricasPorPescaderia[p.id] || null,
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
