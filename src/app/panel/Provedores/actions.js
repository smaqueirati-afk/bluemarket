'use server'

import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { resolverTiendaPanel } from '../../../lib/panelTienda'

// Resuelve la tienda del contexto: dueño = la suya; developer ("Gestionar") = la elegida (cookie).
async function getMiPescaderia() {
  const ctx = await resolverTiendaPanel()
  if (ctx.error) return { error: ctx.error }
  const admin = createAdminClient()
  return { admin, pescaderiaId: ctx.pescaderiaId }
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
