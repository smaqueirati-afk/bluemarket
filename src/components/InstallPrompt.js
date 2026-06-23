'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'bm_install_dismissed'
const DISMISS_DIAS = 3

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [mostrar, setMostrar] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [esIpad, setEsIpad] = useState(false)
  const [esSafari, setEsSafari] = useState(true)
  const [instalada, setInstalada] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [urlActual, setUrlActual] = useState('')

  useEffect(() => {
    // ¿Ya está instalada y abierta como app?
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
    if (standalone) { setInstalada(true); return }

    // ¿La cerró hace poco?
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
      if (t && (Date.now() - t) < DISMISS_DIAS * 24 * 60 * 60 * 1000) return
    } catch (e) {}

    setUrlActual(window.location.href)

    const ua = window.navigator.userAgent.toLowerCase()

    // Detección iOS / iPad (iPadOS 13+ se hace pasar por Mac de escritorio)
    const ipad = /ipad/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const iphone = /iphone|ipod/.test(ua)
    const ios = iphone || ipad
    setEsIpad(ipad)
    setEsIOS(ios)

    // En iOS, "Agregar a inicio" SOLO funciona en Safari (no en el navegador de WhatsApp/Chrome).
    const safari = /safari/.test(ua) && !/crios|fxios|opios|edgios|chrome|android/.test(ua)
    setEsSafari(safari)

    // Android/Chrome: capturar el evento nativo de instalación
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

  function cerrar() {
    setMostrar(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch (e) {}
  }

  async function instalar() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setMostrar(false)
    setDeferredPrompt(null)
  }

  // Copiar la página actual para abrirla en Safari
  async function copiarLink() {
    const url = urlActual || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy'); setCopiado(true) } catch (err) {}
      document.body.removeChild(ta)
    }
    setTimeout(() => setCopiado(false), 2500)
  }

  if (instalada || !mostrar) return null

  const disp = esIpad ? 'iPad' : 'iPhone'
  const barra = esIpad ? 'arriba a la derecha' : 'abajo'

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-[420px] mx-auto"
         style={{ animation: 'bmSlideUp 0.5s ease both' }}>
      <div className="bg-[#0a3a7a]/97 border border-[#4db8ff]/40 rounded-2xl p-4 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#4db8ff]/15 border border-[#4db8ff]/40 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/icons/bluemarket/icon-192.png" alt="App" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-extrabold text-[15px]">
              {esIOS ? `Agregá la app a tu ${disp}` : 'Instalá la app'}
            </div>
            {!esIOS && (
              <div className="text-white/60 text-xs mt-0.5 leading-relaxed">
                Accedé con un toque desde tu pantalla de inicio.
              </div>
            )}
            {esIOS && !esSafari && (
              <div className="text-white/65 text-[13px] mt-1 leading-relaxed">
                Para instalarla, <span className="text-[#ffd24d] font-semibold">abrí esta página en Safari</span>.
                Si estás en WhatsApp, tocá los <span className="font-semibold">···</span> y elegí <span className="font-semibold">"Abrir en Safari"</span>.
              </div>
            )}
          </div>
          <button onClick={cerrar} className="text-white/40 text-xl leading-none shrink-0 px-1">×</button>
        </div>

        {/* iOS en Safari: pasos guiados */}
        {esIOS && esSafari && (
          <div className="mt-3 space-y-2">
            <Paso n="1">
              Tocá el botón <span className="text-[#4db8ff] font-semibold">Compartir</span>
              <span className="inline-flex items-center justify-center w-5 h-5 mx-1 align-middle rounded bg-[#4db8ff]/20 border border-[#4db8ff]/40 text-[#4db8ff] text-[11px]">⬆️</span>
              ({barra}).
            </Paso>
            <Paso n="2">
              Elegí <span className="text-[#4db8ff] font-semibold">"Agregar a inicio"</span> y confirmá.
            </Paso>
            <Paso n="3">
              Después buscá el ícono en la <span className="text-white font-semibold">pantalla de inicio de tu {disp}</span> y entrá con un toque. 🎉
            </Paso>
          </div>
        )}

        {/* Android / Desktop: botón nativo */}
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
            {copiado ? '✓ ¡Copiado! Pegalo en Safari' : 'Copiar link para Safari'}
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

function Paso({ n, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 w-5 h-5 rounded-full bg-[#4db8ff] text-[#03174a] text-[11px] font-extrabold flex items-center justify-center mt-0.5">{n}</span>
      <span className="text-white/75 text-[13px] leading-relaxed">{children}</span>
    </div>
  )
}
