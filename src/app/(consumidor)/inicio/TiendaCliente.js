'use client'

import { useState } from 'react'

export default function TiendaCliente({ productos }) {
  const [carrito, setCarrito] = useState([])
  const [categoria, setCategoria] = useState('todo')

  const categorias = [
    { id: 'todo', emoji: '🐟', label: 'Todo' },
    { id: 'mariscos', emoji: '🦐', label: 'Mariscos' },
    { id: 'pescado', emoji: '🐡', label: 'Pescado' },
    { id: 'moluscos', emoji: '🦑', label: 'Moluscos' },
    { id: 'congelados', emoji: '❄️', label: 'Congelados' },
  ]

  const productosFiltrados =
    categoria === 'todo'
      ? productos
      : productos.filter((p) => p.categoria === categoria)

  function agregar(producto) {
    setCarrito((prev) => [...prev, producto])
  }

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-[420px] sm:max-h-[900px] sm:rounded-[40px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">

        {/* TOP BAR */}
        <div className="shrink-0 px-4 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 bg-white/[0.07] border border-white/12 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <span>📍</span>
              <span className="text-[11px] text-white/55">Entrega en</span>
              <strong className="text-[11px] text-white">Escobar, BA</strong>
            </div>
            <button className="relative w-10 h-10 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform">
              <span className="text-white/70 text-lg">🛒</span>
              {carrito.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-[#4db8ff] text-[#03174a] text-[9px] font-extrabold min-w-[17px] h-[17px] rounded-lg px-1 flex items-center justify-center"
                     style={{ boxShadow: '0 0 10px rgba(77,184,255,0.5)' }}>
                  {carrito.length}
                </div>
              )}
            </button>
          </div>

          {/* Saludo */}
          <h1 className="text-xl font-extrabold text-white mb-0.5">
            Frescos de <span className="text-[#4db8ff]">hoy</span> 🌊
          </h1>
          <p className="text-[12px] text-white/45 mb-3.5">Recién llegados del mar a tu mesa</p>

          {/* Búsqueda */}
          <div className="flex items-center gap-2.5 bg-white/10 border border-white/12 rounded-xl px-3.5 py-3 mb-3.5 backdrop-blur-sm">
            <span className="text-white/35">🔍</span>
            <span className="text-sm text-white/35">Buscar merluza, langostinos...</span>
          </div>

          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-3 bm-no-scrollbar">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                  categoria === cat.id
                    ? 'bg-[#4db8ff]/15 border-[#4db8ff] text-[#4db8ff]'
                    : 'bg-white/[0.06] border-white/10 text-white/55 hover:border-white/25'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-5 bm-no-scrollbar">
          <div className="text-[13px] font-bold text-white mb-3 mt-1">
            {categoria === 'todo' ? 'Catálogo completo' : categorias.find(c => c.id === categoria)?.label}
            <span className="text-white/40 font-normal ml-2">({productosFiltrados.length})</span>
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-40">🐟</div>
              <p className="text-white/40 text-sm">No hay productos en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {productosFiltrados.map((p, idx) => (
                <div key={p.id}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-[#4db8ff]/50"
                  style={{ animation: `bmFadeUp 0.4s ease both`, animationDelay: `${idx * 0.04}s` }}>
                  <div className="h-[78px] bg-[linear-gradient(135deg,#0a3a7a,#051e5c)] flex items-center justify-center text-3xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30"
                         style={{ background: 'radial-gradient(circle at 70% 20%, rgba(125,211,252,0.4), transparent 60%)' }} />
                    <span className="relative">{p.emoji}</span>
                  </div>
                  <div className="px-3 pt-2.5 pb-3">
                    <div className="text-[13px] font-semibold text-white leading-tight">{p.nombre}</div>
                    <div className="text-[10px] text-white/35 mt-1">
                      Por {p.unidad} · Stock: {p.stock}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="text-[15px] font-extrabold text-[#4db8ff]">{fmt(p.precio)}</div>
                      <button
                        onClick={() => agregar(p)}
                        className="w-8 h-8 bg-[#4db8ff] rounded-lg text-[#03174a] text-xl font-extrabold flex items-center justify-center active:scale-90 transition-all hover:shadow-[0_0_14px_rgba(77,184,255,0.5)]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
