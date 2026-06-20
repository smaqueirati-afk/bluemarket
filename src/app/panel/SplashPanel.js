'use client'

import { useState, useEffect } from 'react'

// Splash del panel del dueño: muestra el logo del rubro sobre fondo blanco
// al abrir el panel y se desvanece solo. Aparece una vez por sesión.
// Reutiliza las mismas imágenes /splash/[rubro].png que la tienda,
// pero con su propia clave de sesión para no pisarse con el splash del consumidor.
//
// Por defecto, todo panel nuevo usa el splash genérico de BlueMarket.
// Solo pescaderías y queserías mantienen su splash propio.
const SPLASH_POR_SLUG = {
  // 'algun-slug': 'pescaderia',
}

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function resolverCarpeta(rubro, slug) {
  if (slug && SPLASH_POR_SLUG[slug]) return SPLASH_POR_SLUG[slug]
  const r = normalizar(rubro)
  if (r.includes('pescaderia') || r.includes('pescado')) return 'pescaderia'
  if (r.includes('queseria') || r.includes('queso')) return 'queseria'
  return 'bluemarket'
}

export default function SplashPanel({ rubro, slug }) {
  // estados: 'cargando' | 'mostrando' | 'saliendo' | 'oculto'
  const [estado, setEstado] = useState('cargando')

  const carpeta = resolverCarpeta(rubro, slug)
  const src = `/splash/${carpeta}.png`
  const flagVisto = `bm_splash_panel_visto_${slug || 'x'}`

  // Precarga la imagen del rubro. Si no existe, no muestra nada.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(flagVisto)) {
        setEstado('oculto')
        return
      }
    } catch (e) {}

    const img = new Image()
    img.onload = () => setEstado('mostrando')
    img.onerror = () => setEstado('oculto')
    img.src = src
  }, [src, flagVisto])

  // Tiempos de visibilidad y fade
  useEffect(() => {
    if (estado !== 'mostrando') return
    const tFade = setTimeout(() => setEstado('saliendo'), 1100)
    const tFin = setTimeout(() => {
      setEstado('oculto')
      try { sessionStorage.setItem(flagVisto, '1') } catch (e) {}
    }, 1650)
    return () => { clearTimeout(tFade); clearTimeout(tFin) }
  }, [estado, flagVisto])

  if (estado === 'oculto' || estado === 'cargando') return null

  const saltar = () => {
    setEstado('saliendo')
    setTimeout(() => {
      setEstado('oculto')
      try { sessionStorage.setItem(flagVisto, '1') } catch (e) {}
    }, 450)
  }

  return (
    <div
      onClick={saltar}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#fefefe',
        backgroundImage: `url(${src})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: estado === 'saliendo' ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: estado === 'saliendo' ? 'none' : 'auto',
      }}
    />
  )
}
