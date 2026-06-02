import { createAdminClient } from '../../../lib/supabase/admin'
import TiendaCliente from './TiendaCliente'

// ID de la pescadería de prueba (BlueMarket Escobar)
const PESCADERIA_DEMO = '11111111-1111-1111-1111-111111111111'

export default async function InicioPage() {
  // Usamos el cliente admin para leer el catálogo (ver productos es público)
  const admin = createAdminClient()

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', PESCADERIA_DEMO)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  return <TiendaCliente productos={productos || []} />
}
