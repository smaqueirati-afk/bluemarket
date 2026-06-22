import { cookies } from 'next/headers'
import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

// Resuelve sobre qué tienda opera el panel y autoriza al usuario.
// - dueño (rol 'cliente'): su propia pescaderia_id
// - developer con tienda elegida (cookie bm_dev_tienda): esa tienda
// Devuelve { pescaderiaId, userId, esDeveloper } o { error }
export async function resolverTiendaPanel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'developer') {
    const ck = (await cookies()).get('bm_dev_tienda')?.value
    if (!ck) return { error: 'No autorizado' }
    return { pescaderiaId: ck, userId: user.id, esDeveloper: true }
  }

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    return { error: 'No autorizado' }
  }
  return { pescaderiaId: perfil.pescaderia_id, userId: user.id, esDeveloper: false }
}
