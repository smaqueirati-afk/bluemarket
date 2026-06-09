import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import TiendaCliente from './TiendaCliente'

// ID de la pescadería de prueba (BlueMarket Escobar)
const PESCADERIA_DEMO = 'aab4a81c-e409-4c2c-b9df-11077c7f7bcd'

export default async function InicioPage() {
  // Usamos el cliente admin para leer el catálogo (ver productos es público)
  const admin = createAdminClient()

  // Usuario logueado (puede no estarlo: la tienda es pública). Sirve para el botón de invitar.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // La pescadería del consumidor: la asignada en su perfil; si no tiene, la demo
  let pescaderiaId = PESCADERIA_DEMO
  if (user) {
    const { data: perfil } = await admin
      .from('usuarios')
      .select('pescaderia_id')
      .eq('id', user.id)
      .maybeSingle()
    if (perfil?.pescaderia_id) pescaderiaId = perfil.pescaderia_id
  }

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  // Nombre de la pescadería a la que el consumidor le hace el pedido
  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('nombre')
    .eq('id', pescaderiaId)
    .maybeSingle()

  return <TiendaCliente productos={productos || []} usuarioId={user?.id || null} pescaderiaNombre={pescaderia?.nombre || null} />
}
