import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import PanelFidelizacion from './PanelFidelizacion'

export default async function FidelizacionPage() {
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
  const { data: config } = await admin
    .from('fidelizacion_config')
    .select('*')
    .eq('pescaderia_id', perfil.pescaderia_id)
    .maybeSingle()

  return <PanelFidelizacion config={config} />
}
