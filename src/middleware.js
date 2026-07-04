import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Dominio propio de un tenant: tienda.vittomare.com/ -> su tienda directo
  const host = request.headers.get('host') || ''
  if (host === 'tienda.vittomare.com' && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/t/vitto-mare', request.url))
  }
  // Dominio propio del dueño: panel.vittomare.com/ -> su panel de pescadería
  if (host === 'panel.vittomare.com' && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión si expiró
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}