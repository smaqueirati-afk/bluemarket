import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { email } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const emailLimpio = email.trim().toLowerCase()
    const codigo = generarCodigo()
    const expira = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Guardar el código en Supabase
    const admin = createAdminClient()
    const { error: errGuardar } = await admin
      .from('otp_codigos')
      .upsert({
        email: emailLimpio,
        codigo,
        expira_en: expira.toISOString(),
        usado: false,
      }, { onConflict: 'email' })

    if (errGuardar) {
      return NextResponse.json({ error: 'Error al generar el código' }, { status: 500 })
    }

    // Enviar el email via Resend
    const { error: errEmail } = await resend.emails.send({
      from: 'BlueMarket <onboarding@resend.dev>',
      to: emailLimpio,
      subject: `Tu código de acceso: ${codigo}`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #03174a; border-radius: 16px; color: white;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">🐟</span>
            <h1 style="color: #4db8ff; margin: 8px 0 4px; font-size: 24px;">BlueMarket</h1>
            <p style="color: rgba(255,255,255,0.5); margin: 0; font-size: 13px;">Tu pescadería digital</p>
          </div>

          <p style="color: rgba(255,255,255,0.7); font-size: 15px; margin-bottom: 24px;">
            Tu código de acceso es:
          </p>

          <div style="background: rgba(77,184,255,0.15); border: 1px solid rgba(77,184,255,0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4db8ff;">
              ${codigo}
            </span>
          </div>

          <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
            Válido por 10 minutos. Si no pediste este código, ignorá este mensaje.
          </p>
        </div>
      `,
    })

    if (errEmail) {
      return NextResponse.json({ error: 'Error al enviar el email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
