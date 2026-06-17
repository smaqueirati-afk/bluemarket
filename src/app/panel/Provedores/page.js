import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
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

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const admin = createAdminClient()

  // Proveedores = pescaderías con reparto, activas, distintas de la mía
  const { data: provs } = await admin
    .from('pescaderias')
    .select('id, nombre, slug, modalidad, telefono')
    .in('modalidad', ['local_reparto', 'solo_reparto'])
    .eq('activa', true)
    .neq('id', perfil.pescaderia_id)
    .order('nombre')

  // Vínculos existentes de mi local
  const { data: vinculos } = await admin
    .from('vinculos_mayoristas')
    .select('proveedor_id, estado, iniciado_por')
    .eq('local_id', perfil.pescaderia_id)

  const mapa = {}
  for (const v of vinculos || []) mapa[v.proveedor_id] = v

  const proveedores = (provs || []).map((p) => ({
    ...p,
    vinculo: mapa[p.id] || null,
  }))

  return <PanelProveedores proveedores={proveedores} />
}
