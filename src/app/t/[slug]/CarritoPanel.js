'use client'

// Panel deslizable del carrito de compras.
// Props: carrito, error, onCerrar, onAgregar, onQuitar, onIrCheckout
export default function CarritoPanel({ carrito, error, onCerrar, onAgregar, onQuitar, onIrCheckout }) {
  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0)
  const totalPrecio = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      {/* Fondo oscuro */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />

      {/* Panel deslizable desde abajo */}
      <div
        className="relative mt-auto bg-[#051e5c] border-t border-white/12 rounded-t-[28px] max-h-[85%] flex flex-col"
        style={{ animation: 'bmSlideUp 0.35s ease both' }}
      >
        {/* Cabecera */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/8">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white">Tu carrito 🛒</h2>
            <button onClick={onCerrar} className="text-white/40 text-2xl leading-none px-1">×</button>
          </div>
        </div>

        {/* Banner error de stock */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-xl text-sm bg-[#e74c3c]/15 border border-[#e74c3c]/30 text-[#e74c3c]">
            ⚠️ {error}. Revisá tu carrito y volvé a intentarlo.
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bm-no-scrollbar">
          {carrito.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3 opacity-40">🛒</div>
              <p className="text-white/40 text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrito.map((item) => (
                <div
                  key={item.producto.id}
                  className="flex items-center gap-3 bg-white/[0.05] border border-white/8 rounded-2xl p-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-[linear-gradient(135deg,#0a3a7a,#051e5c)] flex items-center justify-center text-2xl shrink-0">
                    {item.producto.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.producto.nombre}</div>
                    <div className="text-xs text-[#4db8ff] font-bold mt-0.5">
                      {fmt(item.producto.precio)}{' '}
                      <span className="text-white/35 font-normal">/ {item.producto.unidad}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onQuitar(item.producto.id)}
                      className="w-7 h-7 bg-white/10 rounded-lg text-white text-lg font-bold flex items-center justify-center active:scale-90"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-white w-5 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => onAgregar(item.producto)}
                      className="w-7 h-7 bg-[#4db8ff] rounded-lg text-[#03174a] text-lg font-extrabold flex items-center justify-center active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con total y botón */}
        {carrito.length > 0 && (
          <div className="shrink-0 px-5 py-4 border-t border-white/8 bg-[#03174a]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/55 text-sm">Total</span>
              <span className="text-2xl font-extrabold text-white">{fmt(totalPrecio)}</span>
            </div>
            <button
              onClick={onIrCheckout}
              className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform"
            >
              Continuar con el pedido
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
