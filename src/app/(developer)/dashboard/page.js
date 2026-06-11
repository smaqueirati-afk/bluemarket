import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelDeveloper from './PanelDeveloper'

export default async function DashboardDeveloper() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'developer') redirect('/inicio')

  const admin = createAdminClient()

  const { data: pescaderias } = await admin
    .from('pescaderias')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: duenos } = await admin
    .from('usuarios')
    .select('id, nombre, email, pescaderia_id')
    .eq('rol', 'cliente')

  const duenoPorPescaderia = {}
  ;(duenos || []).forEach((d) => {
    if (d.pescaderia_id) {
      duenoPorPescaderia[d.pescaderia_id] = { id: d.id, nombre: d.nombre, email: d.email }
    }
  })

  const pescaderiasConDueno = (pescaderias || []).map((p) => ({
    ...p,
    dueno_nombre: duenoPorPescaderia[p.id]?.nombre || null,
    dueno_email: duenoPorPescaderia[p.id]?.email || null,
    dueno_auth_id: duenoPorPescaderia[p.id]?.id || null,
  }))

  const { data: catalogo } = await admin
    .from('catalogo_master')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  return <PanelDeveloper pescaderias={pescaderiasConDueno} catalogo={catalogo || []} usuarioId={user.id} />
}
