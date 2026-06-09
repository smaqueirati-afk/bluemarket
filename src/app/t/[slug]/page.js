import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'

export default async function TiendaPorSlug({ params }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa, modalidad, direccion')
    .eq('slug', slug)
    .maybeSingle()

  if (!pescaderia || !pescaderia.activa) {
    notFound()
  }

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderia.id)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  let ccHabilitada = false
  let soloDelivery = true
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: cli } = await admin
      .from('clientes')
      .select('id, cc_habilitada')
      .eq('pescaderia_id', pescaderia.id)
      .eq('usuario_id', user.id)
      .maybeSingle()

    ccHabilitada = !!cli?.cc_habilitada
    if (cli) soloDelivery = false
  }

  return (
    <TiendaCliente
      productos={productos || []}
      pescaderia={pescaderia}
      pescaderiaId={pescaderia.id}
      usuarioId={user?.id || null}
      ccHabilitada={ccHabilitada}
      soloDelivery={soloDelivery}
    />
  )
}
