import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import TiendaCliente from './TiendaCliente'
import SplashTienda from './SplashTienda'
import { retornoDisponible } from '../../../lib/fidelizacion'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: t } = await admin
    .from('pescaderias')
    .select('nombre, rubro, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  const carpeta = t?.rubro === 'quesería' ? 'queseria' : t?.rubro === 'pescadería' ? 'pescaderia' : 'bluemarket'

  return {
    title: t?.nombre || 'BlueMarket',
    manifest: `/t/${slug}/manifest.json`,
    icons: {
      icon: t?.logo_url || `/icons/${carpeta}/icon-192.png`,
      apple: t?.logo_url || `/icons/${carpeta}/apple-touch-icon.png`,
    },
  }
}

export default async function TiendaPorSlug(props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const slug = params?.slug ?? Object.values(params)[0]
  const preview = searchParams?.preview === '1'
  const admin = createAdminClient()

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, activa, modalidad, direccion, telefono, rubro, emoji_rubro, envio_modo, envio_gratis_desde, logo_url, mp_activo')
    .eq('slug', slug)
    .maybeSingle()

  if (!pescaderia) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let esDeveloper = false
  if (user) {
    const { data: perfilDev } = await admin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    esDeveloper = perfilDev?.rol === 'developer'
  }

  if (!pescaderia.activa && !(preview && esDeveloper)) notFound()

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderia.id)
    .eq('disponible', true)
    .order('destacado', { ascending: false })

  let ccHabilitada = false
  let retorno = { disponible: 0, maxTier: false, nivel: null }
  const soloDelivery = pescaderia.modalidad === 'solo_reparto'

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
      } catch (e) {}
    }
  }

  return (
    <>
      <SplashTienda rubro={pescaderia.rubro} slug={pescaderia.slug} logoUrl={pescaderia.logo_url} />
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
