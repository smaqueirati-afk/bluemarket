'use client'

import { useState, useEffect } from 'react'
import Checkout from './Checkout'
import { crearPedido, crearPreferenciaMP, misPedidos } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'
import { createClient } from '../../../lib/supabase/client'

export default function TiendaCliente({ productos, usuarioId, pescaderiaId, ccHabilitada, soloDelivery, pescaderia, retorno }) {

  // Textos y emojis según el rubro de la tienda
  const TEXTOS_RUBRO = {
    'pescadería': { titulo: 'Frescos de hoy 🌊', subtitulo: 'Recién llegados del mar a tu mesa', buscar: 'Buscar merluza, langostinos...' },
    'quesería':   { titulo: 'Lácteos frescos 🐄', subtitulo: 'Selección de quesos y lácteos artesanales', buscar: 'Buscar brie, mozzarella...' },
    'carnicería': { titulo: 'Cortes del día 🥩', subtitulo: 'Carnes frescas directo al mostrador', buscar: 'Buscar asado, bife...' },
    'verdulería': { titulo: 'Verduras de hoy 🌿', subtitulo: 'Frescas de la quinta a tu mesa', buscar: 'Buscar tomate, lechuga...' },
    'panadería':  { titulo: 'Recién horneado 🥖', subtitulo: 'Pan y facturas del día', buscar: 'Buscar pan, medialunas...' },
    'rotisería':  { titulo: 'Listo para comer 🍗', subtitulo: 'Comida casera recién hecha', buscar: 'Buscar pollo, milanesa...' },
    'almacén':    { titulo: 'Productos del día 🛒', subtitulo: 'Todo lo que necesitás en un lugar', buscar: 'Buscar arroz, aceite...' },
  }
  const txRubro = TEXTOS_RUBRO[pescaderia?.rubro] || { titulo: 'Productos de hoy 🛍️', subtitulo: 'Todo para vos', buscar: 'Buscar productos...' }
  // carrito = array de { producto, cantidad }
  const [carrito, setCarrito] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('bm_carrito')
      if (saved) return JSON.parse(saved)
    } catch {}
    return []
  })
  const [categoria, setCategoria] = useState('todo')
  const [busqueda, setBusqueda] = useState('')
  const [verCarrito, setVerCarrito] = useState(false)
  const [verCheckout, setVerCheckout] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [palabraClave, setPalabraClave] = useState(null)
  const [metodoPagoConfirmado, setMetodoPagoConfirmado] = useState(null)
  const [confirmadoTienePeso, setConfirmadoTienePeso] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorPedido, setErrorPedido] = useState(null)
  const [logroNivel, setLogroNivel] = useState(null) // animación de logro post-compra
  const [copiadoInvite, setCopiadoInvite] = useState(false)
  const [misPedidosList, setMisPedidosList] = useState([])
  const [verMisPedidos, setVerMisPedidos] = useState(false)

  const emojiTienda = pescaderia?.emoji_rubro || '🛒'
  const categorias = [
    { id: 'todo', emoji: emojiTienda, label: 'Todo' },
    { id: 'lacteos', emoji: '🧀', label: 'Lácteos' },
    { id: 'pescado', emoji: '🐡', label: 'Pescado' },
    { id: 'mariscos', emoji: '🦐', label: 'Mariscos' },
    { id: 'carnes', emoji: '🥩', label: 'Carnes' },
    { id: 'fiambres', emoji: '🍖', label: 'Fiambres' },
    { id: 'verduras', emoji: '🥦', label: 'Verduras' },
    { id: 'panaderia', emoji: '🥖', label: 'Panadería' },
    { id: 'congelados', emoji: '❄️', label: 'Congelados' },
    { id: 'bebidas', emoji: '🧃', label: 'Bebidas' },
    { id: 'otros', emoji: '📦', label: 'Otros' },
  ]

  // Normaliza para buscar sin tildes ni mayúsculas
  function normalizar(t) {
    return (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Solo mostramos las categorías que la tienda realmente tiene (+ "Todo")
  const idsConProductos = new Set(productos.map((p) => p.categoria))
  const categoriasVisibles = categorias.filter((c) => c.id === 'todo' || idsConProductos.has(c.id))

  const q = normalizar(busqueda)
  const productosFiltrados = productos.filter((p) => {
    const okCat = categoria === 'todo' || p.categoria === categoria
    const okBusq = q === '' || normalizar(p.nombre).includes(q)
    return okCat && okBusq
  })

  // ── Funciones del carrito ──
  // Paso de cantidad: productos por kg van de a ¼ (0.25); el resto de a 1
  function stepDe(producto) {
    return producto?.unidad === 'kg' ? 0.25 : 1
  }

  function agregar(producto) {
    const paso = stepDe(producto)
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: +(item.cantidad + paso).toFixed(2) }
            : item
        )
      }
      return [...prev, { producto, cantidad: paso }]
    })
  }

  function quitar(productoId) {
    setCarrito((prev) => {
      const item = prev.find((i) => i.producto.id === productoId)
      if (!item) return prev
      const paso = stepDe(item.producto)
      if (item.cantidad - paso > 0.001) {
        return prev.map((i) =>
          i.producto.id === productoId ? { ...i, cantidad: +(i.cantidad - paso).toFixed(2) } : i
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

  // Cantidad corta para los steppers: "¼", "½", "1¼"... en kg; el número en el resto
  function fmtCantCorto(c, unidad) {
    if (unidad !== 'kg') return String(c)
    const entero = Math.floor(c + 1e-9)
    const frac = +(c - entero).toFixed(2)
    const simb = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[frac]
    if (simb === undefined) return c.toLocaleString('es-AR')
    if (entero === 0) return simb
    return `${entero}${simb}`
  }

  // Igual que la anterior pero aclara "kg" en productos por peso (más claro para mayores)
  function fmtCantPaso(c, unidad) {
    if (unidad !== 'kg') return String(c)
    return fmtCantCorto(c, 'kg') + ' kg'
  }

  // ¿Hay algún producto que se vende por peso? -> el total pasa a ser estimado
  const hayPorPeso = carrito.some((i) => i.producto.unidad === 'kg')

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
          prev.map((p) => p.id === payload.new.id ? { ...p, estado: payload.new.estado, total_final: payload.new.total_final, pesado: payload.new.pesado } : p)
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

  // Persistir el carrito en localStorage para que sobreviva el login con Google
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (carrito.length > 0) localStorage.setItem('bm_carrito', JSON.stringify(carrito))
      else localStorage.removeItem('bm_carrito')
    } catch {}
  }, [carrito])

  async function invitar() {
    const texto = `Te invito a comprar en ${pescaderia?.nombre || 'BlueMarket'} ${pescaderia?.emoji_rubro || ''}\n${linkInvitacion}`
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
            <div className="flex items-center gap-1.5 bg-white/[0.07] border border-white/12 rounded-full px-3 py-1.5 backdrop-blur-sm min-w-0">
              <span className="shrink-0">{pescaderia?.emoji_rubro || '🛒'}</span>
              <strong className="text-[12px] text-white truncate">{pescaderia?.nombre || 'Pescadería'}</strong>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {usuarioId && (
                <button
                  onClick={() => setVerMisPedidos(true)}
                  className="relative flex items-center gap-1.5 h-10 px-3 bg-white/[0.07] border border-white/12 rounded-xl backdrop-blur-sm active:scale-95 transition-transform">
                  <span className="text-lg">📦</span>
                  <span className="text-xs font-bold text-white/85">Pedidos</span>
                  {misPedidosList.filter(p => !['entregado','cancelado'].includes(p.estado)).length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-[#f39c12] text-[#03174a] text-[10px] font-extrabold min-w-[18px] h-[18px] rounded-lg px-1 flex items-center justify-center">
                      {misPedidosList.filter(p => !['entregado','cancelado'].includes(p.estado)).length}
                    </div>
                  )}
                </button>
              )}
              <button
                onClick={() => setVerCarrito(true)}
                className="relative flex items-center gap-1.5 h-10 px-3 bg-white/[0.07] border border-white/12 rounded-xl backdrop-blur-sm active:scale-95 transition-transform">
                <span className="text-lg">🛒</span>
                <span className="text-xs font-bold text-white/85">Carrito</span>
                {totalItems > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-[#4db8ff] text-[#03174a] text-[10px] font-extrabold min-w-[18px] h-[18px] rounded-lg px-1 flex items-center justify-center"
                       style={{ boxShadow: '0 0 10px rgba(77,184,255,0.5)' }}>
                    {totalItems}
                  </div>
                )}
              </button>
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-white mb-0.5">
            {txRubro.titulo}
          </h1>
          <p className="text-sm text-white/55 mb-3.5">{txRubro.subtitulo}</p>

          <div className="flex items-center gap-2.5 bg-white/10 border border-white/12 rounded-xl px-3.5 py-3 mb-3.5 backdrop-blur-sm focus-within:border-[#4db8ff]/60">
            <span className="text-white/45 text-lg">🔍</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={txRubro.buscar}
              className="flex-1 bg-transparent text-base text-white placeholder-white/40 outline-none"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} aria-label="Borrar búsqueda"
                className="text-white/50 text-2xl leading-none px-1">×</button>
            )}
          </div>

          {categoriasVisibles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 bm-no-scrollbar">
            {categoriasVisibles.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${
                  categoria === cat.id
                    ? 'bg-[#4db8ff]/15 border-[#4db8ff] text-[#4db8ff]'
                    : 'bg-white/[0.06] border-white/10 text-white/55 hover:border-white/25'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          )}
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
              <div className="text-4xl mb-3 opacity-40">{pescaderia?.emoji_rubro || '🛒'}</div>
              <p className="text-white/55 text-base">{busqueda ? `No encontramos "${busqueda}".` : 'No hay productos en esta categoría.'}</p>
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
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nombre} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 opacity-30"
                               style={{ background: 'radial-gradient(circle at 70% 20%, rgba(125,211,252,0.4), transparent 60%)' }} />
                          <span className="relative">{p.emoji}</span>
                        </>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-3">
                      <div className="text-base font-semibold text-white leading-tight truncate">{p.nombre}</div>
                      <div className="text-[13px] text-white/55 mt-0.5">
                        Por {p.unidad === 'kg' ? 'kilo' : p.unidad}
                      </div>
                      <div className="text-xl font-extrabold text-[#4db8ff] mt-1">{fmt(p.precio)}</div>
                    </div>
                    {/* Controles */}
                    <div className="shrink-0">
                      {enCarrito ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => quitar(p.id)} aria-label="Quitar"
                            className="w-11 h-11 bg-white/10 rounded-xl text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-all">
                            −
                          </button>
                          <span className="text-base font-bold text-white min-w-[3.5rem] text-center px-0.5">{fmtCantPaso(enCarrito.cantidad, p.unidad)}</span>
                          <button onClick={() => agregar(p)} aria-label="Agregar"
                            className="w-11 h-11 bg-[#4db8ff] rounded-xl text-[#03174a] text-2xl font-extrabold flex items-center justify-center active:scale-90 transition-all">
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => agregar(p)} aria-label="Agregar al carrito"
                          className="w-12 h-12 bg-[#4db8ff] rounded-xl text-[#03174a] text-3xl font-extrabold flex items-center justify-center active:scale-90 transition-all hover:shadow-[0_0_14px_rgba(77,184,255,0.5)]"
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
              className="w-full bg-[#4db8ff] text-[#03174a] rounded-2xl px-5 py-4 flex items-center justify-between font-extrabold text-lg shadow-[0_8px_24px_rgba(77,184,255,0.4)] active:scale-[0.98] transition-transform">
              <span className="flex items-center gap-2">
                <span className="bg-[#03174a] text-white w-7 h-7 rounded-lg text-sm flex items-center justify-center">{totalItems}</span>
                Ver carrito
              </span>
              <span>{hayPorPeso ? '~' : ''}{fmt(totalPrecio)}</span>
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
                          <div className="text-base font-semibold text-white truncate">{item.producto.nombre}</div>
                          <div className="text-sm text-[#4db8ff] font-bold mt-0.5">{fmt(item.producto.precio)} <span className="text-white/45 font-normal">/ {item.producto.unidad}</span></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => quitar(item.producto.id)} aria-label="Quitar"
                            className="w-11 h-11 bg-white/10 rounded-xl text-white text-2xl font-bold flex items-center justify-center active:scale-90">
                            −
                          </button>
                          <span className="text-base font-bold text-white min-w-[3.5rem] text-center px-0.5">{fmtCantPaso(item.cantidad, item.producto.unidad)}</span>
                          <button onClick={() => agregar(item.producto)} aria-label="Agregar"
                            className="w-11 h-11 bg-[#4db8ff] rounded-xl text-[#03174a] text-2xl font-extrabold flex items-center justify-center active:scale-90">
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
                    <span className="text-white/55 text-sm">{hayPorPeso ? 'Total estimado' : 'Total'}</span>
                    <span className="text-2xl font-extrabold text-white">{hayPorPeso ? '~' : ''}{fmt(totalPrecio)}</span>
                  </div>
                  {hayPorPeso && (
                    <p className="text-[11px] text-white/45 leading-snug -mt-1.5 mb-3 flex items-start gap-1.5">
                      <span className="shrink-0">⚖️</span>
                      <span>Los productos por kg se pesan al preparar el pedido. El importe final puede variar (más o menos) según el corte.</span>
                    </p>
                  )}
                  <button
                    onClick={() => { setVerCarrito(false); setErrorPedido(null); setVerCheckout(true) }}
                    className="w-full bg-[#4db8ff] text-[#03174a] font-extrabold text-lg py-4 rounded-xl active:scale-[0.98] transition-transform">
                    Finalizar compra
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
            envioModo={pescaderia?.envio_modo}
            envioGratisDesde={pescaderia?.envio_gratis_desde}
            mpActivo={pescaderia?.mp_activo}
            aliasPago={pescaderia?.alias_pago}
            retorno={retorno}
            necesitaLogin={!usuarioId}
            onLogin={async () => {
              const supabase = createClient()
              // Guardar carrito para restaurarlo después del login (localStorage sobrevive el redirect de OAuth)
              try { localStorage.setItem('bm_carrito', JSON.stringify(carrito)) } catch {}
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
              try {
                const resultado = await crearPedido(pescaderiaId, datos, carrito)
                if (resultado?.error) {
                  setErrorPedido(resultado.error)
                  return
                }
                // Si paga con Mercado Pago, ir a pagar antes de mostrar la confirmación
                if (datos.pago === 'mercadopago') {
                  const pref = await crearPreferenciaMP(resultado.pedidoId)
                  if (pref?.init_point) {
                    setCarrito([])
                    window.location.href = pref.init_point
                    return
                  }
                  setErrorPedido(pref?.error || 'No se pudo iniciar el pago. El pedido quedó pendiente; coordiná con el local.')
                  return
                }
                setVerCheckout(false)
                setNumeroPedido(resultado.numero)
                setPalabraClave(resultado.palabraClave)
                setMetodoPagoConfirmado(datos.pago)
                setConfirmadoTienePeso(hayPorPeso)
                setPedidoConfirmado(true)
                setCarrito([])
                if (resultado.logroNivel) setLogroNivel(resultado.logroNivel)
                // Recargar mis pedidos
                misPedidos(pescaderiaId).then(r => r.pedidos && setMisPedidosList(r.pedidos))
              } catch (e) {
                setErrorPedido('No se pudo confirmar el pedido. Probá de nuevo en un momento.')
              } finally {
                setGuardando(false)
              }
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
                          href={`https://wa.me/${n}?text=${encodeURIComponent(`Hola ${pescaderia?.nombre || ''}, te escribo por mi pedido ${pescaderia?.emoji_rubro || ''}`)}`}
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
                      const tienePeso = p.items?.some((it) => it.unidad === 'kg')
                      const pesado = !!p.pesado
                      const enProceso = !['entregado', 'cancelado'].includes(p.estado)
                      const puedePagar = !tienePeso || pesado
                      const cardStyle = !enProceso
                        ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }
                        : puedePagar
                          ? { background: 'rgba(46,204,113,0.08)', borderColor: 'rgba(46,204,113,0.45)' }
                          : { background: 'rgba(231,76,60,0.08)', borderColor: 'rgba(231,76,60,0.45)' }
                      return (
                        <div key={p.id} className="border rounded-2xl p-4" style={cardStyle}>
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

                          {/* Banner de estado de pago */}
                          {enProceso && !puedePagar && (
                            <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2"
                                 style={{ background: '#e74c3c22', border: '1px solid #e74c3c55' }}>
                              <span className="text-xl">⏳</span>
                              <div>
                                <div className="text-xs font-extrabold text-[#e74c3c]">Esperando que pesen tu pedido</div>
                                <div className="text-[10px] text-white/55 mt-0.5">Cuando el local confirme el peso vas a ver el total final y el alias para pagar.</div>
                              </div>
                            </div>
                          )}
                          {enProceso && puedePagar && (() => {
                            const totalMostrar = p.total_final ?? p.total
                            return (
                              <div className="mt-3 rounded-xl px-4 py-3.5"
                                   style={{ background: '#2ecc7118', border: '1px solid #2ecc7155' }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-2xl">✅</span>
                                  <span className="text-base font-extrabold text-[#2ecc71]">Listo para pagar</span>
                                </div>
                                <div className="text-white text-lg font-extrabold mb-2">
                                  Total: ${Number(totalMostrar).toLocaleString('es-AR')}
                                </div>

                                {pescaderia?.alias_pago ? (
                                  <div className="bg-white/[0.08] border border-white/15 rounded-xl px-4 py-3">
                                    <div className="text-sm text-white/70 mb-1">Transferí a este alias:</div>
                                    <div className="text-lg font-extrabold text-white break-all leading-tight mb-3">{pescaderia.alias_pago}</div>
                                    <button type="button"
                                      onClick={() => { navigator.clipboard?.writeText(pescaderia.alias_pago) }}
                                      className="w-full text-center text-base font-bold text-[#03174a] bg-[#4db8ff] rounded-xl py-3 active:scale-[0.98] transition-transform">
                                      📋 Copiar alias
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-sm text-white/75">
                                    Coordiná el pago con el local al retirar tu pedido.
                                  </div>
                                )}
                              </div>
                            )
                          })()}

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
        {/* ══ ANIMACIÓN DE LOGRO ══ */}
        {pedidoConfirmado && logroNivel && (
          <div
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a3a6e 0%, #03174a 100%)' }}
            onClick={() => setLogroNivel(null)}
          >
            {/* Confetti CSS */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
              {[...Array(18)].map((_, i) => (
                <span key={i} className="absolute text-xl"
                  style={{
                    left: `${(i * 5.5 + 3) % 100}%`,
                    top: '-10%',
                    animation: `bmConfetti ${1.8 + (i % 4) * 0.4}s ${(i * 0.18) % 1.6}s ease-in forwards`,
                    opacity: 0,
                  }}>
                  {['⭐','✨','🌟','💫','🎊','🎉'][i % 6]}
                </span>
              ))}
            </div>

            {/* Medalla del nivel */}
            <div style={{ animation: 'bmLogroPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div className="text-7xl mb-1">
                {{ bronce: '🥉', plata: '🥈', oro: '🥇', diamante: '💎' }[logroNivel.nivel] || '🏆'}
              </div>
            </div>

            <div className="mt-4 mb-2" style={{ animation: 'bmFadeUp 0.5s 0.3s ease both', opacity: 0 }}>
              <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#4db8ff] mb-1">
                ¡Nivel alcanzado!
              </div>
              <h2 className="text-3xl font-extrabold text-white capitalize">{logroNivel.nivel}</h2>
            </div>

            <div className="mt-4 bg-white/[0.08] border border-white/15 rounded-2xl px-6 py-4 w-full max-w-xs"
                 style={{ animation: 'bmFadeUp 0.5s 0.5s ease both', opacity: 0 }}>
              <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1">Tu descuento en la próxima compra</div>
              <div className="text-3xl font-extrabold text-[#2ecc71]">
                −${Math.round(logroNivel.disponible).toLocaleString('es-AR')}
              </div>
              <div className="text-[12px] text-white/55 mt-1">
                {logroNivel.pct}% de retorno · nivel {logroNivel.nivel}
              </div>
            </div>

            <p className="text-white/35 text-[12px] mt-6" style={{ animation: 'bmFadeUp 0.5s 0.8s ease both', opacity: 0 }}>
              Tocá para continuar
            </p>
          </div>
        )}

        {pedidoConfirmado && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)] px-6 text-center overflow-y-auto"
               style={{ animation: 'bmFadeUp 0.4s ease both' }}>
            <div className="w-24 h-24 rounded-full bg-[#2ecc71]/15 border-2 border-[#2ecc71] flex items-center justify-center text-5xl mb-5"
                 style={{ animation: 'bmFloat 3s ease-in-out infinite' }}>
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">¡Pedido confirmado!</h1>
            {numeroPedido && (
              <div className="text-[#4db8ff] font-bold text-lg mb-4">Pedido #{numeroPedido}</div>
            )}

            {/* Palabra clave */}
            {palabraClave && (
              <div className="bg-white/[0.07] border border-white/15 rounded-2xl px-5 py-3.5 mb-4 w-full text-left">
                <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1">🔑 Tu palabra clave</div>
                <div className="text-xl font-extrabold text-[#4db8ff] tracking-wider">{palabraClave}</div>
                <div className="text-[11px] text-white/40 mt-1">Te la van a pedir al entregar el pedido</div>
              </div>
            )}

            {/* Datos de pago si eligió transferencia */}
            {metodoPagoConfirmado === 'transferencia' && confirmadoTienePeso && (
              <div className="bg-[#f39c12]/10 border border-[#f39c12]/30 rounded-2xl px-5 py-4 mb-4 w-full text-left"
                   style={{ animation: 'bmFadeUp 0.5s ease both' }}>
                <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1">🏦 Pago por transferencia</div>
                <div className="text-sm font-bold text-white mb-1">El alias se habilita después del pesaje</div>
                <div className="text-[12px] text-white/55">Tu pedido tiene productos por peso. Cuando el local confirme el peso vas a ver el total final y el alias para transferir en “Mis pedidos”.</div>
              </div>
            )}
            {(metodoPagoConfirmado === 'transferencia' || metodoPagoConfirmado === 'mercadopago') && !confirmadoTienePeso && pescaderia?.alias_pago && (
              <div className="bg-[#4db8ff]/10 border border-[#4db8ff]/30 rounded-2xl px-5 py-4 mb-4 w-full text-left"
                   style={{ animation: 'bmFadeUp 0.5s ease both' }}>
                <div className="text-[11px] text-white/45 uppercase tracking-wide mb-1">
                  {metodoPagoConfirmado === 'transferencia' ? '🏦 Datos para transferir' : '💳 Link / Alias de pago'}
                </div>
                <div className="text-sm font-bold text-white break-all mb-3">{pescaderia.alias_pago}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(pescaderia.alias_pago)}
                    className="flex-1 bg-[#4db8ff]/15 border border-[#4db8ff]/30 text-[#4db8ff] text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                    📋 Copiar alias
                  </button>
                  {pescaderia?.telefono && (() => {
                    let n = String(pescaderia.telefono).replace(/\D/g, '')
                    if (n.startsWith('54')) { let r = n.slice(2); if (r.startsWith('0')) r = r.slice(1); if (!r.startsWith('9')) r = '9' + r; n = '54' + r }
                    else { if (n.startsWith('0')) n = n.slice(1); n = '549' + n }
                    const msg = encodeURIComponent(`Hola ${pescaderia?.nombre || ''}! Te envío el comprobante de pago del pedido #${numeroPedido} ${pescaderia?.emoji_rubro || ''}`)
                    return (
                      <a href={`https://wa.me/${n}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1">
                        💬 Enviar comprobante
                      </a>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Si no tiene alias pero eligió transferencia */}
            {(metodoPagoConfirmado === 'transferencia') && !confirmadoTienePeso && !pescaderia?.alias_pago && pescaderia?.telefono && (() => {
              let n = String(pescaderia.telefono).replace(/\D/g, '')
              if (n.startsWith('54')) { let r = n.slice(2); if (r.startsWith('0')) r = r.slice(1); if (!r.startsWith('9')) r = '9' + r; n = '54' + r }
              else { if (n.startsWith('0')) n = n.slice(1); n = '549' + n }
              const msg = encodeURIComponent(`Hola ${pescaderia?.nombre || ''}! Hice el pedido #${numeroPedido}. ¿Me pasás los datos para transferir? ${pescaderia?.emoji_rubro || ''}`)
              return (
                <a href={`https://wa.me/${n}?text=${msg}`} target="_blank" rel="noopener noreferrer"
                  className="w-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-sm font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 mb-4">
                  💬 Pedir datos de pago por WhatsApp
                </a>
              )
            })()}

            <p className="text-white/55 text-sm leading-relaxed mb-6">
              {pescaderia?.nombre || 'La tienda'} va a preparar tu pedido y te va a contactar para coordinar. {pescaderia?.emoji_rubro || ''}
            </p>
            <button
              onClick={() => setPedidoConfirmado(false)}
              className="bg-[#4db8ff] text-[#03174a] font-extrabold text-base px-8 py-3.5 rounded-xl active:scale-95 transition-transform w-full">
              Volver a la tienda
            </button>
          </div>
        )}

      </div>

<style dangerouslySetInnerHTML={{ __html: `
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes bmLogroPop { from { opacity:0; transform: scale(0.4) rotate(-15deg); } to { opacity:1; transform: scale(1) rotate(0deg); } }
        @keyframes bmConfetti { 0% { opacity:1; transform: translateY(0) rotate(0deg); } 100% { opacity:0; transform: translateY(110vh) rotate(720deg); } }
      `}} />
    </div>
  )
}
