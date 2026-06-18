import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'
import SplashTienda from './SplashTienda'
import { retornoDisponible } from '../../../lib/fidelizacion'

// Metadata dinámica por tienda: título, descripción e ícono según rubro
export async function generateMetadata({ params }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: t } = await admin
    .from('pescaderias')
    .select('nombre, rubro')
    .eq('slug', slug)
    .maybeSingle()

  const carpeta = t?.rubro === 'quesería' ? 'queseria' : 'pescaderia'

  return {
    title: t?.nombre || 'BlueMarket',
    manifest: `/t/${slug}/manifest.json`,
    icons: {
      icon: `/icons/${carpeta}/icon-192.png`,
      apple: `/icons/${carpeta}/apple-touch-icon.png`,
    },
  }
}

export default async function TiendaPorSlug(props) {
  const params = await props.params
  const slug = params?.slug ?? params?.nxtPslug ?? Object.values(params)[0]
  const admin = createAdminClient()

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa, modalidad, direccion, telefono, rubro, emoji_rubro')
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
  let retorno = { disponible: 0, maxTier: false, nivel: null }
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

    if (cli?.id) {
      try {
        const r = await retornoDisponible(admin, pescaderia.id, cli.id)
        retorno = { disponible: r.disponible, maxTier: r.maxTier, nivel: r.nivel }
      } catch (e) { /* sin retorno */ }
    }
  }

  return (
    <>
      <SplashTienda rubro={pescaderia.rubro} />
      <TiendaCliente
        productos={productos || []}
        pescaderia={pescaderia}
        pescaderiaId={pescaderia.id}
        usuarioId={user?.id || null}
        ccHabilitada={ccHabilitada}
        soloDelivery={soloDelivery}
        retorno={retorno}
      />
    </>
  )
}
