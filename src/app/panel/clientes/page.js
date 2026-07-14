import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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

  const admin = createAdminClient()
  let pescaderiaId = perfil?.pescaderia_id

  if (perfil?.rol === 'developer') {
    const ck = (await cookies()).get('bm_dev_tienda')?.value
    if (!ck) redirect('/dashboard')
    pescaderiaId = ck
  } else if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('nombre')
    .eq('id', pescaderiaId)
    .single()

  // Excluir colaboradores de la lista de clientes
  const { data: miembros } = await admin
    .from('tienda_usuarios')
    .select('usuario_id')
    .eq('pescaderia_id', pescaderiaId)

  const idsColaboradores = (miembros || []).map((m) => m.usuario_id)

  let query = admin
    .from('clientes')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .neq('usuario_id', user.id)
    .order('cc_saldo', { ascending: false })

  if (idsColaboradores.length > 0) {
    query = query.not('usuario_id', 'in', `(${idsColaboradores.join(',')})`)
  }

  const { data: clientes } = await query

  return (
    <PanelClientes
      clientes={clientes || []}
      nombrePescaderia={pescaderia?.nombre || 'Mi tienda'}
    />
  )
}
