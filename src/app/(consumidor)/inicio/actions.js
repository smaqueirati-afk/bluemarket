'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

const PESCADERIA_DEMO = 'aab4a81c-e409-4c2c-b9df-11077c7f7bcd'

// Genera una palabra clave simple de la vida cotidiana
const PALABRAS = [
  'mate','taza','silla','mesa','llave','puerta','bolso','zapato','plato','cuchara',
  'vaso','reloj','lapiz','libro','carta','cama','manta','jardin','perro','gato',
  'patio','cocina','sopla','balde','farol','frasco','damero','cesto','toalla','espejo',
  'timbre','jarron','boton','cinta','gancho','bolsa','postal','cuadro','aguja','horno',
  'balon','moneda','sereno','paloma','caño','techo','pared','vidrio','banco','cajón',
]
function generarPalabraClave() {
  const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
  const n = Math.floor(Math.random() * 90) + 10
  return `${palabra}${n}`
}

// Guarda un pedido real en la base de datos.
// datos = { entrega, pago, direccion, nota, total }
// items = [{ producto, cantidad }]
export async function crearPedido(datos, items) {
  // 1. Verificar que la persona esté logueada
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Tenés que iniciar sesión para confirmar el pedido' }
  }

  if (!items || items.length === 0) {
    return { error: 'El carrito está vacío' }
  }

  const admin = createAdminClient()

  // Pescadería del consumidor (la asignada en su perfil; si no, la demo)
  const { data: perfilUsuario } = await admin
    .from('usuarios')
    .select('pescaderia_id')
    .eq('id', user.id)
    .maybeSingle()
  const pescaderiaId = perfilUsuario?.pescaderia_id || PESCADERIA_DEMO

  // 2. Buscar/crear la ficha de cliente de este usuario EN esta pescadería
  //    (por usuario_id, o por email para no duplicar)
  let clienteId = null
  const { data: porUsuario } = await admin
    .from('clientes')
    .select('id')
    .eq('pescaderia_id', pescaderiaId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (porUsuario) {
    clienteId = porUsuario.id
  } else {
    const { data: porEmail } = await admin
      .from('clientes')
      .select('id, usuario_id')
      .eq('pescaderia_id', pescaderiaId)
      .eq('email', user.email)
      .maybeSingle()

    if (porEmail) {
      clienteId = porEmail.id
      if (!porEmail.usuario_id) {
        await admin.from('clientes').update({ usuario_id: user.id }).eq('id', porEmail.id)
      }
    } else {
      const { data: nuevoCliente, error: errCliente } = await admin
        .from('clientes')
        .insert({
          pescaderia_id: pescaderiaId,
          usuario_id: user.id,
          nombre: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
        })
        .select('id')
        .single()
      if (errCliente) {
        return { error: 'No se pudo crear la ficha de cliente: ' + errCliente.message }
      }
      clienteId = nuevoCliente?.id || null
    }
  }

  // 3. Calcular totales
  const subtotal = items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const envio = datos.entrega === 'envio' ? 0 : 0  // por ahora envío gratis
  const total = subtotal + envio

  // 4. Crear el pedido (la palabra clave la genera el trigger de la base)
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

  // 5. Crear los items del pedido
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

  return { ok: true, numero: pedido.numero, pedidoId: pedido.id, palabraClave: pedido.palabra_clave }
}

// ── Traer los pedidos del consumidor logueado (admin, sin RLS) ──
export async function misPedidos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pedidos: [] }

  const admin = createAdminClient()
  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, numero, estado, estado_visto, total, created_at, tipo_entrega, palabra_clave')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { pedidos: pedidos || [] }
}

// Marca un pedido como visto por el cliente (borra la notificación de cambio de estado)
export async function marcarEstadoVisto(pedidoId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  await admin
    .from('pedidos')
    .update({ estado_visto: true })
    .eq('id', pedidoId)
    .eq('usuario_id', user.id)

  return { ok: true }
}
