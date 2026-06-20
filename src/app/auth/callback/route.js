import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

// Cuentas que SIEMPRE son developer (nunca pueden ser dueñas de una pescadería).
// Agregá acá los mails que quieras blindar como developer.
const DEVELOPER_EMAILS = [
  'smaqueira.ti@gmail.com',
]

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

        // ── Cuentas developer blindadas ──
        // En cada login: si el mail está en la lista, se fuerza rol developer
        // y se limpia cualquier pescadería. Nunca puede quedar como dueña.
        if (user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())) {
          await admin.from('usuarios').upsert({
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.full_name || user.email.split('@')[0],
            rol: 'developer',
            pescaderia_id: null,
          }, { onConflict: 'id' })

          const response = NextResponse.redirect(`${origin}/dashboard`)
          response.cookies.delete('bm_alta')
          return response
        }

        // ── Alta de pescadería por invitación ──
        // Si viene del formulario de /invitacion, crear la pescadería y
        // dejar al usuario logueado como dueño.
        const altaRaw = request.cookies.get('bm_alta')?.value
        if (altaRaw) {
          try {
            const alta = JSON.parse(decodeURIComponent(altaRaw))
            if (alta?.nombre) {
              const base = slugify(alta.nombre) || 'pescaderia'
              let slug = base
              for (let i = 2; i < 50; i++) {
                const { data: existe } = await admin
                  .from('pescaderias')
                  .select('id')
                  .eq('slug', slug)
                  .maybeSingle()
                if (!existe) break
                slug = `${base}-${i}`
              }

              const { data: nueva, error: errPesc } = await admin
                .from('pescaderias')
                .insert({
                  nombre: alta.nombre,
                  slug,
                  telefono: alta.telefono || null,
                  modalidad: alta.modalidad || 'local_reparto',
                  rubro: alta.rubro || 'Comercio',
                  emoji_rubro: alta.emojiRubro || '🛍️',
                  plan: 'trial',
                  activa: true,
                })
                .select('id')
                .single()

              if (!errPesc && nueva) {
                // Hacer dueño al usuario logueado (upsert por si es su primer login)
                await admin.from('usuarios').upsert({
                  id: user.id,
                  email: user.email,
                  nombre: user.user_metadata?.full_name || user.email.split('@')[0],
                  rol: 'cliente',
                  pescaderia_id: nueva.id,
                  invitado_por: alta.invitadoPor || null,
                }, { onConflict: 'id' })

                const response = NextResponse.redirect(`${origin}/panel`)
                response.cookies.delete('bm_alta')
                return response
              }
            }
          } catch (e) {
            // Si algo falla, seguimos con el flujo normal de login
          }
        }

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
            // Dueño de tienda: va a su panel
            destino = '/panel'
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
