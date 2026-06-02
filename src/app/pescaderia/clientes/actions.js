'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verificarDueno() {
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
  return { pescaderiaId: perfil.pescaderia_id }
}

// Verifica que el cliente pertenezca a la pescadería del dueño
async function clienteEsDeLaPescaderia(admin, clienteId, pescaderiaId) {
  const { data: cli } = await admin
    .from('clientes')
    .select('id, pescaderia_id, cc_saldo')
    .eq('id', clienteId)
    .single()
  if (!cli || cli.pescaderia_id !== pescaderiaId) return null
  return cli
}

// ── Habilitar / deshabilitar cuenta corriente + límite ──
export async function configurarCC(clienteId, habilitada, limite) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const cli = await clienteEsDeLaPescaderia(admin, clienteId, check.pescaderiaId)
  if (!cli) return { error: 'Ese cliente no es de tu pescadería' }

  const lim = limite ? Number(limite) : null

  const { error } = await admin
    .from('clientes')
    .update({
      cc_habilitada: !!habilitada,
      cc_limite: lim,
    })
    .eq('id', clienteId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/clientes')
  return { ok: true }
}

// ── Registrar un pago (resta del saldo) ──
export async function registrarPago(clienteId, monto, nota) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const montoNum = Number(monto)
  if (!montoNum || montoNum <= 0) return { error: 'Poné un monto válido' }

  const admin = createAdminClient()
  const cli = await clienteEsDeLaPescaderia(admin, clienteId, check.pescaderiaId)
  if (!cli) return { error: 'Ese cliente no es de tu pescadería' }

  const saldoActual = Number(cli.cc_saldo) || 0
  const nuevoSaldo = saldoActual - montoNum // un pago REDUCE la deuda

  // 1. Registrar el movimiento
  const { error: errMov } = await admin.from('cc_movimientos').insert({
    pescaderia_id: check.pescaderiaId,
    cliente_id: clienteId,
    tipo: 'pago',
    monto: montoNum,
    saldo_despues: nuevoSaldo,
    nota: nota?.trim() || null,
  })
  if (errMov) return { error: errMov.message }

  // 2. Actualizar el saldo del cliente
  const { error: errSaldo } = await admin
    .from('clientes')
    .update({ cc_saldo: nuevoSaldo })
    .eq('id', clienteId)
  if (errSaldo) return { error: errSaldo.message }

  revalidatePath('/pescaderia/clientes')
  return { ok: true, nuevoSaldo }
}

// ── Registrar un cargo manual (suma a la deuda) ──
export async function registrarCargo(clienteId, monto, nota) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const montoNum = Number(monto)
  if (!montoNum || montoNum <= 0) return { error: 'Poné un monto válido' }

  const admin = createAdminClient()
  const cli = await clienteEsDeLaPescaderia(admin, clienteId, check.pescaderiaId)
  if (!cli) return { error: 'Ese cliente no es de tu pescadería' }

  const saldoActual = Number(cli.cc_saldo) || 0
  const nuevoSaldo = saldoActual + montoNum // un cargo AUMENTA la deuda

  const { error: errMov } = await admin.from('cc_movimientos').insert({
    pescaderia_id: check.pescaderiaId,
    cliente_id: clienteId,
    tipo: 'cargo',
    monto: montoNum,
    saldo_despues: nuevoSaldo,
    nota: nota?.trim() || null,
  })
  if (errMov) return { error: errMov.message }

  const { error: errSaldo } = await admin
    .from('clientes')
    .update({ cc_saldo: nuevoSaldo })
    .eq('id', clienteId)
  if (errSaldo) return { error: errSaldo.message }

  revalidatePath('/pescaderia/clientes')
  return { ok: true, nuevoSaldo }
}

// ── Traer movimientos de un cliente ──
export async function traerMovimientos(clienteId) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const cli = await clienteEsDeLaPescaderia(admin, clienteId, check.pescaderiaId)
  if (!cli) return { error: 'No autorizado' }

  const { data: movimientos } = await admin
    .from('cc_movimientos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { ok: true, movimientos: movimientos || [] }
}
