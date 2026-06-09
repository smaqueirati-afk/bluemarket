import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request) {
  try {
    const { email, codigo } = await request.json()
    if (!email || !codigo) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const emailLimpio = email.trim().toLowerCase()
    const admin = createAdminClient()

    // Buscar el código
    const { data: otp, error: errBuscar } = await admin
      .from('otp_codigos')
      .select('codigo, expira_en, usado')
      .eq('email', emailLimpio)
      .maybeSingle()

    if (errBuscar || !otp) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 400 })
    }

    if (otp.usado) {
      return NextResponse.json({ error: 'Este código ya fue usado' }, { status: 400 })
    }

    if (new Date(otp.expira_en) < new Date()) {
      return NextResponse.json({ error: 'El código venció, pedí uno nuevo' }, { status: 400 })
    }

    if (otp.codigo !== String(codigo).trim()) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
    }

    // Marcar como usado
    await admin
      .from('otp_codigos')
      .update({ usado: true })
      .eq('email', emailLimpio)

    // Crear o buscar el usuario en auth.users via admin
    const { data: { users } } = await admin.auth.admin.listUsers()
    let authUser = users.find((u) => u.email?.toLowerCase() === emailLimpio)

    if (!authUser) {
      // Crear el usuario
      const { data: nuevoUser, error: errCreate } = await admin.auth.admin.createUser({
        email: emailLimpio,
        email_confirm: true,
      })
      if (errCreate) {
        return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
      }
      authUser = nuevoUser.user
    }

    // Generar un magic link para que el browser pueda crear la sesión
    const { data: linkData, error: errLink } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLimpio,
    })

    if (errLink || !linkData) {
      return NextResponse.json({ error: 'Error al crear la sesión' }, { status: 500 })
    }

    // El link tiene la forma: .../auth/v1/verify?token=xxx&type=magiclink&redirect_to=xxx
    // Extraemos el token para que el frontend lo intercambie
    const url = new URL(linkData.properties.action_link)
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')

    return NextResponse.json({ ok: true, token, type })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
