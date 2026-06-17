'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getMiPescaderia() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    return { error: 'No sos dueño de una pescadería' }
  }
  return { admin, pescaderiaId: perfil.pescaderia_id }
}

export async function guardarConfigFidelizacion(form) {
  const ctx = await getMiPescaderia()
  if (ctx.error) return { error: ctx.error }
  const { admin, pescaderiaId } = ctx

  const num = (v) => {
    const n = Number(v)
    return isNaN(n) || n < 0 ? 0 : n
  }

  const { error } = await admin.from('fidelizacion_config').upsert(
    {
      pescaderia_id: pescaderiaId,
      activo: !!form.activo,
      bronce_min: num(form.bronce_min),
      bronce_pct: num(form.bronce_pct),
      plata_min: num(form.plata_min),
      plata_pct: num(form.plata_pct),
      oro_min: num(form.oro_min),
      oro_pct: num(form.oro_pct),
      diamante_min: num(form.diamante_min),
      diamante_pct: num(form.diamante_pct),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'pescaderia_id' }
  )

  if (error) return { error: error.message }
  revalidatePath('/pescaderia/fidelizacion')
  return { ok: true }
}
