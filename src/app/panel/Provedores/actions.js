'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Verifica que el usuario sea dueño de una pescadería y devuelve su id.
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

// El local solicita vincularse con un proveedor (pescadería con reparto).
export async function solicitarProveedor(proveedorId) {
  const ctx = await getMiPescaderia()
  if (ctx.error) return { error: ctx.error }
  const { admin, pescaderiaId } = ctx

  if (proveedorId === pescaderiaId) {
    return { error: 'No podés vincularte con tu propia pescadería' }
  }

  // El proveedor tiene que hacer reparto
  const { data: prov } = await admin
    .from('pescaderias')
    .select('id, modalidad')
    .eq('id', proveedorId)
    .maybeSingle()
  if (!prov || !['local_reparto', 'solo_reparto'].includes(prov.modalidad)) {
    return { error: 'Ese proveedor no hace reparto' }
  }

  // ¿Ya existe un vínculo?
  const { data: existente } = await admin
    .from('vinculos_mayoristas')
    .select('estado')
    .eq('proveedor_id', proveedorId)
    .eq('local_id', pescaderiaId)
    .maybeSingle()

  if (existente?.estado === 'aprobado') return { ok: true, estado: 'aprobado' }
  if (existente?.estado === 'pendiente') return { ok: true, estado: 'pendiente' }

  if (existente) {
    // Estaba rechazado: volver a solicitar
    const { error } = await admin
      .from('vinculos_mayoristas')
      .update({ estado: 'pendiente', iniciado_por: 'local', updated_at: new Date().toISOString() })
      .eq('proveedor_id', proveedorId)
      .eq('local_id', pescaderiaId)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin
      .from('vinculos_mayoristas')
      .insert({ proveedor_id: proveedorId, local_id: pescaderiaId, estado: 'pendiente', iniciado_por: 'local' })
    if (error) return { error: error.message }
  }

  revalidatePath('/pescaderia/proveedores')
  return { ok: true, estado: 'pendiente' }
}
