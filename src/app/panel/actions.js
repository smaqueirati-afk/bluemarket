'use server'

import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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

  const { data: pedido } = await admin
    .from('pedidos')
    .select('pescaderia_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.pescaderia_id !== perfil.pescaderia_id) {
    return { error: 'Ese pedido no es de tu pescadería' }
  }

  const { error } = await admin
    .from('pedidos')
    .update({ estado: nuevoEstado, estado_visto: false })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia')
  return { ok: true }
}

export async function guardarHorario(pedidoId, horario) {
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

  const { data: pedido } = await admin
    .from('pedidos')
    .select('pescaderia_id')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.pescaderia_id !== perfil.pescaderia_id) {
    return { error: 'Ese pedido no es de tu pescadería' }
  }

  const { error } = await admin
    .from('pedidos')
    .update({ horario })
    .eq('id', pedidoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia')
  return { ok: true }
}

export async function guardarMontoMinimoReparto(monto) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    return { error: 'No autorizado' }
  }

  const valor = Math.max(0, Number(monto) || 0)

  const admin = createAdminClient()

  const { error } = await admin
    .from('pescaderias')
    .update({ monto_minimo_reparto: valor })
    .eq('id', perfil.pescaderia_id)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia')
  return { ok: true }
}

// Ajusta el pedido con los pesos reales que carga el dueño al armarlo.
// pesos = [{ itemId, cantidadFinal }] (en kg). Recalcula subtotales, fija total_final,
// marca pesado=true y reconcilia el saldo de cuenta corriente por la diferencia.
export async function ajustarPesosPedido(pedidoId, pesos) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()

  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, numero, pescaderia_id, metodo_pago, cliente_id, total, total_final, pesado, envio, descuento')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.pescaderia_id !== perfil.pescaderia_id) {
    return { error: 'Ese pedido no es de tu tienda' }
  }

  const { data: items } = await admin
    .from('items_pedido')
    .select('id, unidad, precio_unit, cantidad, subtotal')
    .eq('pedido_id', pedidoId)

  if (!items || items.length === 0) {
    return { error: 'El pedido no tiene ítems' }
  }

  const mapaPesos = {}
  for (const p of (pesos || [])) {
    const v = Number(p.cantidadFinal)
    if (!Number.isNaN(v) && v >= 0) mapaPesos[p.itemId] = v
  }

  // Recalcular subtotal final por ítem
  let subtotalFinal = 0
  const updates = []
  for (const it of items) {
    let cantFinal = Number(it.cantidad)
    if (it.unidad === 'kg' && mapaPesos[it.id] != null) {
      cantFinal = mapaPesos[it.id]
    }
    const subFinal = Math.round(Number(it.precio_unit) * cantFinal)
    subtotalFinal += subFinal
    updates.push({ id: it.id, cantidad_final: cantFinal, subtotal_final: subFinal })
  }

  const envio = Number(pedido.envio || 0)
  const descuento = Number(pedido.descuento || 0)
  const totalFinal = Math.max(0, subtotalFinal + envio - descuento)

  // Guardar cada ítem
  for (const u of updates) {
    const { error: eItem } = await admin
      .from('items_pedido')
      .update({ cantidad_final: u.cantidad_final, subtotal_final: u.subtotal_final })
      .eq('id', u.id)
    if (eItem) return { error: 'No se pudo guardar el peso de un ítem: ' + eItem.message }
  }

  // Guardar total final en el pedido
  const { error: ePed } = await admin
    .from('pedidos')
    .update({ total_final: totalFinal, pesado: true })
    .eq('id', pedidoId)
  if (ePed) return { error: ePed.message }

  // Reconciliar cuenta corriente: al crear el pedido se cargó `total` (o el total_final previo
  // si ya se había pesado). Ajustamos el saldo por la diferencia. Best-effort: si algo falla,
  // el pesaje igual quedó guardado.
  if (pedido.metodo_pago === 'cuenta_corriente' && pedido.cliente_id) {
    try {
      const { data: cli } = await admin
        .from('clientes')
        .select('cc_saldo, cc_habilitada')
        .eq('id', pedido.cliente_id)
        .single()

      if (cli?.cc_habilitada) {
        const cobradoAntes = (pedido.pesado && pedido.total_final != null)
          ? Number(pedido.total_final)
          : Number(pedido.total)
        const diff = totalFinal - cobradoAntes

        if (diff !== 0) {
          const saldoActual = Number(cli.cc_saldo) || 0
          const nuevoSaldo = saldoActual + diff
          await admin.from('clientes').update({ cc_saldo: nuevoSaldo }).eq('id', pedido.cliente_id)
          await admin.from('cc_movimientos').insert({
            pescaderia_id: pedido.pescaderia_id,
            cliente_id: pedido.cliente_id,
            pedido_id: pedidoId,
            tipo: 'ajuste',
            monto: diff,
            saldo_despues: nuevoSaldo,
            nota: `Ajuste por peso final del pedido #${pedido.numero}`,
          })
        }
      }
    } catch (e) { /* el ajuste de CC es best-effort */ }
  }

  revalidatePath('/panel')
  return { ok: true, total_final: totalFinal, items: updates }
}
