import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'

export default async function TiendaPorSlug(props) {
  const params = await props.params
  const slug = params?.slug ?? params?.nxtPslug ?? Object.values(params)[0]
  const admin = createAdminClient()

  console.log('SLUG:', slug)
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30))
  console.log('SERVICE:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 15))

  const { data: pescaderia, error } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa, modalidad, direccion, telefono, email')
    .eq('slug', slug)
    .maybeSingle()
    
  console.log('PESCADERIA:', JSON.stringify(pescaderia))
  console.log('ERROR:', JSON.stringify(error))

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
  const soloDelivery = pescaderia.modalidad === 'solo_reparto'
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
