'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Verifica que quien llama sea developer. Devuelve el user o un error.
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

// ── Crear pescadería ──
export async function crearPescaderia(formData) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const nombre = formData.get('nombre')?.trim()
  const slug = formData.get('slug')?.trim().toLowerCase()
  const telefono = formData.get('telefono')?.trim()

  if (!nombre || !slug) {
    return { error: 'Nombre y slug son obligatorios' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('pescaderias').insert({
    nombre,
    slug,
    telefono: telefono || null,
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

  // 1. Buscar al usuario por email (tiene que haber entrado al menos una vez)
  const { data: usuario, error: errBusca } = await admin
    .from('usuarios')
    .select('id, email, rol')
    .eq('email', emailLimpio)
    .single()

  if (errBusca || !usuario) {
    return { error: 'No se encontró ese email. La persona tiene que entrar una vez con Google antes de asignarla.' }
  }

  // 2. Convertirlo en dueño (cliente) de esa pescadería
  const { error: errUpdate } = await admin
    .from('usuarios')
    .update({ rol: 'cliente', pescaderia_id: pescaderiaId })
    .eq('id', usuario.id)

  if (errUpdate) return { error: errUpdate.message }

  // 3. Crear también su ficha en la tabla clientes (opcional, para datos comerciales)
  await admin.from('clientes').insert({
    pescaderia_id: pescaderiaId,
    usuario_id: usuario.id,
    nombre: usuario.email.split('@')[0],
    email: usuario.email,
  })

  revalidatePath('/dashboard')
  return { ok: true, email: usuario.email }
}
