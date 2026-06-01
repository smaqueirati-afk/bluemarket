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

  const burbujas = [
    { left: '18%', size: 6, delay: '0s', dur: '3.4s' },
    { left: '40%', size: 9, delay: '0.7s', dur: '4s' },
    { left: '70%', size: 5, delay: '1.1s', dur: '3s' },
    { left: '85%', size: 7, delay: '0.4s', dur: '3.6s' },
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-[420px] sm:max-h-[900px] sm:rounded-[40px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden">

        {/* Fondo océano con profundidad */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a3a7a_0%,#051e5c_45%,#03174a_100%)]" />

        {/* Luz superior (superficie del agua) */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-2xl"
             style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.25), transparent 70%)' }} />

        {/* Burbujas */}
        <div className="absolute inset-0 pointer-events-none">
          {burbujas.map((b, i) => (
            <span key={i}
              className="absolute bottom-24 rounded-full"
              style={{
                left: b.left, width: b.size, height: b.size,
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(125,211,252,0.2))',
                animation: `bmRise ${b.dur} ease-in ${b.delay} infinite`,
              }} />
          ))}
        </div>

        {/* Contenido */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between px-7 pt-[72px] pb-10">

          <div className="flex flex-col items-center gap-3.5" style={{ animation: 'bmFadeUp 0.7s ease both' }}>
            <div className="w-20 h-20 rounded-full bg-[#4db8ff]/12 border-[1.5px] border-[#4db8ff]/50 flex items-center justify-center text-[38px]"
                 style={{ boxShadow: '0 0 30px rgba(77,184,255,0.25)', animation: 'bmFloat 3.5s ease-in-out infinite' }}>
              🐟
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                <span className="text-[#4db8ff]">Blue</span>Market
              </h1>
              <p className="text-xs tracking-[1.8px] uppercase text-[#cde8ff]/70 mt-1.5">
                Tu pescadería digital
              </p>
            </div>
          </div>

          <div className="w-full bg-white/[0.07] border border-white/12 rounded-[20px] p-7 backdrop-blur-md"
               style={{ animation: 'bmFadeUp 0.9s ease both' }}>
            <h2 className="text-lg font-semibold text-white mb-1.5">Bienvenido</h2>
            <p className="text-[13px] text-white/55 mb-6 leading-relaxed">
              Ingresá con tu cuenta Google para continuar. Sin contraseñas, sin complicaciones.
            </p>
            <button
              onClick={loginConGoogle}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-none rounded-xl text-[15px] font-semibold text-[#1a1a2e] cursor-pointer transition-all hover:shadow-[0_6px_24px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-70"
            >
              <span className="font-extrabold text-lg text-[#4285F4]">G</span>
              {cargando ? 'Conectando...' : 'Continuar con Google'}
            </button>
          </div>

          <p className="text-[11px] text-white/30 text-center leading-relaxed">
            Al continuar aceptás los Términos de uso<br />y la Política de privacidad
          </p>

        </div>
      </div>

      <style jsx>{`
        @keyframes bmRise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          15% { opacity: 0.6; }
          100% { transform: translateY(-260px) scale(1.3); opacity: 0; }
        }
        @keyframes bmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
