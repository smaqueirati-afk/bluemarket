import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import InicioClient from './InicioClient'

export default async function InicioPage() {
  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let slug = null

  // 1. Por el perfil del usuario (pescadería asignada)
  if (user) {
    const { data: perfil } = await admin
      .from('usuarios')
      .select('pescaderia_id')
      .eq('id', user.id)
      .maybeSingle()
    if (perfil?.pescaderia_id) {
      const { data: pesc } = await admin
        .from('pescaderias')
        .select('slug')
        .eq('id', perfil.pescaderia_id)
        .maybeSingle()
      if (pesc?.slug) slug = pesc.slug
    }
  }

  // 2. Fallback: última pescadería visitada por cookie
  if (!slug) {
    const ck = await cookies()
    slug = ck.get('bm_pescaderia_slug')?.value || null
  }

  if (slug) redirect(`/t/${slug}`)

  // 3. Sin slug: mostrar pantalla client-side que intenta leer localStorage
  return <InicioClient />
}
