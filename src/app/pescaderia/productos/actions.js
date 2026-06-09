'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Verifica que sea cliente (dueño) y devuelve su pescaderia_id
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

// ── Crear producto ──
export async function crearProducto(datos) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const nombre = datos.nombre?.trim()
  const precio = Number(datos.precio)

  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (!precio || precio <= 0) return { error: 'Poné un precio válido' }

  const admin = createAdminClient()
  const { error } = await admin.from('productos').insert({
    pescaderia_id: check.pescaderiaId,
    nombre,
    descripcion: datos.descripcion?.trim() || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji?.trim() || null,
    foto_url: datos.foto_url || null,
    precio,
    unidad: datos.unidad || 'kg',
    stock: datos.stock ? Number(datos.stock) : null,
    disponible: true,
    destacado: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}

// ── Editar producto ──
export async function editarProducto(productoId, datos) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  // Verificar que el producto sea de esta pescadería
  const { data: prod } = await admin
    .from('productos')
    .select('pescaderia_id')
    .eq('id', productoId)
    .single()

  if (!prod || prod.pescaderia_id !== check.pescaderiaId) {
    return { error: 'Ese producto no es de tu pescadería' }
  }

  const precio = Number(datos.precio)
  if (!datos.nombre?.trim()) return { error: 'El nombre es obligatorio' }
  if (!precio || precio <= 0) return { error: 'Poné un precio válido' }

  const { error } = await admin
    .from('productos')
    .update({
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
      categoria: datos.categoria || null,
      emoji: datos.emoji?.trim() || null,
      foto_url: datos.foto_url || null,
      precio,
      unidad: datos.unidad || 'kg',
      stock: datos.stock ? Number(datos.stock) : null,
    })
    .eq('id', productoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}

// ── Activar / desactivar (disponible) ──
export async function toggleDisponible(productoId, disponible) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { data: prod } = await admin
    .from('productos')
    .select('pescaderia_id')
    .eq('id', productoId)
    .single()

  if (!prod || prod.pescaderia_id !== check.pescaderiaId) {
    return { error: 'No autorizado' }
  }

  const { error } = await admin
    .from('productos')
    .update({ disponible })
    .eq('id', productoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}

// ── Borrar producto ──
export async function borrarProducto(productoId) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { data: prod } = await admin
    .from('productos')
    .select('pescaderia_id')
    .eq('id', productoId)
    .single()

  if (!prod || prod.pescaderia_id !== check.pescaderiaId) {
    return { error: 'No autorizado' }
  }

  const { error } = await admin
    .from('productos')
    .delete()
    .eq('id', productoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}
