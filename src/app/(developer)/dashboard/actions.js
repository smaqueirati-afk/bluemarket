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

  const { data: usuario, error: errBusca } = await admin
    .from('usuarios')
    .select('id, email, rol')
    .eq('email', emailLimpio)
    .single()

  if (errBusca || !usuario) {
    return { error: 'No se encontró ese email. La persona tiene que entrar una vez con Google antes de asignarla.' }
  }

  const { error: errUpdate } = await admin
    .from('usuarios')
    .update({ rol: 'cliente', pescaderia_id: pescaderiaId })
    .eq('id', usuario.id)

  if (errUpdate) return { error: errUpdate.message }

  await admin.from('clientes').insert({
    pescaderia_id: pescaderiaId,
    usuario_id: usuario.id,
    nombre: usuario.email.split('@')[0],
    email: usuario.email,
  })

  revalidatePath('/dashboard')
  return { ok: true, email: usuario.email }
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
