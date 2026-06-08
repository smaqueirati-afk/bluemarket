'use client'

// Panel con el historial de pedidos del cliente en esta pescadería.
// Props: pedidos (null = cargando, [] = vacío, [...] = lista), onCerrar
const ESTADOS_INFO = {
  nuevo:      { label: 'Recibido',   color: '#4db8ff', emoji: '🆕' },
  preparando: { label: 'Preparando', color: '#f39c12', emoji: '👨‍🍳' },
  listo:      { label: 'Listo',      color: '#2ecc71', emoji: '✅' },
  en_camino:  { label: 'En camino',  color: '#9b59b6', emoji: '🛵' },
  entregado:  { label: 'Entregado',  color: '#2ecc71', emoji: '🎉' },
  cancelado:  { label: 'Cancelado',  color: '#e74c3c', emoji: '❌' },
}

export default function MisPedidosPanel({ pedidos, onCerrar }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />
      <div
        className="relative mt-auto bg-[#051e5c] border-t border-white/12 rounded-t-3xl max-h-[85%] flex flex-col"
        style={{ animation: 'bmSlideUp 0.3s ease both' }}
      >
        {/* Cabecera */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-extrabold text-white">Mis pedidos 📋</h2>
          <button onClick={onCerrar} className="text-white/40 text-2xl leading-none px-1">×</button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {pedidos === null ? (
            <div className="text-center py-12 text-white/45 text-sm">Cargando tus pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-40">📦</div>
              <p className="text-white/45 text-sm">Todavía no hiciste pedidos en esta pescadería.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((p) => {
                const est = ESTADOS_INFO[p.estado] || ESTADOS_INFO.nuevo
                return (
                  <div key={p.id} className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-white">Pedido #{p.numero}</span>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: `${est.color}22`, color: est.color }}
                      >
                        {est.emoji} {est.label}
                      </span>
                    </div>
                    <div className="text-[12px] text-white/50 mb-2">
                      {p.items.map((it) => `${it.cantidad} ${it.nombre}`).join(' · ')}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/8">
                      <span className="text-[11px] text-white/40">
                        {new Date(p.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className="text-base font-extrabold text-[#4db8ff]">
                        ${Number(p.total).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
