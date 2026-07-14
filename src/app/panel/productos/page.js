import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { resolverTiendaPanel } from '../../../lib/panelTienda'
import GestionProductos from './GestionProductos'

export default async function ProductosPage() {
  const acceso = await resolverTiendaPanel()
  if (acceso.error) redirect('/inicio')

  const admin = createAdminClient()
  const pescaderiaId = acceso.pescaderiaId

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('nombre, rubro, emoji_rubro')
    .eq('id', pescaderiaId)
    .single()

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .order('created_at', { ascending: false })

  const { data: categorias } = await admin
    .from('categorias_producto')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .order('orden', { ascending: true })

  return (
    <GestionProductos
      productos={productos || []}
      categorias={categorias || []}
      nombrePescaderia={pescaderia?.nombre || 'Mi tienda'}
      rubroInicial={pescaderia?.rubro || null}
    />
  )
}
