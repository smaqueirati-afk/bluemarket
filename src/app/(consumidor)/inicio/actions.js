'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

const PESCADERIA_DEMO = 'aab4a81c-e409-4c2c-b9df-11077c7f7bcd'

// Genera una palabra clave de 2 palabras random
const PALABRAS = [
  'mar','pez','ola','sal','red','sol','luna','agua','viento','coral',
  'perla','orca','timon','ancla','faro','marea','remo','barco','bahia','isla',
  'delfin','pulpo','trucha','merluza','langosta','cangrejo','almeja','ostra',
]
function generarPalabraClave() {
  const a = PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
  const b = PALABRAS[Math.floor(Math.random() * PALABRAS.length)]
  const n = Math.floor(Math.random() * 90) + 10
  return `${a}-${b}-${n}`
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

  // 2. Buscar la ficha de cliente de este usuario (si existe) en su pescadería
  let clienteId = null
  const { data: clienteExistente } = await admin
    .from('clientes')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('pescaderia_id', pescaderiaId)
    .maybeSingle()

  if (clienteExistente) {
    clienteId = clienteExistente.id
  } else {
    // Crear ficha de cliente automáticamente
    const { data: nuevoCliente } = await admin
      .from('clientes')
      .insert({
        pescaderia_id: pescaderiaId,
        usuario_id: user.id,
        nombre: user.email.split('@')[0],
        email: user.email,
      })
      .select('id')
      .single()
    clienteId = nuevoCliente?.id || null
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
