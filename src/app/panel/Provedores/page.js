import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { resolverTiendaPanel } from '../../../lib/panelTienda'
import PanelProveedores from './PanelProveedores'

export default async function ProveedoresPage() {
  const acceso = await resolverTiendaPanel()
  if (acceso.error) redirect('/inicio')

  const admin = createAdminClient()
  const pescaderiaId = acceso.pescaderiaId

  const { data: provs } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, modalidad, telefono')
    .in('modalidad', ['local_reparto', 'solo_reparto'])
    .eq('activa', true)
    .neq('id', pescaderiaId)
    .order('nombre')

  const { data: vinculos } = await admin
    .from('vinculos_mayoristas')
    .select('proveedor_id, estado, iniciado_por')
    .eq('local_id', pescaderiaId)

  const mapa = {}
  for (const v of vinculos || []) mapa[v.proveedor_id] = v

  const proveedores = (provs || []).map((p) => ({
    ...p,
    vinculo: mapa[p.id] || null,
  }))

  return <PanelProveedores proveedores={proveedores} />
}
