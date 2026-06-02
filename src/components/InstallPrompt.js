'use client'

import { useState, useEffect } from 'react'

// URL pública de BlueMarket (para copiar y abrir en Safari)
const APP_URL = 'https://bluemarket-two.vercel.app'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [mostrar, setMostrar] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [esIpad, setEsIpad] = useState(false)
  const [esSafari, setEsSafari] = useState(true)
  const [instalada, setInstalada] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    // ¿Ya está instalada y abierta como app?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
    if (standalone) { setInstalada(true); return }

    const ua = window.navigator.userAgent.toLowerCase()

    // Detección iOS / iPad. Ojo: iPadOS 13+ se hace pasar por Mac de escritorio
    // (el UA dice "Macintosh"), así que el iPad se detecta como "Mac con pantalla táctil".
    const ipad = /ipad/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const iphone = /iphone|ipod/.test(ua)
    const ios = iphone || ipad
    setEsIpad(ipad)
    setEsIOS(ios)

    // En iOS, "Agregar a inicio" SOLO funciona en Safari.
    // Detectamos Safari descartando los navegadores embebidos (Chrome, Firefox, etc.).
    const safari = /safari/.test(ua) && !/crios|fxios|opios|edgios|chrome/.test(ua)
    setEsSafari(safari)

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

  // Copiar el link para abrirlo en Safari (con fallback para navegadores viejos)
  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopiado(true)
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = APP_URL
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy'); setCopiado(true) } catch (err) {}
      document.body.removeChild(ta)
    }
    setTimeout(() => setCopiado(false), 2500)
  }

  if (instalada || !mostrar) return null

  const disp = esIpad ? 'iPad' : 'iPhone'

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

            {!esIOS && (
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                Accedé más rápido desde tu pantalla de inicio
              </div>
            )}

            {esIOS && esSafari && (
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                Instalá la app en tu {disp}: tocá <span className="text-[#4db8ff]">Compartir</span> ⬆️ y después
                <span className="text-[#4db8ff]"> "Agregar a inicio"</span>
              </div>
            )}

            {esIOS && !esSafari && (
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                Para instalar en tu {disp} <span className="text-[#ffd24d] font-semibold">tenés que abrir esta página en Safari</span>. Copiá el link y pegalo en Safari.
              </div>
            )}
          </div>
          <button onClick={() => setMostrar(false)}
            className="text-white/40 text-xl leading-none shrink-0 px-1">×</button>
        </div>

        {/* Android / Desktop: botón de instalar nativo */}
        {!esIOS && (
          <button onClick={instalar}
            className="w-full mt-3 bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform">
            Instalar app
          </button>
        )}

        {/* iOS fuera de Safari: copiar link para abrir en Safari */}
        {esIOS && !esSafari && (
          <button onClick={copiarLink}
            className="w-full mt-3 bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform">
            {copiado ? '✓ ¡Copiado! Abrí Safari y pegá el link' : 'Copiar link'}
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
