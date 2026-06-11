// Motor de fidelización (lado servidor).
// Se llama pasándole un admin client ya creado (bypassa RLS).

// Rango del mes calendario actual: [inicio del mes, inicio del mes siguiente)
function rangoMesActual(fecha = new Date()) {
  const y = fecha.getUTCFullYear()
  const m = fecha.getUTCMonth()
  const inicio = new Date(Date.UTC(y, m, 1))
  const cierre = new Date(Date.UTC(y, m + 1, 1)) // 1° del mes siguiente
  return { inicio, cierre }
}

// Nivel alcanzado y % de devolución según la config y la facturación acumulada.
function calcularNivel(config, facturacion) {
  const f = Number(facturacion) || 0
  if (!config) return { nivel: null, pct: 0 }
  const escalas = [
    ['diamante', Number(config.diamante_min), Number(config.diamante_pct)],
    ['oro', Number(config.oro_min), Number(config.oro_pct)],
    ['plata', Number(config.plata_min), Number(config.plata_pct)],
    ['bronce', Number(config.bronce_min), Number(config.bronce_pct)],
  ]
  for (const [nivel, min, pct] of escalas) {
    if (min > 0 && f >= min) return { nivel, pct }
  }
  return { nivel: null, pct: 0 }
}

async function crearCiclo(admin, pedido, inicio, cierre) {
  await admin.from('fidelizacion_ciclos').insert({
    pescaderia_id: pedido.pescaderia_id,
    cliente_id: pedido.cliente_id,
    fecha_inicio: inicio.toISOString(),
    fecha_cierre: cierre.toISOString(),
    facturacion_acumulada: Number(pedido.total) || 0,
    estado: 'activo',
  })
}

// Cierra un ciclo: calcula nivel, genera la devolución en cuenta corriente y lo marca cerrado.
export async function cerrarCiclo(admin, cicloId) {
  const { data: ciclo } = await admin
    .from('fidelizacion_ciclos')
    .select('id, pescaderia_id, cliente_id, facturacion_acumulada, estado')
    .eq('id', cicloId)
    .maybeSingle()
  if (!ciclo || ciclo.estado !== 'activo') return null

  const { data: config } = await admin
    .from('fidelizacion_config')
    .select('*')
    .eq('pescaderia_id', ciclo.pescaderia_id)
    .maybeSingle()

  const { nivel, pct } = calcularNivel(config, ciclo.facturacion_acumulada)
  const beneficio = Math.round(Number(ciclo.facturacion_acumulada) * pct) / 100

  await admin.from('fidelizacion_ciclos').update({
    estado: 'cerrado',
    nivel_alcanzado: nivel,
    beneficio_otorgado: beneficio,
    cerrado_at: new Date().toISOString(),
  }).eq('id', ciclo.id)

  // Devolución como saldo a favor en cuenta corriente (resta el saldo, igual que un pago).
  if (beneficio > 0) {
    const { data: cli } = await admin
      .from('clientes')
      .select('cc_saldo')
      .eq('id', ciclo.cliente_id)
      .maybeSingle()
    const saldoActual = Number(cli?.cc_saldo) || 0
    const nuevoSaldo = saldoActual - beneficio

    await admin.from('cc_movimientos').insert({
      pescaderia_id: ciclo.pescaderia_id,
      cliente_id: ciclo.cliente_id,
      tipo: 'pago',
      monto: beneficio,
      saldo_despues: nuevoSaldo,
      nota: `Devolución fidelización${nivel ? ' ' + nivel : ''}`,
    })
    await admin.from('clientes').update({ cc_saldo: nuevoSaldo }).eq('id', ciclo.cliente_id)
  }

  return { nivel, beneficio }
}

// Acumula un pedido (por fecha de creación) al ciclo del mes actual del cliente.
// Cuenta aunque el pedido NO esté pago ni entregado. Crea el ciclo en la 1ª compra
// del mes y cierra el anterior si quedó de un mes pasado.
export async function acumularPedido(admin, pedidoId) {
  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, pescaderia_id, cliente_id, total')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!pedido || !pedido.cliente_id) return

  // Solo si el programa está activo para esa pescadería
  const { data: config } = await admin
    .from('fidelizacion_config')
    .select('activo')
    .eq('pescaderia_id', pedido.pescaderia_id)
    .maybeSingle()
  if (!config?.activo) return

  const { inicio, cierre } = rangoMesActual()

  const { data: ciclo } = await admin
    .from('fidelizacion_ciclos')
    .select('id, fecha_cierre, facturacion_acumulada')
    .eq('pescaderia_id', pedido.pescaderia_id)
    .eq('cliente_id', pedido.cliente_id)
    .eq('estado', 'activo')
    .maybeSingle()

  if (ciclo) {
    if (new Date(ciclo.fecha_cierre) <= new Date()) {
      // El ciclo activo quedó de un mes anterior: cerrarlo y abrir el del mes nuevo
      await cerrarCiclo(admin, ciclo.id)
      await crearCiclo(admin, pedido, inicio, cierre)
    } else {
      // Ciclo del mes actual: sumar la facturación
      await admin.from('fidelizacion_ciclos')
        .update({ facturacion_acumulada: Number(ciclo.facturacion_acumulada) + (Number(pedido.total) || 0) })
        .eq('id', ciclo.id)
    }
  } else {
    // Primera compra del mes: crear el ciclo y acumular
    await crearCiclo(admin, pedido, inicio, cierre)
  }
}
