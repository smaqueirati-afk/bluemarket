'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function crearPescaderia(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'developer') {
    return { error: 'Solo un developer puede crear pescaderías' }
  }

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