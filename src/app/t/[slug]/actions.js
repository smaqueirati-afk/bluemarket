'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

// Guarda un pedido en la pescadería indicada por pescaderiaId.
// datos = { entrega, pago, direccion, nota, total }
// items = [{ producto, cantidad }]
export async function crearPedido(pescaderiaId, datos, items) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Tenés que iniciar sesión para confirmar el pedido' }
  }

  if (!pescaderiaId) {
    return { error: 'No se identificó la pescadería' }
  }

  if (!items || items.length === 0) {
    return { error: 'El carrito está vacío' }
  }

  const admin = createAdminClient()

  // Buscar/crear la ficha de cliente de este usuario EN ESA pescadería.
  // Busca por usuario_id O por email para evitar duplicados.
  let clienteId = null

  // 1. Buscar por usuario_id
  const { data: porUsuario } = await admin
    .from('clientes')
    .select('id')
    .eq('pescaderia_id', pescaderiaId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (porUsuario) {
    clienteId = porUsuario.id
  } else {
    // 2. Buscar por email (por si la ficha existe pero sin usuario_id)
    const { data: porEmail } = await admin
      .from('clientes')
      .select('id, usuario_id')
      .eq('pescaderia_id', pescaderiaId)
      .eq('email', user.email)
      .maybeSingle()

    if (porEmail) {
      clienteId = porEmail.id
      // Si esa ficha no tenía usuario_id, se lo completamos
      if (!porEmail.usuario_id) {
        await admin.from('clientes').update({ usuario_id: user.id }).eq('id', porEmail.id)
      }
    } else {
      // 3. No existe: crear ficha nueva
      const { data: nuevoCliente } = await admin
        .from('clientes')
        .insert({
          pescaderia_id: pescaderiaId,
          usuario_id: user.id,
          nombre: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
        })
        .select('id')
        .single()
      clienteId = nuevoCliente?.id || null
    }
  }

  const subtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const envio = 0
  const total = subtotal + envio

  const { data: pedido, error: errPedido } = await admin
    .from('pedidos')
    .insert({
      pescaderia_id: pescaderiaId,
      cliente_id: clienteId,
      estado: 'nuevo',
      tipo_entrega: datos.entrega === 'envio' ? 'delivery' : 'retiro',
      direccion: datos.direccion || null,
      metodo_pago: datos.pago,
      pagado: false,
      subtotal,
      envio,
      descuento: 0,
      total,
      nota_cliente: datos.nota || null,
    })
    .select('id, numero')
    .single()

  if (errPedido) {
    return { error: 'No se pudo crear el pedido: ' + errPedido.message }
  }

  const itemsParaGuardar = items.map((i) => ({
    pedido_id: pedido.id,
    producto_id: i.producto.id,
    nombre: i.producto.nombre,
    cantidad: i.cantidad,
    unidad: i.producto.unidad,
    precio_unit: i.producto.precio,
    subtotal: i.producto.precio * i.cantidad,
  }))

  const { error: errItems } = await admin
    .from('items_pedido')
    .insert(itemsParaGuardar)

  if (errItems) {
    return { error: 'El pedido se creó pero falló al guardar los productos: ' + errItems.message }
  }

  // Si el pago es cuenta corriente, sumar el total al saldo del cliente y registrar el movimiento
  if (datos.pago === 'cuenta_corriente' && clienteId) {
    const { data: cli } = await admin
      .from('clientes')
      .select('cc_saldo, cc_habilitada')
      .eq('id', clienteId)
      .single()

    if (cli?.cc_habilitada) {
      const saldoActual = Number(cli.cc_saldo) || 0
      const nuevoSaldo = saldoActual + total

      await admin.from('cc_movimientos').insert({
        pescaderia_id: pescaderiaId,
        cliente_id: clienteId,
        pedido_id: pedido.id,
        tipo: 'cargo',
        monto: total,
        saldo_despues: nuevoSaldo,
        nota: `Pedido #${pedido.numero}`,
      })

      await admin.from('clientes').update({ cc_saldo: nuevoSaldo }).eq('id', clienteId)
    }
  }

  return { ok: true, numero: pedido.numero, pedidoId: pedido.id }
}
