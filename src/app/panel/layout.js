import { cookies } from 'next/headers'
import { resolverTiendaPanel } from '../../lib/panelTienda'
import { createAdminClient } from '../../lib/supabase/admin'
import BannerModoDeveloper from './BannerModoDeveloper'

// Muestra la barra "Gestionando como developer · Volver al panel" en TODAS
// las pantallas del panel (principal y sub-rutas). Solo aparece si hay una
// sesión de developer activa (cookie bm_dev_tienda). Para el dueño normal
// no hace ninguna consulta extra.
export default async function PanelLayout({ children }) {
  let banner = null

  const ck = (await cookies()).get('bm_dev_tienda')?.value
  if (ck) {
    const ctx = await resolverTiendaPanel()
    if (!ctx.error && ctx.esDeveloper && ctx.pescaderiaId) {
      const admin = createAdminClient()
      const { data: t } = await admin
        .from('pescaderias')
        .select('nombre')
        .eq('id', ctx.pescaderiaId)
        .maybeSingle()
      banner = <BannerModoDeveloper nombreTienda={t?.nombre || 'tienda'} />
    }
  }

  return (
    <>
      {banner}
      {children}
    </>
  )
}
