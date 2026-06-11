import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelClientes from './PanelClientes'

export default async function ClientesPage() {
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

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('nombre')
    .eq('id', perfil.pescaderia_id)
    .single()

  const { data: clientes } = await admin
    .from('clientes')
    .select('*')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .order('cc_saldo', { ascending: false })

  return (
    <PanelClientes
      clientes={clientes || []}
      nombrePescaderia={pescaderia?.nombre || 'Mi pescadería'}
    />
  )
}
