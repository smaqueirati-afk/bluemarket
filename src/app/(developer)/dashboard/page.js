import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import PanelDeveloper from './PanelDeveloper'

export default async function DashboardDeveloper() {
  const supabase = await createClient()

  // Traer todas las pescaderías
  const { data: pescaderias } = await supabase
    .from('pescaderias')
    .select('*')
    .order('created_at', { ascending: false })

  // Traer los dueños (usuarios con rol cliente) para mostrarlos en cada pescadería
  const admin = createAdminClient()
  const { data: duenos } = await admin
    .from('usuarios')
    .select('email, pescaderia_id')
    .eq('rol', 'cliente')

  // Armar un mapa: pescaderia_id -> email del dueño
  const duenoPorPescaderia = {}
  ;(duenos || []).forEach((d) => {
    if (d.pescaderia_id) duenoPorPescaderia[d.pescaderia_id] = d.email
  })

  // Agregar el email del dueño a cada pescadería
  const pescaderiasConDueno = (pescaderias || []).map((p) => ({
    ...p,
    dueno_email: duenoPorPescaderia[p.id] || null,
  }))

  return <PanelDeveloper pescaderias={pescaderiasConDueno} />
}
