import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelPescaderia from './PanelPescaderia'
import SplashPanel from './SplashPanel'

export default async function DashboardPescaderia() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id, nombre')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const admin = createAdminClient()

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('*')
    .eq('id', perfil.pescaderia_id)
    .single()

  const { data: pedidos } = await admin
    .from('pedidos')
    .select('*')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .order('created_at', { ascending: false })

  // Sumar teléfono, nombre y email del cliente a cada pedido.
  let pedidosConTel = pedidos || []
  const usuarioIds = [...new Set(pedidosConTel.map((p) => p.usuario_id).filter(Boolean))]
  if (usuarioIds.length > 0) {
    const { data: clientes } = await admin
      .from('clientes')
      .select('usuario_id, telefono, nombre, email')
      .eq('pescaderia_id', perfil.pescaderia_id)
      .in('usuario_id', usuarioIds)

    const mapa = {}
    for (const c of clientes || []) mapa[c.usuario_id] = c

    pedidosConTel = pedidosConTel.map((p) => ({
      ...p,
      cliente_telefono: mapa[p.usuario_id]?.telefono ?? null,
      cliente_nombre:   mapa[p.usuario_id]?.nombre   ?? null,
      cliente_email:    mapa[p.usuario_id]?.email     ?? null,
    }))
  }

  // Traer los ítems de cada pedido (para mostrarlos y poder cargar el peso real)
  const pedidoIds = pedidosConTel.map((p) => p.id)
  if (pedidoIds.length > 0) {
    const { data: items } = await admin
      .from('items_pedido')
      .select('id, pedido_id, producto_id, nombre, cantidad, unidad, precio_unit, subtotal, cantidad_final, subtotal_final')
      .in('pedido_id', pedidoIds)

    const porPedido = {}
    for (const it of items || []) {
      if (!porPedido[it.pedido_id]) porPedido[it.pedido_id] = []
      porPedido[it.pedido_id].push(it)
    }
    pedidosConTel = pedidosConTel.map((p) => ({ ...p, items: porPedido[p.id] || [] }))
  }

  return (
    <>
      <SplashPanel rubro={pescaderia.rubro} slug={pescaderia.slug} />
      <PanelPescaderia
        pescaderia={pescaderia}
        pedidos={pedidosConTel}
        nombreUsuario={perfil.nombre}
        usuarioId={user.id}
      />
    </>
  )
}
