'use server'

import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verificarDeveloper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'developer') return { error: 'Solo developer' }
  return { user }
}

export async function crearProductoMaster(datos) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { error } = await admin.from('catalogo_master').insert({
    nombre: datos.nombre?.trim(),
    descripcion: datos.descripcion?.trim() || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji || null,
    foto_url: datos.foto_url || null,
    precio_sugerido: datos.precio_sugerido ? Number(datos.precio_sugerido) : null,
    unidad: datos.unidad || 'kg',
    activo: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function editarProductoMaster(id, datos) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { error } = await admin.from('catalogo_master').update({
    nombre: datos.nombre?.trim(),
    descripcion: datos.descripcion?.trim() || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji || null,
    foto_url: datos.foto_url || null,
    precio_sugerido: datos.precio_sugerido ? Number(datos.precio_sugerido) : null,
    unidad: datos.unidad || 'kg',
    activo: datos.activo ?? true,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function borrarProductoMaster(id) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { error } = await admin.from('catalogo_master').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

// Importa productos del catálogo master a una pescadería específica
export async function importarDesdemaster(pescaderiaId, productoIds) {
  const check = await verificarDeveloper()
  if (check.error) return { error: check.error }

  if (!pescaderiaId || !productoIds?.length) return { error: 'Faltan datos' }

  const admin = createAdminClient()

  const { data: productos } = await admin
    .from('catalogo_master')
    .select('*')
    .in('id', productoIds)

  if (!productos?.length) return { error: 'No se encontraron productos' }

  const insertar = productos.map((p) => ({
    pescaderia_id: pescaderiaId,
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

  revalidatePath('/dashboard')
  return { ok: true, cantidad: insertar.length }
}
