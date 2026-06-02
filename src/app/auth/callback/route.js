import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      let destino = '/inicio' // consumidor por defecto

      if (user) {
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

      return NextResponse.redirect(`${origin}${destino}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
