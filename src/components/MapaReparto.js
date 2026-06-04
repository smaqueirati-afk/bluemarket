'use client'

import { useEffect, useRef, useState } from 'react'

// Carga Leaflet (JS + CSS) desde CDN una sola vez
function cargarLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.L) return resolve(window.L)
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const existente = document.getElementById('leaflet-js')
    if (existente) {
      if (window.L) return resolve(window.L)
      existente.addEventListener('load', () => resolve(window.L))
      existente.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(window.L)
    script.onerror = reject
    document.body.appendChild(script)
  })
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Geocodifica una dirección con Nominatim (gratis). Devuelve { punto, deCache }
async function geocodificar(direccion, ciudad) {
  const consulta = [direccion, ciudad, 'Argentina'].filter(Boolean).join(', ')
  const key = 'bm_geo_' + consulta.trim().toLowerCase()
  try {
    const cache = localStorage.getItem(key)
    if (cache) return { punto: JSON.parse(cache), deCache: true }
  } catch (e) { /* sin acceso a localStorage */ }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
  const data = await res.json()
  if (!data || !data.length) return { punto: null, deCache: false }
  const punto = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  try { localStorage.setItem(key, JSON.stringify(punto)) } catch (e) { /* ignorar */ }
  return { punto, deCache: false }
}

export default function MapaReparto({ pedidos, ciudad }) {
  const contenedorRef = useRef(null)
  const mapaRef = useRef(null)
  const [estado, setEstado] = useState('cargando') // cargando | listo | vacio | error
  const [resueltas, setResueltas] = useState(0)

  // Clave estable: solo re-corre si cambian los pedidos o sus direcciones
  const conDireccion = pedidos.filter((p) => p.direccion && p.direccion.trim())
  const clave = conDireccion.map((p) => p.id + '|' + p.direccion).join(',')

  useEffect(() => {
    let cancelado = false

    if (conDireccion.length === 0) {
      setEstado('vacio')
      return
    }
    setEstado('cargando')
    setResueltas(0)

    async function init() {
      let L
      try {
        L = await cargarLeaflet()
      } catch (e) {
        if (!cancelado) setEstado('error')
        return
      }
      if (cancelado || !contenedorRef.current) return

      if (!mapaRef.current) {
        mapaRef.current = L.map(contenedorRef.current).setView([-34.6, -58.45], 12)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapaRef.current)
      }
      const mapa = mapaRef.current
      const puntos = []
      let n = 0

      for (let i = 0; i < conDireccion.length; i++) {
        if (cancelado) return
        const p = conDireccion[i]
        let resultado = { punto: null, deCache: true }
        try {
          resultado = await geocodificar(p.direccion, ciudad)
        } catch (e) { /* seguir con la siguiente */ }

        if (resultado.punto) {
          n++
          const icono = L.divIcon({
            className: '',
            html: `<div style="background:#9b59b6;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${i + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          L.marker([resultado.punto.lat, resultado.punto.lng], { icon: icono })
            .addTo(mapa)
            .bindPopup(`<b>Parada ${i + 1}</b> &middot; #${p.numero}<br>${p.direccion}`)
          puntos.push([resultado.punto.lat, resultado.punto.lng])
          if (!cancelado) setResueltas(n)
        }

        // Política de Nominatim: máx 1 pedido/seg (solo si fue a la red)
        if (!resultado.deCache && i < conDireccion.length - 1) {
          await delay(1100)
        }
      }

      if (cancelado) return
      if (puntos.length === 0) { setEstado('error'); return }

      if (puntos.length >= 2) {
        L.polyline(puntos, { color: '#9b59b6', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(mapa)
        mapa.fitBounds(puntos, { padding: [40, 40] })
      } else {
        mapa.setView(puntos[0], 15)
      }
      setTimeout(() => { if (!cancelado && mapaRef.current) mapaRef.current.invalidateSize() }, 120)
      setEstado('listo')
    }

    init()

    return () => {
      cancelado = true
      if (mapaRef.current) {
        mapaRef.current.remove()
        mapaRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, ciudad])

  return (
    <div className="mb-4">
      <div className="relative rounded-2xl overflow-hidden border border-[#9b59b6]/30">
        <div ref={contenedorRef} style={{ height: 260, width: '100%', background: '#0a1838' }} />
        {estado !== 'listo' && (
          <div className="absolute top-2 right-2 z-[1000] bg-[#03174a]/90 text-white/80 text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 pointer-events-none">
            {estado === 'cargando' && `🗺️ Ubicando paradas… (${resueltas})`}
            {estado === 'vacio' && 'Sin direcciones para mapear'}
            {estado === 'error' && 'No se pudo cargar el mapa'}
          </div>
        )}
      </div>
      <p className="text-[11px] text-white/35 mt-1.5 px-1">
        📍 Pines en orden de pedido. La ubicación es aproximada (geocodificada de la dirección).
      </p>
    </div>
  )
}
