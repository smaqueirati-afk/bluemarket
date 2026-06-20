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

// ── Categorías propias de la tienda ──
export async function getCategorias() {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('categorias_producto')
    .select('*')
    .eq('pescaderia_id', check.pescaderiaId)
    .order('orden', { ascending: true })

  if (error) return { error: error.message }
  return { categorias: data || [] }
}

export async function crearCategoria(nombre) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }
  const limpio = nombre?.trim()
  if (!limpio) return { error: 'Ingresá un nombre' }

  const admin = createAdminClient()

  // Evitar duplicados (case-insensitive) dentro de la misma tienda
  const { data: existente } = await admin
    .from('categorias_producto')
    .select('id, nombre')
    .eq('pescaderia_id', check.pescaderiaId)
    .ilike('nombre', limpio)
    .maybeSingle()

  if (existente) return { ok: true, categoria: existente, yaExistia: true }

  const { count } = await admin
    .from('categorias_producto')
    .select('id', { count: 'exact', head: true })
    .eq('pescaderia_id', check.pescaderiaId)

  const { data, error } = await admin
    .from('categorias_producto')
    .insert({ pescaderia_id: check.pescaderiaId, nombre: limpio, orden: count || 0 })
    .select('*')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/pescaderia/productos')
  return { ok: true, categoria: data }
}

export async function borrarCategoria(categoriaId) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  const { data: cat } = await admin
    .from('categorias_producto')
    .select('pescaderia_id, nombre')
    .eq('id', categoriaId)
    .maybeSingle()

  if (!cat || cat.pescaderia_id !== check.pescaderiaId) {
    return { error: 'Esa categoría no es de tu tienda' }
  }

  // Los productos que la usaban quedan sin categoría (no se borran)
  await admin
    .from('productos')
    .update({ categoria: null })
    .eq('pescaderia_id', check.pescaderiaId)
    .eq('categoria', cat.nombre)

  const { error } = await admin.from('categorias_producto').delete().eq('id', categoriaId)
  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true }
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

// ── Traer catálogo master filtrado por rubro de la tienda ──
export async function getCatalogoMaster() {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  // Traer el rubro de la tienda
  const { data: pesc } = await admin
    .from('pescaderias')
    .select('rubro')
    .eq('id', check.pescaderiaId)
    .maybeSingle()

  const rubro = pesc?.rubro || null

  let query = admin
    .from('catalogo_master')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  // Filtrar por rubro si la tienda tiene uno definido
  if (rubro) query = query.eq('rubro', rubro)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { productos: data || [], rubro }
}


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

// ── Proponer un producto al catálogo master (para que el developer le suba foto) ──
// Agrega el producto a catalogo_master con pendiente_foto=true.
// Si ya existe un producto con el mismo nombre y rubro, no duplica.
export async function proponerAlCatalogo(datos) {
  const check = await verificarDueno()
  if (check.error) return { error: check.error }

  const admin = createAdminClient()

  // Traer el rubro de la tienda
  const { data: pesc } = await admin
    .from('pescaderias')
    .select('rubro, id')
    .eq('id', check.pescaderiaId)
    .maybeSingle()

  const rubro = pesc?.rubro || 'pescadería'

  // Evitar duplicados: buscar si ya existe por nombre+rubro
  const { data: existente } = await admin
    .from('catalogo_master')
    .select('id, nombre')
    .eq('rubro', rubro)
    .ilike('nombre', datos.nombre?.trim())
    .maybeSingle()

  if (existente) {
    return { ok: true, yaExiste: true, mensaje: `"${existente.nombre}" ya está en el catálogo del rubro ${rubro}.` }
  }

  const { error } = await admin.from('catalogo_master').insert({
    nombre: datos.nombre?.trim(),
    descripcion: datos.descripcion?.trim() || null,
    categoria: datos.categoria || null,
    emoji: datos.emoji || null,
    foto_url: null,           // el developer sube la foto después
    precio_sugerido: datos.precio ? Number(datos.precio) : null,
    unidad: datos.unidad || 'kg',
    rubro,
    pendiente_foto: true,
    propuesto_por: pesc?.id || null,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/pescaderia/productos')
  return { ok: true, yaExiste: false }
}
