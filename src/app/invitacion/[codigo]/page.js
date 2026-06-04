import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '../../../lib/supabase/admin'

export default async function InvitacionPage({ params }) {
  const { codigo } = await params

  // Buscar el nombre de quien invita (solo para saludar; si falla, sigue igual)
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

  // Guarda el código en una cookie y manda al login de siempre.
  // El callback de Google va a leer esta cookie al volver.
  async function continuar() {
    'use server'
    const ck = await cookies()
    ck.set('bm_invite', codigo, {
      httpOnly: true,
      maxAge: 60 * 30, // 30 minutos
      path: '/',
      sameSite: 'lax',
    })
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="w-full max-w-sm bg-white/[0.06] border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
        <div className="text-5xl mb-4">🐟</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Te invitaron a BlueMarket</h1>
        {invitador ? (
          <p className="text-white/55 text-sm mt-2">
            Te recomendó <span className="text-[#4db8ff] font-semibold">{invitador}</span>. Entrá para empezar a comprar.
          </p>
        ) : (
          <p className="text-white/55 text-sm mt-2">
            Entrá con tu cuenta de Google para empezar a comprar.
          </p>
        )}
        <form action={continuar} className="mt-7">
          <button
            type="submit"
            className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl active:scale-[0.98] transition-transform">
            Entrar con Google
          </button>
        </form>
        <p className="text-[11px] text-white/30 mt-4">BlueMarket es una red por invitación.</p>
      </div>
    </div>
  )
}
