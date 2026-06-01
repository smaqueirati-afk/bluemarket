import { createClient } from '../../../lib/supabase/server'
import TiendaCliente from './TiendaCliente'

export default async function InicioPage() {
  const supabase = await createClient()

  // Traer productos disponibles de la pescadería del usuario
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  return <TiendaCliente productos={productos || []} />
}