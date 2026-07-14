import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { resolverTiendaPanel } from '../../../lib/panelTienda'
import PanelClientes from './PanelClientes'

export default async function ClientesPage() {
  const acceso = await resolverTiendaPanel()
  if (acceso.error) redirect('/inicio')

  const admin = createAdminClient()
  const pescaderiaId = acceso.pescaderiaId
  const user = { id: acceso.userId }

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
