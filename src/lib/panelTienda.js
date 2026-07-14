import { cookies } from 'next/headers'
import { createAdminClient } from './supabase/admin'
import { verificarMiembro } from './verificarTienda'

// Resuelve sobre qué tienda opera el panel y autoriza al usuario.
// - dueño/colaborador: via tienda_usuarios o usuarios.pescaderia_id (fallback)
// - developer con tienda elegida (cookie bm_dev_tienda): esa tienda
// Devuelve { pescaderiaId, userId, esDeveloper, rolTienda, esAdmin, esFull } o { error }
export async function resolverTiendaPanel() {
  const miembro = await verificarMiembro()

  // Developer con cookie de tienda elegida
  if (miembro.error) {
    // Intentar como developer
    const admin = createAdminClient()
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: perfil } = await admin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()

    if (perfil?.rol === 'developer') {
      const ck = (await cookies()).get('bm_dev_tienda')?.value
      if (!ck) return { error: 'No autorizado' }
      return { pescaderiaId: ck, userId: user.id, esDeveloper: true, rolTienda: 'admin', esAdmin: true, esFull: true }
    }

    return { error: 'No autorizado' }
  }

  return {
    ...miembro,
    esDeveloper: false,
  }
}
