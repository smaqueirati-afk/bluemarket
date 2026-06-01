'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [mostrar, setMostrar] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [instalada, setInstalada] = useState(false)

  useEffect(() => {
    // ¿Ya está instalada y abierta como app?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
    if (standalone) { setInstalada(true); return }

    // ¿Es iPhone/iPad? (Safari no dispara el evento automático)
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    setEsIOS(ios)

    // Android/Chrome: capturar el evento de instalación
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setMostrar(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // En iOS mostramos el cartel con instrucciones manuales
    if (ios) setMostrar(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function instalar() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setMostrar(false)
    setDeferredPrompt(null)
  }

  if (instalada || !mostrar) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-[400px] mx-auto"
         style={{ animation: 'bmSlideUp 0.5s ease both' }}>
      <div className="bg-[#0a3a7a]/95 border border-[#4db8ff]/40 rounded-2xl p-4 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#4db8ff]/15 border border-[#4db8ff]/40 flex items-center justify-center text-2xl shrink-0">
            🐟
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm">Instalá BlueMarket</div>
            {esIOS ? (
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                Tocá <span className="text-[#4db8ff]">Compartir</span> ⬆️ y después
                <span className="text-[#4db8ff]"> "Agregar a inicio"</span>
              </div>
            ) : (
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                Accedé más rápido desde tu pantalla de inicio
              </div>
            )}
          </div>
          <button onClick={() => setMostrar(false)}
            className="text-white/40 text-xl leading-none shrink-0 px-1">×</button>
        </div>

        {!esIOS && (
          <button onClick={instalar}
            className="w-full mt-3 bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform">
            Instalar app
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes bmSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
