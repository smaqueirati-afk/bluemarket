import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import PanelDeveloper from './PanelDeveloper'

export default async function DashboardDeveloper() {
  const supabase = await createClient()

  const { data: pescaderias } = await supabase
    .from('pescaderias')
    .select('*')
    .order('created_at', { ascending: false })

  // Traer los dueños (rol cliente) con id, nombre y email
  const admin = createAdminClient()
  const { data: duenos } = await admin
    .from('usuarios')
    .select('id, nombre, email, pescaderia_id')
    .eq('rol', 'cliente')

  // Mapa: pescaderia_id -> { id, nombre, email }
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

  return <PanelDeveloper pescaderias={pescaderiasConDueno} />
}
