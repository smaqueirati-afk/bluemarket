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
      <div className="relative w-full h-full max-w-[390px] max-h-[844px] flex flex-col bg-[#03174a] overflow-hidden">

        {/* TOP BAR */}
        <div className="shrink-0 px-4 pt-4 bg-[#03174a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1.5">
              <span>📍</span>
              <span className="text-[11px] text-white/50">Entrega en</span>
              <strong className="text-[11px] text-white">Escobar, BA</strong>
            </div>
            <div className="relative w-9 h-9 bg-white/[0.06] border border-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white/60">🛒</span>
              {carrito.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-[#4db8ff] text-[#03174a] text-[9px] font-extrabold min-w-[16px] h-4 rounded-lg px-1 flex items-center justify-center">
                  {carrito.length}
                </div>
              )}
            </div>
          </div>

          {/* Búsqueda */}
          <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 mb-3">
            <span className="text-white/30">🔍</span>
            <span className="text-sm text-white/30">Buscar merluza, langostinos...</span>
          </div>

          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                  categoria === cat.id
                    ? 'bg-[#4db8ff]/15 border-[#4db8ff] text-[#4db8ff]'
                    : 'bg-white/[0.06] border-white/10 text-white/50'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 scrollbar-hide">
          <div className="text-[13px] font-bold text-white mb-3 mt-1">
            {categoria === 'todo' ? 'Catálogo completo' : categorias.find(c => c.id === categoria)?.label}
            <span className="text-white/40 font-normal ml-2">({productosFiltrados.length})</span>
          </div>

          {productosFiltrados.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">
              No hay productos en esta categoría.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {productosFiltrados.map((p) => (
                <div key={p.id} className="bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="h-[72px] bg-gradient-to-br from-[#051e5c] to-[#0a3a7a] flex items-center justify-center text-3xl">
                    {p.emoji}
                  </div>
                  <div className="px-3 pt-2.5 pb-3">
                    <div className="text-[13px] font-semibold text-white">{p.nombre}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      Por {p.unidad} · Stock: {p.stock}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm font-extrabold text-[#4db8ff]">{fmt(p.precio)}</div>
                      <button
                        onClick={() => agregar(p)}
                        className="w-7 h-7 bg-[#4db8ff] rounded-lg text-[#03174a] text-lg font-extrabold flex items-center justify-center active:scale-90 transition-transform"
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
    </div>
  )
}