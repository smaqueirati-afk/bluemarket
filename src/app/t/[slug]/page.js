import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'

export default async function TiendaPorSlug({ params }) {
  const { slug } = await params
  const admin = createAdminClient()

  // 1. Buscar la pescadería por su slug
  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa, modalidad, direccion')
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

  // 3. Si hay un usuario logueado, ver si tiene cuenta corriente habilitada en esta pescadería
  let ccHabilitada = false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: cli } = await admin
      .from('clientes')
      .select('cc_habilitada')
      .eq('pescaderia_id', pescaderia.id)
      .eq('usuario_id', user.id)
      .maybeSingle()
    ccHabilitada = !!cli?.cc_habilitada
  }

  return (
    <TiendaCliente
      productos={productos || []}
      pescaderia={pescaderia}
      ccHabilitada={ccHabilitada}
    />
  )
}
