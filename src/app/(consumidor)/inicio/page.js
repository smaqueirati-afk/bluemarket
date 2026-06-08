import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import TiendaCliente from './TiendaCliente'

// ID de la pescadería de prueba (BlueMarket Escobar)
const PESCADERIA_DEMO = 'aab4a81c-e409-4c2c-b9df-11077c7f7bcd'

export default async function InicioPage() {
  // Usamos el cliente admin para leer el catálogo (ver productos es público)
  const admin = createAdminClient()

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', PESCADERIA_DEMO)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  // Usuario logueado (puede no estarlo: la tienda es pública). Sirve para el botón de invitar.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <TiendaCliente productos={productos || []} usuarioId={user?.id || null} />
}
