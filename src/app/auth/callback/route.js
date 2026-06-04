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
      let destino = '/inicio' // consumidor por defecto
      let limpiarInvite = false

      if (user) {
        // Si llega con una invitación válida, registrar quién lo trajo y aprobar el acceso.
        const invite = request.cookies.get('bm_invite')?.value
        if (invite && invite !== user.id) {
          const admin = createAdminClient()
          await admin
            .from('usuarios')
            .update({ invitado_por: invite, acceso_aprobado: true })
            .eq('id', user.id)
          limpiarInvite = true
        }

        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (perfil) {
          const rutas = {
            consumidor: '/inicio',
            cliente: '/pescaderia',   // dueño de pescadería -> su panel
            repartidor: '/inicio',
            developer: '/dashboard',  // admin del SaaS -> panel developer
          }
          destino = rutas[perfil.rol] || '/inicio'
        }
      }

      const response = NextResponse.redirect(`${origin}${destino}`)
      if (limpiarInvite) response.cookies.delete('bm_invite')
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
