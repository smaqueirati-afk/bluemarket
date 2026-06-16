'use client'

// MapaReparto — 100% Google Maps nativo, sin API key, sin iframes, sin Leaflet.
// Arma URLs de Google Maps para navegar a cada parada o iniciar el recorrido completo.

function buildRouteUrl(paradas, origen) {
  // maps/dir/origen/parada1/parada2/... — abre la ruta en Google Maps
  const dirs = paradas.map((p) => encodeURIComponent(p.direccion.trim()))
  if (dirs.length === 0) return null
  const partes = origen ? [encodeURIComponent(origen.trim()), ...dirs] : dirs
  return 'https://www.google.com/maps/dir/' + partes.join('/')
}

function buildNavUrl(direccion) {
  // Navegación punto a punto hacia una dirección
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`
}

export default function MapaReparto({ pedidos, origen }) {
  const paradas = pedidos.filter((p) => p.direccion && p.direccion.trim())
  const routeUrl = buildRouteUrl(paradas, origen)

  if (paradas.length === 0) {
    return (
      <div className="mb-4 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-6 text-center">
        <div className="text-2xl mb-1 opacity-40">🗺️</div>
        <p className="text-white/40 text-sm">Sin direcciones de envío para hoy</p>
      </div>
    )
  }

  return (
    <div className="mb-4 space-y-2">

      {/* Panel de paradas */}
      <div className="bg-white/[0.04] border border-[#9b59b6]/25 rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛵</span>
            <span className="text-sm font-bold text-white">
              Recorrido · {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
            </span>
          </div>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#4285F4] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform shrink-0">
              <GoogleMapsIcon />
              Ruta completa
            </a>
          )}
        </div>

        {/* Lista */}
        <div className="divide-y divide-white/[0.06]">
          {paradas.map((p, i) => (
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

        {/* Footer: ruta completa (solo si hay más de 1 parada) */}
        {paradas.length > 1 && routeUrl && (
          <div className="px-4 py-3 border-t border-white/8">
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#4285F4] text-white text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-transform">
              <GoogleMapsIcon size={16} />
              Iniciar recorrido en Google Maps
            </a>
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/30 px-1">
        Tocá <strong className="text-white/50">Ir</strong> para navegar a una parada o <strong className="text-white/50">Iniciar recorrido</strong> para hacer todas seguidas.
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
