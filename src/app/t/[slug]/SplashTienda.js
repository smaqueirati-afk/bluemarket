'use client'

import { useState, useEffect } from 'react'

// Splash de la tienda: muestra el logo del rubro sobre fondo negro al abrir,
// y se desvanece solo. Se muestra una vez por sesión. Se puede saltear con un tap.
export default function SplashTienda({ rubro }) {
  // estados: 'cargando' | 'mostrando' | 'saliendo' | 'oculto'
  const [estado, setEstado] = useState('cargando')

  const carpeta = rubro === 'quesería' ? 'queseria' : 'pescaderia'
  const src = `/splash/${carpeta}.png`

  // Precarga la imagen del rubro. Si no existe, no muestra nada.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('bm_splash_visto')) {
        setEstado('oculto')
        return
      }
    } catch (e) {}

    const img = new Image()
    img.onload = () => setEstado('mostrando')
    img.onerror = () => setEstado('oculto')
    img.src = src
  }, [src])

  // Tiempos de visibilidad y fade
  useEffect(() => {
    if (estado !== 'mostrando') return
    const tFade = setTimeout(() => setEstado('saliendo'), 1100)
    const tFin = setTimeout(() => {
      setEstado('oculto')
      try { sessionStorage.setItem('bm_splash_visto', '1') } catch (e) {}
    }, 1650)
    return () => { clearTimeout(tFade); clearTimeout(tFin) }
  }, [estado])

  if (estado === 'oculto' || estado === 'cargando') return null

  const saltar = () => {
    setEstado('saliendo')
    setTimeout(() => {
      setEstado('oculto')
      try { sessionStorage.setItem('bm_splash_visto', '1') } catch (e) {}
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
