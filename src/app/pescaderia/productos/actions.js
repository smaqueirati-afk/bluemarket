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

// ── Crear producto ──
export async function crearProducto(datos) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  const { error } = await admin.from('productos').insert({
    pescaderia_id: check.pescaderiaId,
    nombre: datos.nombre,
    descripcion: datos.descripcion || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji || null,
    foto_url: datos.foto_url || null,
    precio: Number(datos.precio) || 0,
    unidad: datos.unidad || 'kg',
    disponible: true,
    destacado: !!datos.destacado,
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

  // Verificar que el producto pertenece a esta pescadería
  const { data: prod } = await admin
    .from('productos')
    .select('pescaderia_id')
    .eq('id', productoId)
    .single()

  if (!prod || prod.pescaderia_id !== check.pescaderiaId) {
    return { error: 'Ese producto no es de tu pescadería' }
  }

  const { error } = await admin.from('productos').update({
    nombre: datos.nombre,
    descripcion: datos.descripcion || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji || null,
    foto_url: datos.foto_url || null,
    precio: Number(datos.precio) || 0,
    unidad: datos.unidad || 'kg',
    destacado: !!datos.destacado,
  }).eq('id', productoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}

// ── Toggle disponible (pausar/activar) ──
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
    return { error: 'Ese producto no es de tu pescadería' }
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
    return { error: 'Ese producto no es de tu pescadería' }
  }

  const { error } = await admin.from('productos').delete().eq('id', productoId)

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
}

// ── Importar productos desde el catálogo master ──
export async function importarDesdeCatalogo(productoIds) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }
  if (!productoIds?.length) return { error: 'No seleccionaste productos' }

  const admin = createAdminClient()

  const { data: masterProductos } = await admin
    .from('catalogo_master')
    .select('*')
    .in('id', productoIds)

  if (!masterProductos?.length) return { error: 'No se encontraron productos en el catálogo' }

  const insertar = masterProductos.map((p) => ({
    pescaderia_id: check.pescaderiaId,
    nombre: p.nombre,
    descripcion: p.descripcion || null,
    categoria: p.categoria || null,
    emoji: p.emoji || null,
    foto_url: p.foto_url || null,
    precio: p.precio_sugerido || 0,
    unidad: p.unidad || 'kg',
    disponible: true,
    destacado: false,
  }))

  const { error } = await admin.from('productos').insert(insertar)
  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true, cantidad: insertar.length }
}
