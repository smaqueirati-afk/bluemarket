'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { acumularPedido } from '../../../lib/fidelizacion'

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

  // ── Gate: las opciones de entrega dependen de la modalidad de la pescadería ──
  const { data: pescModalidad } = await admin
    .from('pescaderias')
    .select('modalidad')
    .eq('id', pescaderiaId)
    .maybeSingle()
  const modalidad = pescModalidad?.modalidad
  if (datos.entrega === 'envio' && modalidad === 'solo_local') {
    return { error: 'Esta pescadería no hace envíos, solo retiro en el local.' }
  }
  if (datos.entrega === 'retiro' && modalidad === 'solo_reparto') {
    return { error: 'Esta pescadería es solo reparto, no tiene retiro en el local.' }
  }

  // ── Validación de disponibilidad al confirmar (stock infinito: solo importa "sin stock") ──
  const productoIds = items.map((i) => i.producto.id)
  const { data: productosActuales } = await admin
    .from('productos')
    .select('id, nombre, disponible')
    .in('id', productoIds)

  const problemasStock = []
  for (const item of items) {
    const actual = productosActuales?.find((p) => p.id === item.producto.id)
    if (!actual || !actual.disponible) {
      problemasStock.push(`"${item.producto.nombre}" ya no está disponible`)
    }
  }
  if (problemasStock.length > 0) {
    return { error: problemasStock.join(', '), stockInvalido: true }
  }

  // ── Buscar/crear la ficha de cliente de este usuario EN ESA pescadería ──
  // Dedup por usuario_id (clave confiable).
  let clienteId = null

  const { data: porUsuario } = await admin
    .from('clientes')
    .select('id')
    .eq('pescaderia_id', pescaderiaId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (porUsuario) {
    clienteId = porUsuario.id
    if (datos.telefono) {
      await admin.from('clientes').update({ telefono: datos.telefono }).eq('id', porUsuario.id)
    }
  } else {
    const { data: nuevoCliente, error: errCliente } = await admin
      .from('clientes')
      .insert({
        pescaderia_id: pescaderiaId,
        usuario_id: user.id,
        nombre: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        telefono: datos.telefono || null,
      })
      .select('id')
      .single()
    if (errCliente || !nuevoCliente) {
      return { error: 'No se pudo registrar el cliente: ' + (errCliente?.message || 'sin detalle') }
    }
    clienteId = nuevoCliente.id
  }

  const subtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const envio = 0
  const total = subtotal + envio

  const { data: pedido, error: errPedido } = await admin
    .from('pedidos')
    .insert({
      pescaderia_id: pescaderiaId,
      cliente_id: clienteId,
      usuario_id: user.id,
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
    .select('id, numero, palabra_clave')
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

  // Fidelización: contar este pedido en el ciclo del mes (por fecha de creación,
  // aunque todavía no esté pago ni entregado). No rompe la creación si falla.
  try { await acumularPedido(admin, pedido.id) } catch (e) { /* ignorar */ }

  return { ok: true, numero: pedido.numero, pedidoId: pedido.id, palabraClave: pedido.palabra_clave }
}


// ── Traer los pedidos del cliente logueado en esta pescadería ──
export async function misPedidos(pescaderiaId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No logueado', pedidos: [] }
  if (!pescaderiaId) return { pedidos: [] }

  const admin = createAdminClient()

  // Traer sus pedidos por usuario_id (no depende de la ficha de cliente)
  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, numero, estado, tipo_entrega, total, created_at, palabra_clave, direccion')
    .eq('pescaderia_id', pescaderiaId)
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!pedidos || pedidos.length === 0) return { pedidos: [] }

  // Traer los items de esos pedidos
  const ids = pedidos.map((p) => p.id)
  const { data: items } = await admin
    .from('items_pedido')
    .select('pedido_id, nombre, cantidad, unidad')
    .in('pedido_id', ids)

  // Agrupar items por pedido
  const itemsPorPedido = {}
  ;(items || []).forEach((it) => {
    if (!itemsPorPedido[it.pedido_id]) itemsPorPedido[it.pedido_id] = []
    itemsPorPedido[it.pedido_id].push(it)
  })

  const pedidosConItems = pedidos.map((p) => ({
    ...p,
    items: itemsPorPedido[p.id] || [],
  }))

  return { pedidos: pedidosConItems }
}
