import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { cerrarCiclo } from '../../../../lib/fidelizacion'

// ─────────────────────────────────────────────────────────────
// Cron mensual: se ejecuta el 1° de cada mes a las 04:00 UTC.
// Hace tres cosas en orden:
//   1. Cierra los ciclos de fidelización cuyo mes ya terminó.
//   2. Guarda un resumen del mes pasado por pescadería (cierres_mes).
//   3. Borra los pedidos 'entregado' y 'cancelado' del mes anterior
//      (junto con sus items_pedido). Los cc_movimientos se conservan para auditoría de cuenta corriente.
// ─────────────────────────────────────────────────────────────

export async function GET(request) {
  // Seguridad: solo Vercel Cron puede llamar esto (manda el secret en Authorization).
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const ahora = new Date()

  // ── Mes que acaba de cerrar ──────────────────────────────────
  // Si el cron corre el 1° de junio, el "mes pasado" es mayo.
  const mesCerrado = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 1))
  const inicioMes  = mesCerrado.toISOString()                                        // 2026-05-01T00:00:00Z
  const finMes     = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString() // 2026-06-01T00:00:00Z
  const labelMes   = `${mesCerrado.getUTCFullYear()}-${String(mesCerrado.getUTCMonth() + 1).padStart(2, '0')}` // '2026-05'

  const resultado = {
    mes: labelMes,
    ciclosCerrados: 0,
    pescaderias: 0,
    pedidosBorrados: 0,
    errores: [],
  }

  // ── PASO 1: Cerrar ciclos de fidelización vencidos ──────────
  const { data: vencidos, error: errCiclos } = await admin
    .from('fidelizacion_ciclos')
    .select('id')
    .eq('estado', 'activo')
    .lte('fecha_cierre', ahora.toISOString())

  if (errCiclos) {
    resultado.errores.push('ciclos: ' + errCiclos.message)
  } else {
    for (const c of vencidos || []) {
      try {
        await cerrarCiclo(admin, c.id)
        resultado.ciclosCerrados++
      } catch (e) {
        resultado.errores.push('ciclo ' + c.id + ': ' + e.message)
      }
    }
  }

  // ── PASO 2: Resumen mensual por pescadería (cierres_mes) ────
  // Pedidos del mes cerrado (entregado + cancelado + cualquier otro que haya quedado)
  const { data: pedidosMes, error: errPedidos } = await admin
    .from('pedidos')
    .select('id, pescaderia_id, estado, total')
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if (errPedidos) {
    resultado.errores.push('pedidos: ' + errPedidos.message)
  } else {
    // Agrupar por pescadería
    const porPescaderia = {}
    for (const p of pedidosMes || []) {
      if (!porPescaderia[p.pescaderia_id]) {
        porPescaderia[p.pescaderia_id] = {
          total_pedidos: 0,
          total_entregados: 0,
          total_cancelados: 0,
          facturacion: 0,
        }
      }
      const g = porPescaderia[p.pescaderia_id]
      g.total_pedidos++
      if (p.estado === 'entregado') {
        g.total_entregados++
        g.facturacion += Number(p.total) || 0
      }
      if (p.estado === 'cancelado') g.total_cancelados++
    }

    // Insertar un cierre por pescadería
    for (const [pescaderiaId, stats] of Object.entries(porPescaderia)) {
      // Solo guardamos si hubo al menos un pedido
      if (stats.total_pedidos === 0) continue
      try {
        await admin.from('cierres_mes').insert({
          pescaderia_id: pescaderiaId,
          mes: labelMes,
          total_pedidos: stats.total_pedidos,
          total_entregados: stats.total_entregados,
          total_cancelados: stats.total_cancelados,
          facturacion: Math.round(stats.facturacion * 100) / 100,
          pedidos_borrados: 0, // lo actualizamos abajo
        })
        resultado.pescaderias++
      } catch (e) {
        resultado.errores.push('cierre ' + pescaderiaId + ': ' + e.message)
      }
    }
  }

  // ── PASO 3: Borrar pedidos cerrados del mes anterior ────────
  // Solo borramos 'entregado' y 'cancelado' — los activos (nuevo/preparando/listo/en_camino)
  // no se tocan aunque sean viejos (no deberían existir, pero por las dudas).
  const { data: aBorrar, error: errBorrar } = await admin
    .from('pedidos')
    .select('id')
    .in('estado', ['entregado', 'cancelado'])
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if (errBorrar) {
    resultado.errores.push('listar a borrar: ' + errBorrar.message)
  } else {
    const ids = (aBorrar || []).map((p) => p.id)
    if (ids.length > 0) {
      // Borrar dependencias primero (FK)
      // cc_movimientos NO se borra: es el historial de deuda/crédito de cuenta corriente.
      // El saldo (cc_saldo en clientes) ya está actualizado; los movimientos se conservan para auditoría.
      await admin.from('items_pedido').delete().in('pedido_id', ids)
      const { error: errDel } = await admin.from('pedidos').delete().in('id', ids)
      if (errDel) {
        resultado.errores.push('borrar pedidos: ' + errDel.message)
      } else {
        resultado.pedidosBorrados = ids.length

        // Actualizar el campo pedidos_borrados en los cierres recién insertados
        await admin
          .from('cierres_mes')
          .update({ pedidos_borrados: ids.length })
          .eq('mes', labelMes)
      }
    }
  }

  return NextResponse.json({ ok: true, ...resultado })
}
