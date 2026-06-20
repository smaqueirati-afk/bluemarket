import { createAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Mercado Pago avisa acá cuando un pago se crea o cambia de estado.
// La URL incluye ?tienda=<id> para saber con qué token consultar el pago.
export async function POST(req) {
  try {
    const url = new URL(req.url)
    const tiendaId = url.searchParams.get('tienda')

    // El id del pago puede venir en el body o en la query
    let body = {}
    try { body = await req.json() } catch {}
    let paymentId =
      url.searchParams.get('data.id') ||
      url.searchParams.get('id') ||
      (body?.data?.id ? String(body.data.id) : null)
    const tipo = body?.type || url.searchParams.get('type') || url.searchParams.get('topic')

    // Solo nos interesan notificaciones de pago
    if (tipo && tipo !== 'payment') return ok()
    if (!paymentId || !tiendaId) return ok()

    const admin = createAdminClient()

    const { data: tienda } = await admin
      .from('pescaderias')
      .select('mp_access_token')
      .eq('id', tiendaId)
      .single()
    if (!tienda?.mp_access_token) return ok()

    // Consultar el pago real en Mercado Pago
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${tienda.mp_access_token}` },
    })
    if (!r.ok) return ok()
    const pago = await r.json()

    const pedidoId = pago.external_reference
    const estado = pago.status // approved | pending | rejected | ...
    if (pedidoId) {
      const nuevoEstado =
        estado === 'approved' ? 'pagado' :
        estado === 'rejected' ? 'rechazado' : 'pendiente'
      await admin
        .from('pedidos')
        .update({
          pago_estado: nuevoEstado,
          pagado: estado === 'approved',
          mp_payment_id: String(paymentId),
        })
        .eq('id', pedidoId)
    }

    return ok()
  } catch (e) {
    // Siempre 200 para que MP no reintente en loop
    return ok()
  }
}

// MP a veces hace un ping GET para validar la URL
export async function GET() {
  return ok()
}

function ok() {
  return new Response('ok', { status: 200 })
}
