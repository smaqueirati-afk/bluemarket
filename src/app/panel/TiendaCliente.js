'use client'

import { useState, useEffect } from 'react'
import Checkout from './Checkout'
import { crearPedido, misPedidos } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'
import { createClient } from '../../../lib/supabase/client'

export default function TiendaCliente({ productos, usuarioId, pescaderiaId, ccHabilitada, soloDelivery, pescaderia }) {
  // carrito = array de { producto, cantidad }
  const [carrito, setCarrito] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = sessionStorage.getItem('bm_carrito')
      if (saved) { sessionStorage.removeItem('bm_carrito'); return JSON.parse(saved) }
    } catch {}
    return []
  })
  const [categoria, setCategoria] = useState('todo')
  const [verCarrito, setVerCarrito] = useState(false)
  const [verCheckout, setVerCheckout] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [palabraClave, setPalabraClave] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorPedido, setErrorPedido] = useState(null)
  const [copiadoInvite, setCopiadoInvite] = useState(false)
  const [misPedidosList, setMisPedidosList] = useState([])
  const [verMisPedidos, setVerMisPedidos] = useState(false)

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

  // ── Funciones del carrito ──
  function agregar(producto) {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function quitar(productoId) {
    setCarrito((prev) => {
      const item = prev.find((i) => i.producto.id === productoId)
      if (item && item.cantidad > 1) {
        return prev.map((i) =>
          i.producto.id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i
        )
      }
      return prev.filter((i) => i.producto.id !== productoId)
    })
  }

  function eliminar(productoId) {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId))
  }

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  // Invitación a la red (solo para usuarios logueados)
  const linkInvitacion = typeof window !== 'undefined' && usuarioId
    ? `${window.location.origin}/invitacion/${usuarioId}`
    : ''


  // ── Cargar mis pedidos y suscribirse a cambios en tiempo real ──
  useEffect(() => {
    if (!pescaderiaId || !usuarioId) return

    async function cargar() {
      const res = await misPedidos(pescaderiaId)
      if (res.pedidos) setMisPedidosList(res.pedidos)
    }
    cargar()

    const supabase = createClient()
    const channel = supabase
      .channel(`mis-pedidos-${usuarioId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
      }, (payload) => {
        setMisPedidosList((prev) =>
          prev.map((p) => p.id === payload.new.id ? { ...p, estado: payload.new.estado } : p)
        )
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [pescaderiaId, usuarioId])

  // Si el usuario acaba de loguearse y hay carrito guardado, abrir checkout
  useEffect(() => {
    if (usuarioId && carrito.length > 0 && !verCheckout && !pedidoConfirmado) {
      setVerCheckout(true)
    }
  }, [usuarioId])

  async function invitar() {
    const texto = `Te invito a BlueMarket 🐟\n${linkInvitacion}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'BlueMarket', text: texto, url: linkInvitacion })
      } catch (e) { /* el usuario canceló */ }
    } else {
      try {
        await navigator.clipboard.writeText(linkInvitacion)
        setCopiadoInvite(true)
        setTimeout(() => setCopiadoInvite(false), 2000)
      } catch (e) { /* sin portapapeles */ }
    }
  }

  // Totales
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0)
  const totalPrecio = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-[420px] sm:max-h-[900px] sm:rounded-[40px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">

        <BarraUsuario perfil="consumidor" />

        {/* TOP BAR */}
        <div className="shrink-0 px-4 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 bg-white/[0.07] border border-white/12 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <span>🐟</span>
              <strong className="text-[11px] text-white">{pescaderia?.nombre || 'Pescadería'}</strong>
            </div>
            <div className="flex items-center gap-2">
              {usuarioId && (
                <button
                  onClick={() => setVerMisPedidos(true)}
                  className="relative w-10 h-10 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform">
                  <span className="text-white/70 text-lg">📦</span>
                  {misPedidosList.filter(p => !['entregado','cancelado'].includes(p.estado)).length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-[#f39c12] text-[#03174a] text-[9px] font-extrabold min-w-[17px] h-[17px] rounded-lg px-1 flex items-center justify-center">
                      {misPedidosList.filter(p => !['entregado','cancelado'].includes(p.estado)).length}
                    </div>
                  )}
                </button>
              )}
              <button
                onClick={() => setVerCarrito(true)}
                className="relative w-10 h-10 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform">
                <span className="text-white/70 text-lg">🛒</span>
                {totalItems > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-[#4db8ff] text-[#03174a] text-[9px] font-extrabold min-w-[17px] h-[17px] rounded-lg px-1 flex items-center justify-center"
                       style={{ boxShadow: '0 0 10px rgba(77,184,255,0.5)' }}>
                    {totalItems}
                  </div>
                )}
              </button>
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-white mb-0.5">
            Frescos de <span className="text-[#4db8ff]">hoy</span> 🌊
          </h1>
          <p className="text-[12px] text-white/45 mb-3.5">Recién llegados del mar a tu mesa</p>

          <div className="flex items-center gap-2.5 bg-white/10 border border-white/12 rounded-xl px-3.5 py-3 mb-3.5 backdrop-blur-sm">
            <span className="text-white/35">🔍</span>
            <span className="text-sm text-white/35">Buscar merluza, langostinos...</span>
          </div>

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 bm-no-scrollbar">
          {usuarioId && linkInvitacion && (
            <div className="flex items-center gap-3 bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-3 mb-3 mt-1">
              <div className="text-xl shrink-0">🤝</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white leading-tight">Invitá a tu gente</div>
                <div className="text-[11px] text-white/45">BlueMarket es una red por invitación</div>
              </div>
              <button
                onClick={invitar}
                className="shrink-0 bg-[#4db8ff] text-[#03174a] font-bold text-xs px-3.5 py-2 rounded-xl active:scale-95 transition-transform">
                {copiadoInvite ? '✓ Copiado' : 'Invitar'}
              </button>
            </div>
          )}
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
            <div className="flex flex-col gap-3">
              {productosFiltrados.map((p, idx) => {
                const enCarrito = carrito.find((i) => i.producto.id === p.id)
                return (
                  <div key={p.id}
                    className="bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-[#4db8ff]/50 flex items-center gap-3 pr-3"
                    style={{ animation: `bmFadeUp 0.4s ease both`, animationDelay: `${idx * 0.04}s` }}>
                    {/* Imagen */}
                    <div className="w-[78px] h-[78px] shrink-0 bg-[linear-gradient(135deg,#0a3a7a,#051e5c)] flex items-center justify-center text-3xl relative overflow-hidden">
                      <div className="absolute inset-0 opacity-30"
                           style={{ background: 'radial-gradient(circle at 70% 20%, rgba(125,211,252,0.4), transparent 60%)' }} />
                      <span className="relative">{p.emoji}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-3">
                      <div className="text-[13px] font-semibold text-white leading-tight truncate">{p.nombre}</div>
                      <div className="text-[10px] text-white/35 mt-0.5">
                        Por {p.unidad} · Stock: {p.stock}
                      </div>
                      <div className="text-[15px] font-extrabold text-[#4db8ff] mt-1">{fmt(p.precio)}</div>
                    </div>
                    {/* Controles */}
                    <div className="shrink-0">
                      {enCarrito ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => quitar(p.id)}
                            className="w-7 h-7 bg-white/10 rounded-lg text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all">
                            −
                          </button>
                          <span className="text-sm font-bold text-white w-5 text-center">{enCarrito.cantidad}</span>
                          <button onClick={() => agregar(p)}
                            className="w-7 h-7 bg-[#4db8ff] rounded-lg text-[#03174a] text-lg font-extrabold flex items-center justify-center active:scale-90 transition-all">
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => agregar(p)}
                          className="w-8 h-8 bg-[#4db8ff] rounded-lg text-[#03174a] text-xl font-extrabold flex items-center justify-center active:scale-90 transition-all hover:shadow-[0_0_14px_rgba(77,184,255,0.5)]"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* BARRA FLOTANTE "VER CARRITO" */}
        {totalItems > 0 && !verCarrito && (
          <div className="absolute bottom-4 left-4 right-4 z-20" style={{ animation: 'bmSlideUp 0.3s ease both' }}>
            <button
              onClick={() => setVerCarrito(true)}
              className="w-full bg-[#4db8ff] text-[#03174a] rounded-2xl px-5 py-3.5 flex items-center justify-between font-bold shadow-[0_8px_24px_rgba(77,184,255,0.4)] active:scale-[0.98] transition-transform">
              <span className="flex items-center gap-2">
                <span className="bg-[#03174a] text-white w-6 h-6 rounded-lg text-xs flex items-center justify-center">{totalItems}</span>
                Ver carrito
              </span>
              <span>{fmt(totalPrecio)}</span>
            </button>
          </div>
        )}

        {/* PANEL DEL CARRITO */}
        {verCarrito && (
          <div className="absolute inset-0 z-30 flex flex-col">
            {/* Fondo oscuro */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />

            {/* Panel deslizable desde abajo */}
            <div className="relative mt-auto bg-[#051e5c] border-t border-white/12 rounded-t-[28px] max-h-[85%] flex flex-col"
                 style={{ animation: 'bmSlideUp 0.35s ease both' }}>
              {/* Cabecera */}
              <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/8">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-white">Tu carrito 🛒</h2>
                  <button onClick={() => setVerCarrito(false)} className="text-white/40 text-2xl leading-none px-1">×</button>
                </div>
              </div>

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
                      <div key={item.producto.id} className="flex items-center gap-3 bg-white/[0.05] border border-white/8 rounded-2xl p-3">
                        <div className="w-12 h-12 rounded-xl bg-[linear-gradient(135deg,#0a3a7a,#051e5c)] flex items-center justify-center text-2xl shrink-0">
                          {item.producto.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{item.producto.nombre}</div>
                          <div className="text-xs text-[#4db8ff] font-bold mt-0.5">{fmt(item.producto.precio)} <span className="text-white/35 font-normal">/ {item.producto.unidad}</span></div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => quitar(item.producto.id)}
                            className="w-7 h-7 bg-white/10 rounded-lg text-white text-lg font-bold flex items-center justify-center active:scale-90">
                            −
                          </button>
                          <span className="text-sm font-bold text-white w-5 text-center">{item.cantidad}</span>
                          <button onClick={() => agregar(item.producto)}
                            className="w-7 h-7 bg-[#4db8ff] rounded-lg text-[#03174a] text-lg font-extrabold flex items-center justify-center active:scale-90">
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
                    onClick={() => { setVerCarrito(false); setErrorPedido(null); setVerCheckout(true) }}
                    className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform">
                    Continuar con el pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* CHECKOUT */}
        {verCheckout && (
          <Checkout
            carrito={carrito}
            cargando={guardando}
            errorExterno={errorPedido}
            soloDelivery={soloDelivery}
            ccHabilitada={ccHabilitada}
            modalidad={pescaderia?.modalidad}
            necesitaLogin={!usuarioId}
            onLogin={async () => {
              const supabase = createClient()
              // Guardar carrito para restaurarlo después del login
              try { sessionStorage.setItem('bm_carrito', JSON.stringify(carrito)) } catch {}
              // Guardar la URL actual para volver después del login
              document.cookie = `bm_return=${encodeURIComponent(window.location.pathname)};path=/;max-age=1800;samesite=lax`
              const slugActual = window.location.pathname.match(/^\/t\/([^/]+)/)?.[1] || ''
              // Guardamos el slug en localStorage como fallback extra (además de cookie)
              if (slugActual) localStorage.setItem('bm_slug_pendiente', slugActual)
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              })
            }}
            onVolver={() => { setVerCheckout(false); setErrorPedido(null); setVerCarrito(true) }}
            onConfirmar={async (datos) => {
              setGuardando(true)
              setErrorPedido(null)
              const resultado = await crearPedido(pescaderiaId, datos, carrito)
              setGuardando(false)
              if (resultado.error) {
                setErrorPedido(resultado.error)
                return
              }
              setVerCheckout(false)
              setNumeroPedido(resultado.numero)
              setPalabraClave(resultado.palabraClave)
              setPedidoConfirmado(true)
              setCarrito([])
              // Recargar mis pedidos
              misPedidos(pescaderiaId).then(r => r.pedidos && setMisPedidosList(r.pedidos))
            }}
          />
        )}


        {/* PANEL MIS PEDIDOS */}
        {verMisPedidos && (
          <div className="absolute inset-0 z-30 flex flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVerMisPedidos(false)} />
            <div className="relative mt-auto bg-[#051e5c] border-t border-white/12 rounded-t-[28px] max-h-[85%] flex flex-col"
                 style={{ animation: 'bmSlideUp 0.35s ease both' }}>
              <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/8">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-white">Mis pedidos 📦</h2>
                  <button onClick={() => setVerMisPedidos(false)} className="text-white/40 text-2xl leading-none px-1">×</button>
                </div>
              </div>
              {/* Contacto de la pescadería */}
              {(pescaderia?.telefono || pescaderia?.email) && (
                <div className="shrink-0 mx-5 mt-3 mb-1 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3">
                  <p className="text-[10px] text-white/40 uppercase tracking-wide font-bold mb-2">
                    Contactar a {pescaderia?.nombre}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {pescaderia?.telefono && (() => {
                      let n = String(pescaderia.telefono).replace(/\D/g, '')
                      if (n.startsWith('00')) n = n.slice(2)
                      if (n.startsWith('54')) {
                        let r = n.slice(2)
                        if (r.startsWith('0')) r = r.slice(1)
                        if (!r.startsWith('9')) r = '9' + r
                        n = '54' + r
                      } else {
                        if (n.startsWith('0')) n = n.slice(1)
                        n = '549' + n
                      }
                      return (
                        <a
                          href={`https://wa.me/${n}?text=${encodeURIComponent(`Hola ${pescaderia?.nombre || ''}, te escribo por mi pedido 🐟`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
                          💬 {pescaderia.telefono}
                        </a>
                      )
                    })()}
                    {pescaderia?.email && (
                      <a href={`mailto:${pescaderia.email}?subject=Consulta sobre mi pedido`}
                        className="flex items-center gap-1.5 bg-white/[0.07] border border-white/15 text-white/70 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
                        ✉️ {pescaderia.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-5 py-4 bm-no-scrollbar">
                {misPedidosList.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3 opacity-40">📦</div>
                    <p className="text-white/40 text-sm">Todavía no hiciste pedidos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {misPedidosList.map((p) => {
                      const colores = {
                        nuevo: { bg: '#4db8ff22', color: '#4db8ff', emoji: '🆕' },
                        preparando: { bg: '#f39c1222', color: '#f39c12', emoji: '👨‍🍳' },
                        listo: { bg: '#2ecc7122', color: '#2ecc71', emoji: '✅' },
                        en_camino: { bg: '#9b59b622', color: '#9b59b6', emoji: '🛵' },
                        entregado: { bg: '#2ecc7122', color: '#2ecc71', emoji: '🎉' },
                        cancelado: { bg: '#e74c3c22', color: '#e74c3c', emoji: '❌' },
                      }
                      const est = colores[p.estado] || colores.nuevo
                      return (
                        <div key={p.id} className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-white">#{p.numero}</span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: est.bg, color: est.color }}>
                              {est.emoji} {p.estado.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-white/40 mb-2">
                            {new Date(p.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {p.items?.map((it, i) => (
                            <div key={i} className="text-xs text-white/60">{it.cantidad}× {it.nombre}</div>
                          ))}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-base font-extrabold text-[#4db8ff]">
                              ${Number(p.total).toLocaleString('es-AR')}
                            </div>
                            {p.palabra_clave && !['entregado','cancelado'].includes(p.estado) && (
                              <div className="bg-white/[0.07] border border-white/15 rounded-xl px-3 py-1.5 text-right">
                                <div className="text-[9px] text-white/40 uppercase tracking-wide">🔑 Clave</div>
                                <div className="text-sm font-extrabold text-[#4db8ff] tracking-wider">{p.palabra_clave}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {pedidoConfirmado && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)] px-8 text-center"
               style={{ animation: 'bmFadeUp 0.4s ease both' }}>
            <div className="w-24 h-24 rounded-full bg-[#2ecc71]/15 border-2 border-[#2ecc71] flex items-center justify-center text-5xl mb-6"
                 style={{ animation: 'bmFloat 3s ease-in-out infinite' }}>
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">¡Pedido confirmado!</h1>
            {numeroPedido && (
              <div className="text-[#4db8ff] font-bold text-lg mb-3">Pedido #{numeroPedido}</div>
            )}
            {palabraClave && (
              <div className="bg-white/[0.07] border border-white/15 rounded-2xl px-6 py-4 mb-5 w-full">
                <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1">Tu palabra clave 🔑</div>
                <div className="text-2xl font-extrabold text-[#4db8ff] tracking-wider">{palabraClave}</div>
                <div className="text-[11px] text-white/40 mt-1.5">Guardala — te la van a pedir al entregar el pedido</div>
              </div>
            )}
            <p className="text-white/55 text-sm leading-relaxed mb-8">
              Tu pedido fue recibido. La pescadería lo va a preparar y te avisará cuando esté listo. 🐟
            </p>
            <button
              onClick={() => setPedidoConfirmado(false)}
              className="bg-[#4db8ff] text-[#03174a] font-bold px-8 py-3 rounded-xl active:scale-95 transition-transform">
              Volver a la tienda
            </button>
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  )
}
