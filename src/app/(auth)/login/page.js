'use client'

import { useState, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'

export default function LoginPage() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [modo, setModo] = useState(null)       // null | 'otp'
  const [email, setEmail] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const inputsRef = useRef([])

  async function loginConGoogle() {
    setCargando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError('Error: ' + error.message); setCargando(false) }
  }

  async function enviarOTP() {
    if (!email.trim()) { setError('Ingresá tu email'); return }
    setCargando(true); setError(null)
    const res = await fetch('/api/otp/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setCargando(false) }
    else { setCodigoEnviado(true); setCargando(false) }
  }

  async function verificarOTP() {
    const token = codigo.join('')
    if (token.length < 6) { setError('Ingresá los 6 dígitos'); return }
    setCargando(true); setError(null)
    const res = await fetch('/api/otp/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), codigo: token }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setCargando(false); return }

    const supabase = createClient()
    const { error: errSession } = await supabase.auth.verifyOtp({
      token_hash: data.token,
      type: 'magiclink',
    })
    if (errSession) { setError('Error al iniciar sesión, intentá de nuevo'); setCargando(false) }
    else { window.location.href = '/auth/callback' }
  }

  function manejarDigito(i, val) {
    if (!/^\d?$/.test(val)) return
    const nuevo = [...codigo]
    nuevo[i] = val
    setCodigo(nuevo)
    if (val && i < 5) inputsRef.current[i + 1]?.focus()
  }

  function manejarBackspace(i, e) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  function manejarPaste(e) {
    const texto = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (texto.length === 6) {
      setCodigo(texto.split(''))
      inputsRef.current[5]?.focus()
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

        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a3a7a_0%,#051e5c_45%,#03174a_100%)]" />
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-2xl"
             style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.25), transparent 70%)' }} />

        <div className="absolute inset-0 pointer-events-none">
          {burbujas.map((b, i) => (
            <span key={i} className="absolute bottom-24 rounded-full"
              style={{
                left: b.left, width: b.size, height: b.size,
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(125,211,252,0.2))',
                animation: `bmRise ${b.dur} ease-in ${b.delay} infinite`,
              }} />
          ))}
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-between px-7 pt-[72px] pb-10">

          <div className="flex flex-col items-center gap-3.5" style={{ animation: 'bmFadeUp 0.7s ease both' }}>
            <div className="w-20 h-20 rounded-full bg-[#4db8ff]/12 border-[1.5px] border-[#4db8ff]/50 flex items-center justify-center text-[38px]"
                 style={{ boxShadow: '0 0 30px rgba(77,184,255,0.25)', animation: 'bmFloat 3.5s ease-in-out infinite' }}>
              <svg viewBox="0 0 64 64" width="42" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Edificio del local */}
                <rect x="10" y="28" width="44" height="28" rx="3" fill="#4db8ff" fillOpacity="0.25" stroke="#4db8ff" strokeWidth="2"/>
                {/* Techo / marquesina */}
                <rect x="6" y="22" width="52" height="8" rx="2" fill="#4db8ff" fillOpacity="0.5" stroke="#4db8ff" strokeWidth="1.5"/>
                {/* Cartel del local */}
                <rect x="14" y="26" width="36" height="6" rx="1.5" fill="#4db8ff" fillOpacity="0.7"/>
                {/* Puerta */}
                <rect x="27" y="42" width="10" height="14" rx="2" fill="#4db8ff" fillOpacity="0.6" stroke="#4db8ff" strokeWidth="1.5"/>
                {/* Ventana izq */}
                <rect x="13" y="34" width="10" height="8" rx="1.5" fill="#4db8ff" fillOpacity="0.4" stroke="#4db8ff" strokeWidth="1.5"/>
                {/* Ventana der */}
                <rect x="41" y="34" width="10" height="8" rx="1.5" fill="#4db8ff" fillOpacity="0.4" stroke="#4db8ff" strokeWidth="1.5"/>
                {/* Punto wifi / digital arriba */}
                <circle cx="32" cy="10" r="2.5" fill="#4db8ff"/>
                <path d="M24 14.5 Q32 8 40 14.5" stroke="#4db8ff" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <path d="M20 18.5 Q32 10 44 18.5" stroke="#4db8ff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.5"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                <span className="text-[#4db8ff]">Blue</span>Market
              </h1>
              <p className="text-xs tracking-[1.8px] uppercase text-[#cde8ff]/70 mt-1.5">
                Tu comercio digital
              </p>
            </div>
          </div>

          <div className="w-full bg-white/[0.07] border border-white/12 rounded-[20px] p-7 backdrop-blur-md"
               style={{ animation: 'bmFadeUp 0.9s ease both' }}>

            {/* Pantalla principal */}
            {!modo && (
              <>
                <h2 className="text-lg font-semibold text-white mb-1.5">Bienvenido</h2>
                <p className="text-[13px] text-white/55 mb-5 leading-relaxed">
                  Elegí cómo querés ingresar.
                </p>
                {error && <p className="text-[#e74c3c] text-xs mb-3">{error}</p>}
                <div className="space-y-3">
                  <button onClick={loginConGoogle} disabled={cargando}
                    className="w-full flex items-center justify-center gap-3 py-3.5 bg-white rounded-xl text-[15px] font-semibold text-[#1a1a2e] transition-all hover:shadow-[0_6px_24px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-70">
                    <span className="font-extrabold text-lg text-[#4285F4]">G</span>
                    {cargando ? 'Conectando...' : 'Continuar con Google'}
                  </button>
                </div>
              </>
            )}

            {/* OTP: ingresar email */}
            {modo === 'otp' && !codigoEnviado && (
              <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                <button onClick={() => { setModo(null); setError(null) }}
                  className="text-[#4db8ff] text-xs mb-4 flex items-center gap-1">← Volver</button>
                <h2 className="text-lg font-semibold text-white mb-1">Ingresá con email</h2>
                <p className="text-[13px] text-white/55 mb-5 leading-relaxed">
                  Te mandamos un código de 6 dígitos para entrar.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarOTP()}
                  placeholder="tu@email.com"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff] mb-3"
                />
                {error && <p className="text-[#e74c3c] text-xs mb-3">{error}</p>}
                <button onClick={enviarOTP} disabled={cargando}
                  className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-60">
                  {cargando ? 'Enviando...' : 'Enviar código'}
                </button>
              </div>
            )}

            {/* OTP: ingresar código */}
            {modo === 'otp' && codigoEnviado && (
              <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                <div className="text-4xl mb-3 text-center">📱</div>
                <h2 className="text-lg font-bold text-white text-center mb-1">Revisá tu email</h2>
                <p className="text-[13px] text-white/55 mb-6 leading-relaxed text-center">
                  Mandamos un código a <strong className="text-white">{email}</strong>.<br/>
                  Ingresalo acá para entrar.
                </p>

                <div className="flex gap-2 justify-center mb-4" onPaste={manejarPaste}>
                  {codigo.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputsRef.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => manejarDigito(i, e.target.value)}
                      onKeyDown={(e) => manejarBackspace(i, e)}
                      className="w-11 h-14 text-center text-2xl font-extrabold text-white bg-white/[0.08] border border-white/20 rounded-xl outline-none focus:border-[#4db8ff] focus:bg-[#4db8ff]/10 transition-all"
                    />
                  ))}
                </div>

                {error && <p className="text-[#e74c3c] text-xs mb-3 text-center">{error}</p>}

                <button onClick={verificarOTP} disabled={cargando || codigo.join('').length < 6}
                  className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-60 mb-3">
                  {cargando ? 'Verificando...' : 'Ingresar'}
                </button>
                <button onClick={() => { setCodigoEnviado(false); setCodigo(['','','','','','']); setError(null) }}
                  className="w-full text-white/40 text-sm text-center">
                  No llegó el código — reenviar
                </button>
              </div>
            )}

          </div>

          <p className="text-[11px] text-white/30 text-center leading-relaxed">
            Al continuar aceptás los Términos de uso<br />y la Política de privacidad
          </p>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bmRise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          15% { opacity: 0.6; }
          100% { transform: translateY(-260px) scale(1.3); opacity: 0; }
        }
        @keyframes bmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  )
}
