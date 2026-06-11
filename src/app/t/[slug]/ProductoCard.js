'use client'

// Tarjeta de un producto individual en el catálogo.
// Props: producto, enCarrito (item del carrito o undefined), onAgregar, onQuitar
export default function ProductoCard({ producto: p, enCarrito, onAgregar, onQuitar, idx = 0 }) {
  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  return (
    <div
      className="bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-[#4db8ff]/50"
      style={{ animation: `bmFadeUp 0.4s ease both`, animationDelay: `${idx * 0.04}s` }}
    >
      {/* Imagen / emoji */}
      <div className="h-[78px] bg-[linear-gradient(135deg,#0a3a7a,#051e5c)] flex items-center justify-center text-3xl relative overflow-hidden">
        {p.foto_url ? (
          <img
            src={p.foto_url}
            alt={p.nombre}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-30"
              style={{ background: 'radial-gradient(circle at 70% 20%, rgba(125,211,252,0.4), transparent 60%)' }}
            />
            <span className="relative">{p.emoji}</span>
          </>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3">
        <div className="text-[13px] font-semibold text-white leading-tight">{p.nombre}</div>
        <div className="text-[10px] text-white/35 mt-1">
          Por {p.unidad} · Stock: {p.stock}
        </div>

        {/* Precio + controles */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="text-[15px] font-extrabold text-[#4db8ff]">{fmt(p.precio)}</div>

          {enCarrito ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onQuitar(p.id)}
                className="w-7 h-7 bg-white/10 rounded-lg text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all"
              >
                −
              </button>
              <span className="text-sm font-bold text-white w-4 text-center">{enCarrito.cantidad}</span>
              <button
                onClick={() => onAgregar(p)}
                className="w-7 h-7 bg-[#4db8ff] rounded-lg text-[#03174a] text-lg font-extrabold flex items-center justify-center active:scale-90 transition-all"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAgregar(p)}
              className="w-8 h-8 bg-[#4db8ff] rounded-lg text-[#03174a] text-xl font-extrabold flex items-center justify-center active:scale-90 transition-all hover:shadow-[0_0_14px_rgba(77,184,255,0.5)]"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
