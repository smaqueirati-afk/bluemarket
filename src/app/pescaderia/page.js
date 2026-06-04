import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelPescaderia from './PanelPescaderia'

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

  // Sumar el teléfono del cliente a cada pedido (para el botón de WhatsApp en reparto).
  // Se engancha la tabla clientes por usuario_id dentro de esta pescadería.
  let pedidosConTel = pedidos || []
  const usuarioIds = [...new Set(pedidosConTel.map((p) => p.usuario_id).filter(Boolean))]
  if (usuarioIds.length > 0) {
    const { data: clientes } = await admin
      .from('clientes')
      .select('usuario_id, telefono, nombre')
      .eq('pescaderia_id', perfil.pescaderia_id)
      .in('usuario_id', usuarioIds)

    const mapa = {}
    for (const c of clientes || []) mapa[c.usuario_id] = c

    pedidosConTel = pedidosConTel.map((p) => ({
      ...p,
      cliente_telefono: mapa[p.usuario_id]?.telefono ?? null,
      cliente_nombre: mapa[p.usuario_id]?.nombre ?? null,
    }))
  }

  return (
    <PanelPescaderia
      pescaderia={pescaderia}
      pedidos={pedidosConTel}
      nombreUsuario={perfil.nombre}
      usuarioId={user.id}
    />
  )
}
