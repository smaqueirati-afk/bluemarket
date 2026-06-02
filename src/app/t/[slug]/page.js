import { createAdminClient } from '../../../lib/supabase/admin'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'

export default async function TiendaPorSlug({ params }) {
  const { slug } = await params
  const admin = createAdminClient()

  // 1. Buscar la pescadería por su slug
  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa')
    .eq('slug', slug)
    .maybeSingle()

  // Si no existe o está inactiva, mostrar 404 amable
  if (!pescaderia || !pescaderia.activa) {
    notFound()
  }

  // 2. Traer los productos de ESA pescadería
  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderia.id)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  return (
    <TiendaCliente
      productos={productos || []}
      pescaderia={pescaderia}
    />
  )
}
