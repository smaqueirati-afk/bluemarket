import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

export default async function InicioPage() {
  // La compra es SOLO por el link de la pescadería.
  // Este portal redirige al consumidor a la tienda de SU pescadería.
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

  // 2. Fallback: última pescadería visitada por link (cookie)
  if (!slug) {
    const ck = await cookies()
    slug = ck.get('bm_pescaderia_slug')?.value || null
  }

  // 3. Si sabemos a qué pescadería pertenece, lo mandamos a su tienda
  if (slug) redirect(`/t/${slug}`)

  // 4. Sin pescadería asociada: mensaje claro
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">
      <div className="text-5xl mb-4">🐟</div>
      <h1 className="text-xl font-extrabold text-white mb-2">Todavía no estás vinculado a una pescadería</h1>
      <p className="text-white/55 text-sm leading-relaxed max-w-xs">
        Para comprar, abrí el link que te compartió tu pescadería.
      </p>
    </div>
  )
}
