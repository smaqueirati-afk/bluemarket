import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '../../../lib/supabase/admin'
import RubroSelector from './RubroSelector'

export default async function InvitacionPage({ params }) {
  const { codigo } = await params

  // Nombre de quien invita (solo para saludar; si falla, sigue igual)
  let invitador = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('usuarios')
      .select('nombre')
      .eq('id', codigo)
      .single()
    invitador = data?.nombre || null
  } catch (e) {
    invitador = null
  }

  // Guarda los datos del alta + el código en una cookie y manda al login.
  // El callback de Google va a leer esta cookie y crear la pescadería.
  async function continuar(formData) {
    'use server'
    const nombre = formData.get('nombre')?.toString().trim()
    const telefono = formData.get('telefono')?.toString().trim()
    const modalidad = formData.get('modalidad')?.toString() || 'local_reparto'
    const rubro = formData.get('rubro')?.toString().trim() || 'Comercio'
    const emojiRubro = formData.get('emoji_rubro')?.toString().trim() || '🛍️'

    if (nombre) {
      const ck = await cookies()
      ck.set(
        'bm_alta',
        encodeURIComponent(JSON.stringify({ nombre, telefono, modalidad, rubro, emojiRubro, invitadoPor: codigo })),
        { httpOnly: true, maxAge: 60 * 30, path: '/', sameSite: 'lax' }
      )
    }
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="w-full max-w-sm bg-white/[0.06] border border-white/10 rounded-3xl p-7 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sumá tu negocio</h1>
          {invitador ? (
            <p className="text-white/55 text-sm mt-2">
              Te invitó <span className="text-[#4db8ff] font-semibold">{invitador}</span> a BlueMarket. Completá los datos y entrá con Google para dar de alta tu tienda online.
            </p>
          ) : (
            <p className="text-white/55 text-sm mt-2">
              Completá los datos de tu negocio y entrá con Google para dar de alta tu tienda online.
            </p>
          )}
        </div>

        <form action={continuar} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/45 font-bold mb-1.5">
              Nombre del negocio
            </label>
            <input
              name="nombre"
              required
              placeholder="Quesería La Comarca"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/45 font-bold mb-1.5">
              WhatsApp
            </label>
            <input
              name="telefono"
              type="tel"
              inputMode="tel"
              placeholder="+54 11 1234 5678"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
            />
          </div>

          <RubroSelector />

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/45 font-bold mb-2">
              ¿Cómo trabajás?
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer">
                <input type="radio" name="modalidad" value="solo_local" className="mt-0.5 accent-[#4db8ff]" />
                <div>
                  <div className="text-sm text-white font-medium">Solo local</div>
                  <div className="text-[11px] text-white/40">El cliente retira en el local</div>
                </div>
              </label>
              <label className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer">
                <input type="radio" name="modalidad" value="local_reparto" defaultChecked className="mt-0.5 accent-[#4db8ff]" />
                <div>
                  <div className="text-sm text-white font-medium">Local y reparto</div>
                  <div className="text-[11px] text-white/40">Retiro en el local o envío a domicilio</div>
                </div>
              </label>
              <label className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer">
                <input type="radio" name="modalidad" value="solo_reparto" className="mt-0.5 accent-[#4db8ff]" />
                <div>
                  <div className="text-sm text-white font-medium">Solo reparto</div>
                  <div className="text-[11px] text-white/40">Solo envío a domicilio</div>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl active:scale-[0.98] transition-transform mt-1"
          >
            Continuar con Google
          </button>
        </form>

        <p className="text-[11px] text-white/30 mt-4 text-center">El link de tu tienda online se genera automáticamente.</p>
      </div>
    </div>
  )
}
