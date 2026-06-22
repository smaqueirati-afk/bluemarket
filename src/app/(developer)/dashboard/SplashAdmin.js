'use client'

import { useState, useEffect } from 'react'

// Fecha local (YYYY-M-D) para mostrar el splash una sola vez por día.
function fechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Splash del panel de administrador (developer). Usa una imagen fija genérica
// de BlueMarket en /splash/admin.png. Fondo claro, se desvanece solo y aparece
// UNA VEZ POR DÍA (guarda la fecha en localStorage).
export default function SplashAdmin() {
  // estados: 'cargando' | 'mostrando' | 'saliendo' | 'oculto'
  const [estado, setEstado] = useState('cargando')

  const src = '/splash/admin.png'

  // Precarga la imagen. Si ya se mostró hoy, no aparece.
  useEffect(() => {
    try {
      if (localStorage.getItem('bm_splash_admin_fecha') === fechaHoy()) {
        setEstado('oculto')
        return
      }
    } catch (e) {}

    const img = new Image()
    img.onload = () => setEstado('mostrando')
    img.onerror = () => setEstado('oculto')
    img.src = src
  }, [])

  // Tiempos de visibilidad y fade
  useEffect(() => {
    if (estado !== 'mostrando') return
    const tFade = setTimeout(() => setEstado('saliendo'), 1100)
    const tFin = setTimeout(() => {
      setEstado('oculto')
      try { localStorage.setItem('bm_splash_admin_fecha', fechaHoy()) } catch (e) {}
    }, 1650)
    return () => { clearTimeout(tFade); clearTimeout(tFin) }
  }, [estado])

  if (estado === 'oculto' || estado === 'cargando') return null

  const saltar = () => {
    setEstado('saliendo')
    setTimeout(() => {
      setEstado('oculto')
      try { localStorage.setItem('bm_splash_admin_fecha', fechaHoy()) } catch (e) {}
    }, 450)
  }

  return (
    <div
      onClick={saltar}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#eef5ff',
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
