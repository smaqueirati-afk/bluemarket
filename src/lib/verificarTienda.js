'use server'

import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

// ── verificarMiembro ─────────────────────────────────────────────────────────
// Verifica que el usuario logueado tenga acceso a alguna tienda.
// Devuelve { pescaderiaId, rolTienda, userId } o { error }.
//
// rolTienda puede ser: 'admin' | 'full' | 'colaborador'
// - admin y full tienen acceso total
// - colaborador tiene acceso limitado (solo pedidos y productos)

export async function verificarMiembro() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  // Buscar en tienda_usuarios primero (modelo nuevo multi-dueño)
  const { data: membresia } = await admin
    .from('tienda_usuarios')
    .select('pescaderia_id, rol_tienda')
    .eq('usuario_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membresia) {
    return {
      userId: user.id,
      pescaderiaId: membresia.pescaderia_id,
      rolTienda: membresia.rol_tienda,
      esAdmin: membresia.rol_tienda === 'admin',
      esFull: membresia.rol_tienda === 'admin' || membresia.rol_tienda === 'full',
    }
  }

  // Fallback: modelo anterior (usuarios.pescaderia_id con rol='cliente')
  const { data: perfil } = await admin
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'cliente' && perfil?.pescaderia_id) {
    return {
      userId: user.id,
      pescaderiaId: perfil.pescaderia_id,
      rolTienda: 'admin', // los dueños anteriores quedan como admin
      esAdmin: true,
      esFull: true,
    }
  }

  return { error: 'No autorizado' }
}

// ── verificarAdmin ───────────────────────────────────────────────────────────
// Solo pasan los admin (y developer). Usado para config, CC, colaboradores.

export async function verificarAdmin() {
  const check = await verificarMiembro()
  if (check.error) return check
  if (!check.esAdmin) return { error: 'Solo el administrador de la tienda puede hacer esto' }
  return check
}
