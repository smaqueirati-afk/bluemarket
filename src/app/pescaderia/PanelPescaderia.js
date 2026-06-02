'use client'

import { useState } from 'react'
import { cambiarEstadoPedido } from './actions'
import BarraUsuario from '../../components/BarraUsuario'

// Orden y datos de los estados del pedido
const ESTADOS = [
  { id: 'nuevo',     label: 'Nuevo',     color: '#4db8ff', emoji: '🆕' },
  { id: 'preparando',label: 'Preparando',color: '#f39c12', emoji: '👨‍🍳' },
  { id: 'listo',     label: 'Listo',     color: '#2ecc71', emoji: '✅' },
  { id: 'en_camino', label: 'En camino', color: '#9b59b6', emoji: '🛵' },
  { id: 'entregado', label: 'Entregado', color: '#2ecc71', emoji: '🎉' },
  { id: 'cancelado', label: 'Cancelado', color: '#e74c3c', emoji: '❌' },
]

function datosEstado(id) {
  return ESTADOS.find((e) => e.id === id) || ESTADOS[0]
}

// Cuál es el siguiente estado lógico
const SIGUIENTE = {
  nuevo: 'preparando',
  preparando: 'listo',
  listo: 'en_camino',
  en_camino: 'entregado',
}

export default function PanelPescaderia({ pescaderia, pedidos, nombreUsuario }) {
  const [filtro, setFiltro] = useState('activos')
  const [actualizando, setActualizando] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [verQR, setVerQR] = useState(false)

  // Link de la tienda de esta pescadería
  const linkTienda = typeof window !== 'undefined'
    ? `${window.location.origin}/t/${pescaderia?.slug}`
    : `/t/${pescaderia?.slug}`

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkTienda)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (e) {
      // fallback si no hay permiso de portapapeles
      setCopiado(false)
    }
  }

  async function compartirLink() {
    const texto = `¡Hacé tu pedido en ${pescaderia?.nombre}! 🐟\n${linkTienda}`
    if (navigator.share) {
      try {
        await navigator.share({ title: pescaderia?.nombre, text: texto, url: linkTienda })
      } catch (e) { /* el usuario canceló */ }
    } else {
      // si el navegador no soporta compartir nativo, abrir WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  function fmtHora(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  async function avanzar(pedido) {
    const siguiente = SIGUIENTE[pedido.estado]
    if (!siguiente) return
    setActualizando(pedido.id)
    await cambiarEstadoPedido(pedido.id, siguiente)
    setActualizando(null)
  }

  async function cancelar(pedido) {
    setActualizando(pedido.id)
    await cambiarEstadoPedido(pedido.id, 'cancelado')
    setActualizando(null)
  }

  // Filtrar pedidos
  const activos = pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado))
  const finalizados = pedidos.filter((p) => ['entregado', 'cancelado'].includes(p.estado))
  const lista = filtro === 'activos' ? activos : finalizados

  // Métricas del día
  const hoy = new Date().toDateString()
  const pedidosHoy = pedidos.filter((p) => new Date(p.created_at).toDateString() === hoy)
  const ventasHoy = pedidosHoy
    .filter((p) => p.estado !== 'cancelado')
    .reduce((acc, p) => acc + Number(p.total), 0)

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <BarraUsuario perfil="pescaderia" />

      <div className="relative max-w-3xl mx-auto p-5">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 min-w-0 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#4db8ff]/12 border border-[#4db8ff]/30 flex items-center justify-center text-xl shrink-0">
              🐟
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight truncate">{pescaderia?.nombre || 'Mi pescadería'}</h1>
              <p className="text-xs text-white/40 truncate">Hola, {nombreUsuario} 👋</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href="/pescaderia/productos"
              className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-3 py-2.5 rounded-xl active:scale-95 transition-all text-center">
              🐟 Productos
            </a>
            <a href="/pescaderia/clientes"
              className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-3 py-2.5 rounded-xl active:scale-95 transition-all text-center">
              👥 Clientes
            </a>
          </div>
        </div>

        {/* Métricas del día */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 backdrop-blur-sm">
            <div className="text-[10px] text-white/40 uppercase tracking-wide leading-tight">Pedidos hoy</div>
            <div className="text-lg sm:text-xl font-extrabold mt-1 text-white">{pedidosHoy.length}</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 backdrop-blur-sm">
            <div className="text-[10px] text-white/40 uppercase tracking-wide leading-tight">Activos</div>
            <div className="text-lg sm:text-xl font-extrabold mt-1 text-[#4db8ff]">{activos.length}</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-3 sm:p-3.5 backdrop-blur-sm">
            <div className="text-[10px] text-white/40 uppercase tracking-wide leading-tight">Ventas hoy</div>
            <div className="text-sm sm:text-xl font-extrabold mt-1 text-[#2ecc71] truncate">{fmt(ventasHoy)}</div>
          </div>
        </div>

        {/* Tarjeta del link de la tienda */}
        <div className="bg-[linear-gradient(135deg,rgba(77,184,255,0.12),rgba(46,204,113,0.08))] border border-[#4db8ff]/25 rounded-2xl p-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔗</span>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wide">Tu tienda online</span>
          </div>

          <div className="bg-black/25 border border-white/10 rounded-xl px-4 py-3 mb-3">
            <div className="text-base font-extrabold text-white mb-1">{pescaderia?.nombre}</div>
            <div className="overflow-x-auto bm-no-scrollbar">
              <code className="text-[12px] text-[#7dd3fc] whitespace-nowrap">{linkTienda}</code>
            </div>
          </div>

          <p className="text-[12px] text-white/45 mb-3 leading-relaxed">
            Compartí este link con tus clientes para que vean tus productos y te hagan pedidos.
          </p>
          <div className="flex gap-2">
            <button onClick={compartirLink}
              className="flex-1 bg-[#4db8ff] text-[#03174a] font-bold text-sm py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5">
              <span>📤</span> Compartir
            </button>
            <button onClick={copiarLink}
              className="flex-1 bg-white/[0.08] border border-white/12 text-white font-medium text-sm py-2.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
              {copiado ? <><span>✓</span> Copiado</> : <><span>📋</span> Copiar</>}
            </button>
            <button onClick={() => setVerQR(!verQR)}
              className="bg-white/[0.08] border border-white/12 text-white font-medium text-sm py-2.5 px-3 rounded-xl active:scale-[0.98] transition-all">
              {verQR ? '✕' : '🔲'}
            </button>
          </div>

          {verQR && (
            <div className="mt-4 flex flex-col items-center" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
              <div className="bg-white p-3 rounded-2xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkTienda)}`}
                  alt="QR de la tienda"
                  width={200}
                  height={200}
                />
              </div>
              <p className="text-[11px] text-white/45 mt-2.5 text-center">
                Imprimí este QR y pegalo en tu local.<br />Tus clientes lo escanean y compran.
              </p>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFiltro('activos')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filtro === 'activos' ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.06] text-white/55 border border-white/10'
            }`}>
            Activos ({activos.length})
          </button>
          <button onClick={() => setFiltro('finalizados')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filtro === 'finalizados' ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.06] text-white/55 border border-white/10'
            }`}>
            Finalizados ({finalizados.length})
          </button>
        </div>

        {/* Lista de pedidos */}
        {lista.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.03] border border-white/8 rounded-2xl">
            <div className="text-4xl mb-3 opacity-40">📦</div>
            <p className="text-white/40 text-sm">
              {filtro === 'activos' ? 'No hay pedidos activos en este momento.' : 'Todavía no hay pedidos finalizados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((pedido, idx) => {
              const est = datosEstado(pedido.estado)
              const siguiente = SIGUIENTE[pedido.estado]
              return (
                <div key={pedido.id}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
                  style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.05}s` }}>

                  {/* Cabecera del pedido */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg font-extrabold text-white shrink-0">#{pedido.numero}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                        style={{ background: `${est.color}22`, color: est.color }}>
                        {est.emoji} {est.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/35 shrink-0">{fmtHora(pedido.created_at)}</span>
                  </div>

                  {/* Datos del pedido */}
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2 text-white/70">
                      <span className="text-white/40">
                        {pedido.tipo_entrega === 'delivery' ? '🏠 Envío' : '🏪 Retiro'}
                      </span>
                      {pedido.direccion && <span className="text-white/50">· {pedido.direccion}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <span className="text-white/40">
                        {pedido.metodo_pago === 'efectivo' ? '💵 Efectivo' :
                         pedido.metodo_pago === 'transferencia' ? '🏦 Transferencia' : '💳 ' + pedido.metodo_pago}
                      </span>
                    </div>
                    {pedido.nota_cliente && (
                      <div className="text-white/50 text-[13px] bg-white/[0.04] rounded-lg px-3 py-2 mt-2">
                        📝 {pedido.nota_cliente}
                      </div>
                    )}
                  </div>

                  {/* Total y acciones */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/8 flex-wrap">
                    <span className="text-lg font-extrabold text-[#4db8ff]">{fmt(pedido.total)}</span>

                    {!['entregado', 'cancelado'].includes(pedido.estado) && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => cancelar(pedido)}
                          disabled={actualizando === pedido.id}
                          className="text-xs text-white/40 hover:text-[#e74c3c] px-2 transition-colors disabled:opacity-50">
                          Cancelar
                        </button>
                        {siguiente && (
                          <button
                            onClick={() => avanzar(pedido)}
                            disabled={actualizando === pedido.id}
                            className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60">
                            {actualizando === pedido.id ? '...' : `→ ${datosEstado(siguiente).label}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
