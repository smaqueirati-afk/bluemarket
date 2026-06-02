'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Cambiar el estado de un pedido (solo el dueño de esa pescadería puede)
export async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente') {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()

  // Verificar que el pedido sea de la pescadería de este usuario
  const { data: pedido } = await admin
    .from('pedidos')
    .select('pescaderia_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.pescaderia_id !== perfil.pescaderia_id) {
    return { error: 'Ese pedido no es de tu pescadería' }
  }

  // Actualizar el estado
  const { error } = await admin
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia')
  return { ok: true }
}
