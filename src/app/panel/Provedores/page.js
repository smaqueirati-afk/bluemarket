import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import PanelProveedores from './PanelProveedores'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  let pescaderiaId = perfil?.pescaderia_id

  if (perfil?.rol === 'developer') {
    const ck = (await cookies()).get('bm_dev_tienda')?.value
    if (!ck) redirect('/dashboard')
    pescaderiaId = ck
  } else if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

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
