'use client'

import { useState, useEffect } from 'react'

// Splash del panel de administrador (developer). A diferencia de la tienda y
// el panel del dueño, este NO depende del rubro: usa una imagen fija genérica
// de BlueMarket en /splash/admin.png. Fondo blanco, se desvanece solo y aparece
// una vez por sesión (clave propia para no pisarse con los otros splash).
export default function SplashAdmin() {
  // estados: 'cargando' | 'mostrando' | 'saliendo' | 'oculto'
  const [estado, setEstado] = useState('cargando')

  const src = '/splash/admin.png'

  // Precarga la imagen. Si no existe todavía, no muestra nada (sin splash roto).
  useEffect(() => {
    try {
      if (sessionStorage.getItem('bm_splash_admin_visto')) {
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
      try { sessionStorage.setItem('bm_splash_admin_visto', '1') } catch (e) {}
    }, 1650)
    return () => { clearTimeout(tFade); clearTimeout(tFin) }
  }, [estado])

  if (estado === 'oculto' || estado === 'cargando') return null

  const saltar = () => {
    setEstado('saliendo')
    setTimeout(() => {
      setEstado('oculto')
      try { sessionStorage.setItem('bm_splash_admin_visto', '1') } catch (e) {}
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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: estado === 'saliendo' ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: estado === 'saliendo' ? 'none' : 'auto',
      }}
    />
  )
}
