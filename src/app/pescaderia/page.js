import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelPescaderia from './PanelPescaderia'

export default async function DashboardPescaderia() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id, nombre')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const admin = createAdminClient()

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('*')
    .eq('id', perfil.pescaderia_id)
    .single()

  const { data: pedidos } = await admin
    .from('pedidos')
    .select('*')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .order('created_at', { ascending: false })

  return (
    <PanelPescaderia
      pescaderia={pescaderia}
      pedidos={pedidos || []}
      nombreUsuario={perfil.nombre}
    />
  )
}
