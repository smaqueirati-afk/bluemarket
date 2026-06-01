import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sesión creada. Buscar el rol del usuario para redirigir al portal correcto.
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
            cliente: '/dashboard',
            repartidor: '/inicio',
            developer: '/dashboard',
          }
          destino = rutas[perfil.rol] || '/inicio'
        }
      }

      return NextResponse.redirect(`${origin}${destino}`)
    }
  }

  // Si algo falla, volver al login
  return NextResponse.redirect(`${origin}/login`)
}