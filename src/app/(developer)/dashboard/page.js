import { createClient } from '../../../lib/supabase/server'
import PanelDeveloper from './PanelDeveloper'

export default async function DashboardDeveloper() {
  const supabase = await createClient()

  // Traer todas las pescaderías (el RLS deja que el developer las vea todas)
  const { data: pescaderias } = await supabase
    .from('pescaderias')
    .select('*')
    .order('created_at', { ascending: false })

  return <PanelDeveloper pescaderias={pescaderias || []} />
}