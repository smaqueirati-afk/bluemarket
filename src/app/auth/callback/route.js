import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      let destino = '/inicio'
      let limpiarInvite = false
      let pescaderiaSlugCookie = request.cookies.get('bm_pescaderia_slug')?.value || null
      const returnToRaw = request.cookies.get('bm_return')?.value || null
      const returnTo = returnToRaw ? decodeURIComponent(returnToRaw) : null

      // Fallback: el slug también puede venir como query param (más confiable en mobile)
      const slugParam = searchParams.get('slug') || null
      if (slugParam && !returnTo) pescaderiaSlugCookie = slugParam

      if (user) {
        const invite = request.cookies.get('bm_invite')?.value
        const admin = createAdminClient()

        if (invite && invite !== user.id) {
          // Registrar quién invitó. Si viene con slug de pescadería, vincular al cliente.
          await admin
            .from('usuarios')
            .update({ invitado_por: invite, acceso_aprobado: true })
            .eq('id', user.id)
          limpiarInvite = true
        }

        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol, pescaderia_id')
          .eq('id', user.id)
          .single()

        if (perfil) {
          if (returnTo && returnTo.startsWith('/t/')) {
            // Venía comprando en una tienda por link: volver ahí después del login
            destino = returnTo
          } else if (perfil.rol === 'cliente' && perfil.pescaderia_id) {
            // Dueño de pescadería: va a su panel
            destino = '/pescaderia'
          } else if (perfil.rol === 'developer') {
            destino = '/dashboard'
          } else if (perfil.pescaderia_id) {
            // Ya tiene pescadería asignada: buscar el slug
            const { data: pesc } = await admin
              .from('pescaderias')
              .select('slug')
              .eq('id', perfil.pescaderia_id)
              .single()
            if (pesc?.slug) {
              destino = `/t/${pesc.slug}`
              pescaderiaSlugCookie = null
            }
          } else if (pescaderiaSlugCookie) {
            // Viene de una invitación con slug: asignar la pescadería al usuario
            const { data: pesc } = await admin
              .from('pescaderias')
              .select('id, slug')
              .eq('slug', pescaderiaSlugCookie)
              .single()
            if (pesc) {
              await admin
                .from('usuarios')
                .update({ pescaderia_id: pesc.id })
                .eq('id', user.id)
              destino = `/t/${pesc.slug}`
            }
          }
        }
      }

      const response = NextResponse.redirect(`${origin}${destino}`)
      if (limpiarInvite) response.cookies.delete('bm_invite')
      if (pescaderiaSlugCookie === null) response.cookies.delete('bm_pescaderia_slug')
      else if (pescaderiaSlugCookie) response.cookies.delete('bm_pescaderia_slug')
      if (returnTo) response.cookies.delete('bm_return')
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
