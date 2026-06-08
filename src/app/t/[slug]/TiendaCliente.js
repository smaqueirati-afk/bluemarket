'use client'

import { useState, useEffect } from 'react'
import Checkout from './Checkout'
import CarritoPanel from './CarritoPanel'
import MisPedidosPanel from './MisPedidosPanel'
import ProductoCard from './ProductoCard'
import BarraUsuario from '../../../components/BarraUsuario'
import { createClient } from '../../../lib/supabase/client'
import { crearPedido, misPedidos } from './actions'

export default function TiendaCliente({ productos, pescaderia, ccHabilitada }) {
  // ── Estado global ──
  const [carrito, setCarrito] = useState([])
  const [categoria, setCategoria] = useState('todo')
  const [verCarrito, setVerCarrito] = useState(false)
  const [verCheckout, setVerCheckout] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorPedido, setErrorPedido] = useState(null)
  const [necesitaLogin, setNecesitaLogin] = useState(false)
  const [verMisPedidos, setVerMisPedidos] = useState(false)
  const [misPedidosLista, setMisPedidosLista] = useState(null)

  const categorias = [
    { id: 'todo',       emoji: '🐟', label: 'Todo' },
    { id: 'mariscos',   emoji: '🦐', label: 'Mariscos' },
    { id: 'pescado',    emoji: '🐡', label: 'Pescado' },
    { id: 'moluscos',   emoji: '🦑', label: 'Moluscos' },
    { id: 'congelados', emoji: '❄️', label: 'Congelados' },
  ]

  const productosFiltrados =
    categoria === 'todo' ? productos : productos.filter((p) => p.categoria === categoria)

  // ── Totales ──
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0)
  const totalPrecio = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  // ── Info de entrega del top bar ──
  const esReparto = pescaderia?.modalidad === 'solo_reparto' || pescaderia?.modalidad === 'local_reparto'
  const dir = pescaderia?.direccion?.trim()
  let entregaIcono, entregaLabel, entregaValor
  if (esReparto) {
    entregaIcono = '🛵'; entregaLabel = null; entregaValor = 'Envíos a domicilio'
  } else if (dir) {
    entregaIcono = '📍'; entregaLabel = 'Retirás en'; entregaValor = dir
  } else {
    entregaIcono = '📍'; entregaLabel = null; entregaValor = 'Retiro en el local'
  }

  // ── Recuperar carrito guardado al volver del login ──
  useEffect(() => {
    try {
      const guardado = localStorage.getItem('_bm_carrito_' + (pescaderia?.slug || ''))
      if (guardado) {
        const items = JSON.parse(guardado)
        if (Array.isArray(items) && items.length > 0) setCarrito(items)
        localStorage.removeItem('_bm_carrito_' + (pescaderia?.slug || ''))
      }
    } catch (e) {}
  }, [])

  // ── Login con Google ──
  async function iniciarSesion() {
    try {
      localStorage.setItem('_bm_carrito_' + (pescaderia?.slug || ''), JSON.stringify(carrito))
    } catch (e) {}
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  // ── Funciones del carrito ──
  function agregar(producto) {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
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

  // ── Mis pedidos ──
  async function abrirMisPedidos() {
    setVerMisPedidos(true)
    setMisPedidosLista(null)
    const res = await misPedidos(pescaderia?.id)
    setMisPedidosLista(res.pedidos || [])
  }

  // ── Confirmar pedido ──
  async function handleConfirmar(datos) {
    setGuardando(true)
    setErrorPedido(null)
    const resultado = await crearPedido(pescaderia?.id, datos, carrito)
    setGuardando(false)
    if (resultado.error) {
      setErrorPedido(resultado.error)
      // Si hay problema de stock, volver al carrito para que el cliente lo vea
      if (resultado.stockInvalido) {
        setVerCheckout(false)
        setVerCarrito(true)
        return
      }
      const msg = resultado.error.toLowerCase()
      if (msg.includes('sesión') || msg.includes('sesion') || msg.includes('autenticad')) {
        setNecesitaLogin(true)
      }
      return
    }
    setVerCheckout(false)
    setNumeroPedido(resultado.numero)
    setPedidoConfirmado(true)
    setCarrito([])
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-[420px] sm:max-h-[900px] sm:rounded-[40px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">

        <BarraUsuario perfil="consumidor" />

        {/* TOP BAR */}
        <div className="shrink-0 px-4 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 bg-white/[0.07] border border-white/12 rounded-full px-3 py-1.5 backdrop-blur-sm max-w-[62%] min-w-0">
              <span className="shrink-0">{entregaIcono}</span>
              {entregaLabel && <span className="text-[11px] text-white/55 shrink-0">{entregaLabel}</span>}
              <strong className="text-[11px] text-white truncate">{entregaValor}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={abrirMisPedidos}
                className="h-10 px-3 bg-white/[0.07] border border-white/12 rounded-xl flex items-center gap-1.5 backdrop-blur-sm active:scale-95 transition-transform"
              >
                <span className="text-base">📋</span>
                <span className="text-[12px] text-white/70 font-medium">Mis pedidos</span>
              </button>
              <button
                onClick={() => setVerCarrito(true)}
                className="relative w-10 h-10 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
              >
                <span className="text-white/70 text-lg">🛒</span>
                {totalItems > 0 && (
                  <div
                    className="absolute -top-1.5 -right-1.5 bg-[#4db8ff] text-[#03174a] text-[9px] font-extrabold min-w-[17px] h-[17px] rounded-lg px-1 flex items-center justify-center"
                    style={{ boxShadow: '0 0 10px rgba(77,184,255,0.5)' }}
                  >
                    {totalItems}
                  </div>
                )}
              </button>
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-white mb-0.5">
            {pescaderia?.nombre || 'BlueMarket'} 🌊
          </h1>
          <p className="text-[12px] text-white/45 mb-3.5">Frescos del mar a tu mesa</p>

          {/* Buscador (decorativo por ahora) */}
          <div className="flex items-center gap-2.5 bg-white/10 border border-white/12 rounded-xl px-3.5 py-3 mb-3.5 backdrop-blur-sm">
            <span className="text-white/35">🔍</span>
            <span className="text-sm text-white/35">Buscar merluza, langostinos...</span>
          </div>

          {/* Filtros de categoría */}
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

        {/* CATÁLOGO */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 bm-no-scrollbar">
          <div className="text-[13px] font-bold text-white mb-3 mt-1">
            {categoria === 'todo' ? 'Catálogo completo' : categorias.find((c) => c.id === categoria)?.label}
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
                <ProductoCard
                  key={p.id}
                  producto={p}
                  idx={idx}
                  enCarrito={carrito.find((i) => i.producto.id === p.id)}
                  onAgregar={agregar}
                  onQuitar={quitar}
                />
              ))}
            </div>
          )}
        </div>

        {/* BARRA FLOTANTE "VER CARRITO" */}
        {totalItems > 0 && !verCarrito && (
          <div className="absolute bottom-4 left-4 right-4 z-20" style={{ animation: 'bmSlideUp 0.3s ease both' }}>
            <button
              onClick={() => setVerCarrito(true)}
              className="w-full bg-[#4db8ff] text-[#03174a] rounded-2xl px-5 py-3.5 flex items-center justify-between font-bold shadow-[0_8px_24px_rgba(77,184,255,0.4)] active:scale-[0.98] transition-transform"
            >
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
          <CarritoPanel
            carrito={carrito}
            error={errorPedido}
            onCerrar={() => { setVerCarrito(false); setErrorPedido(null) }}
            onAgregar={agregar}
            onQuitar={quitar}
            onIrCheckout={() => { setVerCarrito(false); setVerCheckout(true) }}
          />
        )}

        {/* CHECKOUT */}
        {verCheckout && (
          <Checkout
            ccHabilitada={ccHabilitada}
            carrito={carrito}
            cargando={guardando}
            errorExterno={errorPedido}
            necesitaLogin={necesitaLogin}
            onLogin={iniciarSesion}
            onVolver={() => { setVerCheckout(false); setVerCarrito(true) }}
            onConfirmar={handleConfirmar}
          />
        )}

        {/* PANEL MIS PEDIDOS */}
        {verMisPedidos && (
          <MisPedidosPanel
            pedidos={misPedidosLista}
            onCerrar={() => setVerMisPedidos(false)}
          />
        )}

        {/* CONFIRMACIÓN */}
        {pedidoConfirmado && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)] px-8 text-center"
            style={{ animation: 'bmFadeUp 0.4s ease both' }}
          >
            <div
              className="w-24 h-24 rounded-full bg-[#2ecc71]/15 border-2 border-[#2ecc71] flex items-center justify-center text-5xl mb-6"
              style={{ animation: 'bmFloat 3s ease-in-out infinite' }}
            >
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">¡Pedido confirmado!</h1>
            {numeroPedido && (
              <div className="text-[#4db8ff] font-bold text-lg mb-3">Pedido #{numeroPedido}</div>
            )}
            <p className="text-white/55 text-sm leading-relaxed mb-8">
              Tu pedido fue recibido. La pescadería lo va a preparar y te avisará cuando esté listo. 🐟
            </p>
            <button
              onClick={() => setPedidoConfirmado(false)}
              className="bg-[#4db8ff] text-[#03174a] font-bold px-8 py-3 rounded-xl active:scale-95 transition-transform"
            >
              Volver a la tienda
            </button>
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes bmFadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  )
}
