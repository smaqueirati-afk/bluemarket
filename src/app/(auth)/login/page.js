'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase/client'

export default function LoginPage() {
  const [cargando, setCargando] = useState(false)

  async function loginConGoogle() {
    setCargando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      alert('Error: ' + error.message)
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-[390px] max-h-[844px] overflow-hidden bg-gradient-to-b from-[#051e5c] to-[#03174a]">
        <div className="h-full flex flex-col items-center justify-between px-7 pt-[70px] pb-10">

          <div className="flex flex-col items-center gap-3.5">
            <div className="w-20 h-20 rounded-full bg-[#4db8ff]/10 border-[1.5px] border-[#4db8ff]/50 flex items-center justify-center text-[38px]">
              🐟
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">
                <span className="text-[#4db8ff]">Blue</span>Market
              </h1>
              <p className="text-xs tracking-widest uppercase text-white/50 mt-1.5">
                Tu pescadería digital
              </p>
            </div>
          </div>

          <div className="w-full bg-white/[0.07] border border-white/10 rounded-[20px] p-7">
            <h2 className="text-lg font-semibold text-white mb-1.5">Bienvenido</h2>
            <p className="text-[13px] text-white/50 mb-6 leading-relaxed">
              Ingresá con tu cuenta Google para continuar. Sin contraseñas, sin complicaciones.
            </p>
            <button
              onClick={loginConGoogle}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-none rounded-xl text-[15px] font-semibold text-[#1a1a2e] cursor-pointer disabled:opacity-70"
            >
              <span className="font-extrabold text-lg text-[#4285F4]">G</span>
              {cargando ? 'Conectando...' : 'Continuar con Google'}
            </button>
          </div>

          <p className="text-[11px] text-white/25 text-center leading-relaxed">
            Al continuar aceptás los Términos de uso<br />y la Política de privacidad
          </p>

        </div>
      </div>
    </div>
  )
}