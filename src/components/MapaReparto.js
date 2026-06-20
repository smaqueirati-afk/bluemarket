'use client'

import { useState, useEffect } from 'react'

// MapaReparto — Google Maps nativo, sin API key, sin iframes, sin Leaflet.
// Divide las entregas en VIAJES por franja y, dentro de cada uno, ordena las
// paradas por cercanía (vecino más cercano) usando geocoding gratuito de Nominatim.

// Caché de coordenadas a nivel módulo: una dirección se geocodifica una sola vez por sesión.
const geoCache = new Map() // claveDireccion -> {lat,lon} | null

function claveDir(d) {
  return (d || '').trim().toLowerCase()
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Geocoding con Nominatim (OpenStreetMap). Respeta el límite de ~1 consulta/segundo
// gracias al delay en el bucle. Cachea el resultado (incluido el "no encontrado").
async function geocodeAddr(direccion) {
  const k = claveDir(direccion)
  if (geoCache.has(k)) return geoCache.get(k)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccion)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
    const data = await res.json()
    const coord = data && data[0]
      ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
      : null
    geoCache.set(k, coord)
    return coord
  } catch (e) {
    return null // error de red: no cacheamos para reintentar luego
  }
}

function getCoord(direccion) {
  return geoCache.get(claveDir(direccion)) || null
}

// Distancia (al cuadrado) suficiente para ordenar en un área local
function dist2(a, b) {
  const dx = a.lat - b.lat
  const dy = a.lon - b.lon
  return dx * dx + dy * dy
}

// Ordena las paradas por vecino más cercano partiendo del local.
// Las que no se pudieron geocodificar van al final, en su orden original.
function ordenarPorCercania(origenCoord, paradas) {
  const conCoord = []
  const sinCoord = []
  for (const p of paradas) {
    const c = getCoord(p.direccion)
    if (c) conCoord.push({ p, c })
    else sinCoord.push(p)
  }
  if (conCoord.length === 0) return paradas

  const ruta = []
  const pend = [...conCoord]
  let actual = origenCoord
  if (!actual) {
    const first = pend.shift()
    ruta.push(first)
    actual = first.c
  }
  while (pend.length) {
    let bi = 0
    let bd = Infinity
    for (let i = 0; i < pend.length; i++) {
      const d = dist2(actual, pend[i].c)
      if (d < bd) { bd = d; bi = i }
    }
    const nx = pend.splice(bi, 1)[0]
    ruta.push(nx)
    actual = nx.c
  }
  return [...ruta.map((x) => x.p), ...sinCoord]
}

function buildRouteUrl(paradas, origen) {
  const dirs = paradas.map((p) => encodeURIComponent(p.direccion.trim()))
  if (dirs.length === 0) return null
  const partes = origen ? [encodeURIComponent(origen.trim()), ...dirs] : dirs
  return 'https://www.google.com/maps/dir/' + partes.join('/')
}

function buildNavUrl(direccion) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`
}

const FRANJAS_ORDEN = ['manana', 'tarde', 'noche', 'cualquiera']
const FRANJA_INFO = {
  manana:     { label: 'Mañana', emoji: '☀️' },
  tarde:      { label: 'Tarde', emoji: '🌇' },
  noche:      { label: 'Noche', emoji: '🌙' },
  cualquiera: { label: 'Sin preferencia', emoji: '🤷' },
}
function franjaKey(f) {
  return FRANJA_INFO[f] ? f : 'cualquiera'
}

export default function MapaReparto({ pedidos, origen }) {
  const paradas = pedidos.filter((p) => p.direccion && p.direccion.trim())

  // 'idle' | 'cargando' | 'listo' | 'error'
  const [estado, setEstado] = useState('idle')
  // se incrementa cada vez que llega una coordenada, para re-renderizar con la ruta mejorada
  const [, setVersion] = useState(0)

  const claveParadas = paradas.map((p) => p.id).join(',')

  useEffect(() => {
    let cancelado = false

    async function correr() {
      // Direcciones únicas a geocodificar (local + paradas), salteando las ya cacheadas
      const aBuscar = []
      const vistos = new Set()
      const cola = []
      if (origen && origen.trim()) cola.push(origen.trim())
      for (const p of paradas) cola.push(p.direccion.trim())
      for (const d of cola) {
        const k = claveDir(d)
        if (vistos.has(k)) continue
        vistos.add(k)
        if (!geoCache.has(k)) aBuscar.push(d)
      }

      if (aBuscar.length === 0) {
        if (!cancelado) setEstado('listo')
        return
      }

      setEstado('cargando')
      let huboError = false
      for (const d of aBuscar) {
        if (cancelado) return
        const c = await geocodeAddr(d)
        if (c === null) huboError = true
        if (!cancelado) setVersion((v) => v + 1)
        await sleep(1100) // respeta el límite de Nominatim (~1/seg)
      }
      if (!cancelado) setEstado(huboError ? 'error' : 'listo')
    }

    correr()
    return () => { cancelado = true }
  }, [claveParadas, origen])

  if (paradas.length === 0) {
    return (
      <div className="mb-4 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-6 text-center">
        <div className="text-2xl mb-1 opacity-40">🗺️</div>
        <p className="text-white/40 text-sm">Sin direcciones de envío para hoy</p>
      </div>
    )
  }

  const origenCoord = getCoord(origen)

  // Agrupar en viajes por franja
  const grupos = {}
  for (const p of paradas) {
    const k = franjaKey(p.franja)
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(p)
  }
  const viajes = FRANJAS_ORDEN
    .filter((k) => grupos[k] && grupos[k].length)
    .map((k) => ({ key: k, info: FRANJA_INFO[k], paradas: ordenarPorCercania(origenCoord, grupos[k]) }))

  const variosViajes = viajes.length > 1

  return (
    <div className="mb-4 space-y-3">

      {/* Estado de la optimización */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-white/40">
          {variosViajes ? `${viajes.length} viajes según la franja de cada cliente.` : 'Recorrido del día.'}
        </p>
        <span className="text-[11px] font-bold shrink-0">
          {estado === 'cargando' && <span className="text-[#f39c12]">⏳ Optimizando ruta…</span>}
          {estado === 'listo' && <span className="text-[#2ecc71]">✓ Ruta optimizada</span>}
          {estado === 'error' && <span className="text-white/40">Orden aproximado</span>}
        </span>
      </div>

      {viajes.map((v) => {
        const routeUrl = buildRouteUrl(v.paradas, origen)
        const n = v.paradas.length
        return (
          <div key={v.key} className="bg-white/[0.04] border border-[#9b59b6]/25 rounded-2xl overflow-hidden">

            {/* Header del viaje */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{variosViajes ? v.info.emoji : '🛵'}</span>
                <span className="text-sm font-bold text-white">
                  {variosViajes ? `Viaje ${v.info.label}` : 'Recorrido'} · {n} parada{n !== 1 ? 's' : ''}
                </span>
              </div>
              {routeUrl && (
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#4285F4] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform shrink-0">
                  <GoogleMapsIcon />
                  Ruta
                </a>
              )}
            </div>

            {/* Lista de paradas (ya en orden óptimo) */}
            <div className="divide-y divide-white/[0.06]">
              {v.paradas.map((p, i) => (
                <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="w-7 h-7 rounded-full bg-[#9b59b6] text-white text-sm font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/40 font-bold uppercase tracking-wide">
                      Pedido #{p.numero}
                    </div>
                    <div className="text-sm text-white break-words leading-snug">{p.direccion}</div>
                    {p.horario && (
                      <div className="text-[11px] text-[#4db8ff] mt-0.5">🕒 {p.horario}</div>
                    )}
                  </div>
                  <a
                    href={buildNavUrl(p.direccion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 bg-[#4285F4]/15 border border-[#4285F4]/35 text-[#4db8ff] text-[11px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap mt-0.5">
                    <GoogleMapsIcon size={11} />
                    Ir
                  </a>
                </div>
              ))}
            </div>

            {/* Footer: iniciar recorrido del viaje */}
            {n > 1 && routeUrl && (
              <div className="px-4 py-3 border-t border-white/8">
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#4285F4] text-white text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-transform">
                  <GoogleMapsIcon size={16} />
                  {variosViajes ? `Iniciar viaje ${v.info.label}` : 'Iniciar recorrido en Google Maps'}
                </a>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-[11px] text-white/30 px-1">
        Las paradas se ordenan de la más cercana a la más lejana desde el local. Igual podés reordenarlas arrastrándolas dentro de Google Maps.
      </p>
    </div>
  )
}

function GoogleMapsIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  )
}
