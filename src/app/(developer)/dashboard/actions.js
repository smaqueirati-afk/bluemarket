'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verificarDeveloper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'developer') {
    return { error: 'Solo un developer puede hacer esto' }
  }
  return { user }
}

// Genera un slug prolijo a partir del nombre
function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sacar acentos
    .replace(/[^a-z0-9]+/g, '-')                       // espacios y símbolos -> guión
    .replace(/^-+|-+$/g, '')                           // sacar guiones de los bordes
}

// ── Crear pescadería ──
export async function crearPescaderia(formData) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const nombre = formData.get('nombre')?.trim()
  let slug = formData.get('slug')?.trim().toLowerCase()
  const telefono = formData.get('telefono')?.trim()
  const modalidad = formData.get('modalidad') || 'local_reparto'

  if (!nombre) {
    return { error: 'El nombre es obligatorio' }
  }

  // Si no pusieron slug, generarlo del nombre
  if (!slug) slug = generarSlug(nombre)
  else slug = generarSlug(slug)

  const admin = createAdminClient()
  const { error } = await admin.from('pescaderias').insert({
    nombre,
    slug,
    telefono: telefono || null,
    modalidad,
    plan: 'trial',
    activa: true,
  })

  if (error) return { error: error.message }

  // Crear config de fidelización por defecto
  const { data: nuevaPesc } = await admin
    .from('pescaderias')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (nuevaPesc?.id) {
    await crearConfigFidelizacionPorDefecto(admin, nuevaPesc.id)
  }

  revalidatePath('/dashboard')
  return { ok: true }
}

// ── Asignar dueño (cliente) a una pescadería ──
export async function asignarDueno(pescaderiaId, email) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const emailLimpio = email?.trim().toLowerCase()
  if (!emailLimpio) return { error: 'Falta el email' }

  const admin = createAdminClient()

  // 1. Buscar en la tabla usuarios
  let usuarioId = null
  let usuarioEmail = emailLimpio

  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, email, rol')
    .eq('email', emailLimpio)
    .maybeSingle()

  if (usuario) {
    usuarioId = usuario.id
  } else {
    // 2. No está en usuarios: buscar en auth.users (puede no haber hecho login todavía)
    const { data: { users }, error: errList } = await admin.auth.admin.listUsers()
    if (errList) return { error: errList.message }

    const authUser = users.find((u) => u.email?.toLowerCase() === emailLimpio)
    if (!authUser) {
      return { error: `No se encontró ninguna cuenta con ese email. La persona tiene que entrar una vez con Google antes de poder asignarla.` }
    }

    // Crear registro en usuarios
    const { error: errUpsert } = await admin
      .from('usuarios')
      .upsert({
        id: authUser.id,
        email: authUser.email,
        nombre: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        rol: 'consumidor',
      }, { onConflict: 'id' })

    if (errUpsert) return { error: errUpsert.message }
    usuarioId = authUser.id
  }

  // 3. Asignar rol cliente y pescadería
  const { error: errUpdate } = await admin
    .from('usuarios')
    .update({ rol: 'cliente', pescaderia_id: pescaderiaId })
    .eq('id', usuarioId)

  if (errUpdate) return { error: errUpdate.message }

  // 4. Crear ficha en clientes si no existe
  const { data: fichaExistente } = await admin
    .from('clientes')
    .select('id')
    .eq('pescaderia_id', pescaderiaId)
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (!fichaExistente) {
    await admin.from('clientes').insert({
      pescaderia_id: pescaderiaId,
      usuario_id: usuarioId,
      nombre: usuarioEmail.split('@')[0],
      email: usuarioEmail,
    })
  }

  revalidatePath('/dashboard')
  return { ok: true, email: usuarioEmail }
}

// ── Reactivar usuario (cuando quedó huérfano en auth tras borrar pescadería) ──
export async function reactivarUsuario(authUserId) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  if (!authUserId) return { error: 'Falta el id del usuario' }

  const admin = createAdminClient()

  // Obtener datos del usuario desde auth
  const { data: { user }, error: errAuth } = await admin.auth.admin.getUserById(authUserId)
  if (errAuth || !user) return { error: 'Usuario no encontrado en auth' }

  // Reinsertar en la tabla usuarios (por si fue borrado en cascada)
  const { error: errUpsert } = await admin
    .from('usuarios')
    .upsert({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.full_name || user.email.split('@')[0],
      rol: 'consumidor',
      pescaderia_id: null,
    }, { onConflict: 'id' })

  if (errUpsert) return { error: errUpsert.message }

  revalidatePath('/dashboard')
  return { ok: true, email: user.email }
}

// ── Reactivar usuario por email (busca en auth y lo restaura en la tabla usuarios) ──
export async function reactivarUsuarioPorEmail(email) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const emailLimpio = email?.trim().toLowerCase()
  if (!emailLimpio) return { error: 'Falta el email' }

  const admin = createAdminClient()

  // Buscar en auth.users por email usando listUsers con filtro
  const { data: { users }, error: errList } = await admin.auth.admin.listUsers()
  if (errList) return { error: errList.message }

  const authUser = users.find((u) => u.email?.toLowerCase() === emailLimpio)
  if (!authUser) return { error: 'No existe ningún usuario con ese email en el sistema.' }

  // Reinsertar/actualizar en la tabla usuarios
  const { error: errUpsert } = await admin
    .from('usuarios')
    .upsert({
      id: authUser.id,
      email: authUser.email,
      nombre: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
      rol: 'consumidor',
      pescaderia_id: null,
    }, { onConflict: 'id' })

  if (errUpsert) return { error: errUpsert.message }

  revalidatePath('/dashboard')
  return { ok: true, email: authUser.email }
}

// ── Iniciar / cancelar periodo de prueba ──
export async function toggleTrial(pescaderiaId, activar) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  const trialHasta = activar
    ? new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null

  const { error } = await admin
    .from('pescaderias')
    .update({ trial_hasta: trialHasta, plan: activar ? 'trial' : 'sin_plan' })
    .eq('id', pescaderiaId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, trial_hasta: trialHasta }
}

// ── Borrar pescadería (definitivo, en cascada) ──
// Todas las FK que apuntan a pescaderias están en ON DELETE CASCADE,
// así que un solo delete arrastra productos, pedidos, clientes,
// repartidores, notificaciones y movimientos de cuenta corriente.
export async function borrarPescaderia(pescaderiaId) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  if (!pescaderiaId) return { error: 'Falta el id de la pescadería' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('pescaderias')
    .delete()
    .eq('id', pescaderiaId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { ok: true }
}


// ── Traer detalle completo de una pescadería: clientes + pedidos ──
export async function getPescaderiaDetalle(pescaderiaId) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  if (!pescaderiaId) return { error: 'Falta el id' }

  const admin = createAdminClient()

  // Clientes
  const { data: clientes } = await admin
    .from('clientes')
    .select('id, nombre, email, telefono, cc_habilitada, cc_saldo, created_at, usuario_id')
    .eq('pescaderia_id', pescaderiaId)
    .order('created_at', { ascending: false })

  // El/los dueño(s) de la pescadería no deben figurar como clientes
  const { data: duenos } = await admin
    .from('usuarios')
    .select('id, email')
    .eq('pescaderia_id', pescaderiaId)
    .eq('rol', 'cliente')
  const duenoIds = new Set((duenos || []).map((d) => d.id))
  const duenoEmails = new Set((duenos || []).map((d) => (d.email || '').toLowerCase()))

  const clientesVisibles = (clientes || []).filter(
    (c) => !duenoIds.has(c.usuario_id) && !duenoEmails.has((c.email || '').toLowerCase())
  )

  // Pedidos (últimos 100) con items
  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, numero, estado, tipo_entrega, metodo_pago, total, created_at, cliente_id, usuario_id')
    .eq('pescaderia_id', pescaderiaId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Mapa cliente_id -> nombre para enriquecer los pedidos
  const mapaClientes = {}
  for (const c of clientes || []) mapaClientes[c.id] = c.nombre || c.email

  const pedidosEnriquecidos = (pedidos || []).map((p) => ({
    ...p,
    cliente_nombre: p.cliente_id ? (mapaClientes[p.cliente_id] || 'Sin nombre') : 'Anónimo',
  }))

  // Métricas rápidas
  const totalFacturado = (pedidos || []).reduce((acc, p) => acc + Number(p.total || 0), 0)
  const pedidosMes = (pedidos || []).filter((p) => {
    const fecha = new Date(p.created_at)
    const ahora = new Date()
    return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear()
  }).length

  return {
    clientes: clientesVisibles,
    pedidos: pedidosEnriquecidos,
    metricas: {
      totalClientes: clientesVisibles.length,
      totalPedidos: (pedidos || []).length,
      totalFacturado,
      pedidosMes,
    },
  }
}


// ── Crear config de fidelización por defecto para una pescadería ──
async function crearConfigFidelizacionPorDefecto(admin, pescaderiaId) {
  await admin.from('fidelizacion_config').upsert({
    pescaderia_id: pescaderiaId,
    activo: true,
    bronce_min: 10000,
    bronce_pct: 2,
    plata_min: 30000,
    plata_pct: 4,
    oro_min: 60000,
    oro_pct: 6,
    diamante_min: 100000,
    diamante_pct: 10,
  }, { onConflict: 'pescaderia_id' })
}

// ── Resetear numeración: borra los pedidos de UNA pescadería y reinicia el contador ──
// El número de pedido lo da una secuencia GLOBAL de la base. Acá borramos los pedidos
// de la pescadería elegida (y sus items + movimientos de cuenta corriente, para no chocar
// con las FK) y reiniciamos la secuencia al próximo número libre: queda en #1 si no quedan
// pedidos en ninguna pescadería, o sigue en max+1 si otras pescaderías todavía tienen pedidos.
export async function resetPedidosPescaderia(pescaderiaId) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  if (!pescaderiaId) return { error: 'Falta el id de la pescadería' }

  const admin = createAdminClient()

  // 1) Ids de los pedidos de esta pescadería
  const { data: peds, error: errPeds } = await admin
    .from('pedidos')
    .select('id')
    .eq('pescaderia_id', pescaderiaId)
  if (errPeds) return { error: errPeds.message }

  const ids = (peds || []).map((p) => p.id)

  // 2) Borrar dependencias y luego los pedidos (en orden, para respetar las FK)
  if (ids.length > 0) {
    await admin.from('items_pedido').delete().in('pedido_id', ids)
    await admin.from('cc_movimientos').delete().in('pedido_id', ids)
    const { error: errDel } = await admin.from('pedidos').delete().in('id', ids)
    if (errDel) return { error: 'No se pudieron borrar los pedidos: ' + errDel.message }
  }

  // 3) Próximo número libre = max(numero de los que quedan) + 1  (=> 1 si no queda ninguno)
  const { data: rest } = await admin
    .from('pedidos')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  const proximo = (rest && rest[0] ? Number(rest[0].numero) : 0) + 1

  // 4) Reiniciar la secuencia (el cliente no puede tocar la secuencia: lo hace la RPC)
  const { error: errSeq } = await admin.rpc('reset_pedidos_seq', { proximo })
  if (errSeq) return { error: 'Pedidos borrados, pero falló el reinicio del contador: ' + errSeq.message }

  revalidatePath('/dashboard')
  return { ok: true, borrados: ids.length, proximo }
}

// ── RESET TOTAL: deja la base limpia salvo los usuarios developer y el catálogo master ──
// Llama a la RPC reset_total() (definida en Supabase) que borra todo en el orden correcto.
export async function resetTotal(confirmacion) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  // Doble seguro: hay que mandar exactamente "BORRAR TODO"
  if (confirmacion !== 'BORRAR TODO') {
    return { error: 'Confirmación incorrecta. Escribí BORRAR TODO para continuar.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('reset_total')
  if (error) return { error: 'No se pudo resetear: ' + error.message }

  revalidatePath('/dashboard')
  return { ok: true }
}
