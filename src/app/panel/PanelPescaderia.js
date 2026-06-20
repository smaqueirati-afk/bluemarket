'use client'

import { useState, useEffect, useRef } from 'react'
import { cambiarEstadoPedido, guardarHorario, guardarMontoMinimoReparto, guardarEnvioConfig, ajustarPesosPedido } from './actions'
import BarraUsuario from '../../components/BarraUsuario'
import MapaReparto from '../../components/MapaReparto'
import { createClient } from '../../lib/supabase/client'

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

// Próximo estado según retiro/entrega: en RETIRO no hay "en camino"
// (el cliente lo pasa a buscar), así que de "Listo" pasa directo a "Entregado".
function siguienteEstado(pedido) {
  if (pedido?.estado === 'listo' && pedido?.tipo_entrega !== 'delivery') {
    return 'entregado'
  }
  return SIGUIENTE[pedido?.estado]
}

// Franjas horarias para la agenda de reparto. La franja null = "Sin preferencia".
const FRANJAS = {
  manana:     { orden: 1, label: 'Mañana', emoji: '☀️' },
  tarde:      { orden: 2, label: 'Tarde', emoji: '🌇' },
  noche:      { orden: 3, label: 'Noche', emoji: '🌙' },
  cualquiera: { orden: 4, label: 'Sin preferencia', emoji: '🤷' },
}
function franjaInfo(f) {
  return FRANJAS[f] || FRANJAS.cualquiera
}
function franjaOrden(f) {
  return (FRANJAS[f] || FRANJAS.cualquiera).orden
}

// Normaliza un teléfono a formato internacional para wa.me (Argentina: 549...)
function waNumero(tel) {
  if (!tel) return null
  let n = String(tel).replace(/\D/g, '') // solo dígitos
  if (!n) return null
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('54')) {
    let resto = n.slice(2)
    if (resto.startsWith('0')) resto = resto.slice(1)
    if (!resto.startsWith('9')) resto = '9' + resto
    return '54' + resto
  }
  if (n.startsWith('0')) n = n.slice(1)
  return '549' + n
}

export default function PanelPescaderia({ pescaderia, pedidos: pedidosIniciales, nombreUsuario, usuarioId }) {
  const [pedidos, setPedidos] = useState(pedidosIniciales || [])
  const [filtro, setFiltro] = useState('activos')
  const [actualizando, setActualizando] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [verQR, setVerQR] = useState(false)
  const [editandoHorario, setEditandoHorario] = useState(null)
  const [horarioInput, setHorarioInput] = useState('')
  const [editandoMinimo, setEditandoMinimo] = useState(false)
  const [minimoInput, setMinimoInput] = useState('')
  const [editandoEnvio, setEditandoEnvio] = useState(false)
  const [envioModoInput, setEnvioModoInput] = useState('gratis')
  const [envioDesdeInput, setEnvioDesdeInput] = useState('')
  const [guardandoEnvio, setGuardandoEnvio] = useState(false)
  const [guardandoMin, setGuardandoMin] = useState(false)
  const [copiadoInvite, setCopiadoInvite] = useState(false)
  const [toastPedido, setToastPedido] = useState(null) // { numero, total }
  const toastTimer = useRef(null)

  // ── Supabase Realtime: escuchar pedidos nuevos de esta pescadería ──
  useEffect(() => {
    if (!pescaderia?.id) return
    const supabase = createClient()

    const channel = supabase
      .channel(`pedidos-${pescaderia.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos',
          filter: `pescaderia_id=eq.${pescaderia.id}`,
        },
        (payload) => {
          const nuevo = payload.new
          // Agregar el pedido nuevo al principio de la lista
          setPedidos((prev) => [nuevo, ...prev])
          // Mostrar toast de notificación
          if (toastTimer.current) clearTimeout(toastTimer.current)
          setToastPedido({ numero: nuevo.numero, total: nuevo.total })
          toastTimer.current = setTimeout(() => setToastPedido(null), 6000)
          // Sonido de notificación (beep suave vía Web Audio API)
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
          } catch (e) {}
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [pescaderia?.id])

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
    const texto = `*${pescaderia?.nombre}* está en BlueMarket 🛍️\n\nDescubrí el catálogo y hacé tu pedido online:\n${linkTienda}`
    if (navigator.share) {
      try {
        await navigator.share({ title: pescaderia?.nombre, text: texto, url: linkTienda })
      } catch (e) { /* el usuario canceló */ }
    } else {
      // si el navegador no soporta compartir nativo, abrir WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  // Link de invitación a la red (cada miembro tiene el suyo)
  const linkInvitacion = typeof window !== 'undefined' && usuarioId
    ? `${window.location.origin}/invitacion/${usuarioId}`
    : ''

  async function copiarInvitacion() {
    try {
      await navigator.clipboard.writeText(linkInvitacion)
      setCopiadoInvite(true)
      setTimeout(() => setCopiadoInvite(false), 2000)
    } catch (e) {
      setCopiadoInvite(false)
    }
  }

  async function compartirInvitacion() {
    const texto = `*${pescaderia?.nombre || 'BlueMarket'}* te invita a comprar online 🛍️\n\nDescubrí nuestro catálogo y hacé tu pedido:\n${linkInvitacion}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'BlueMarket', text: texto, url: linkInvitacion })
      } catch (e) { /* el usuario canceló */ }
    } else {
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
    const siguiente = siguienteEstado(pedido)
    if (!siguiente) return
    if (siguiente === 'entregado') {
      entregar(pedido)
      return
    }
    setActualizando(pedido.id)
    const res = await cambiarEstadoPedido(pedido.id, siguiente)
    if (!res?.error) {
      setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, estado: siguiente } : p))
    }
    setActualizando(null)
  }

  async function cancelar(pedido) {
    setActualizando(pedido.id)
    const res = await cambiarEstadoPedido(pedido.id, 'cancelado')
    if (!res?.error) {
      setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, estado: 'cancelado' } : p))
    }
    setActualizando(null)
  }

  const [verificandoEntrega, setVerificandoEntrega] = useState(null) // pedido que se está verificando
  const [inputClave, setInputClave] = useState('')
  const [errorClave, setErrorClave] = useState(null)

  async function entregar(pedido) {
    setVerificandoEntrega(pedido)
    setInputClave('')
    setErrorClave(null)
  }

  async function confirmarEntrega() {
    if (!verificandoEntrega) return
    if (inputClave.trim().toLowerCase() !== verificandoEntrega.palabra_clave?.toLowerCase()) {
      setErrorClave('Palabra clave incorrecta. Pedísela al cliente.')
      return
    }
    setActualizando(verificandoEntrega.id)
    const res = await cambiarEstadoPedido(verificandoEntrega.id, 'entregado')
    if (!res?.error) {
      setPedidos((prev) => prev.map((p) => p.id === verificandoEntrega.id ? { ...p, estado: 'entregado' } : p))
    }
    setVerificandoEntrega(null)
    setInputClave('')
    setErrorClave(null)
    setActualizando(null)
  }

  function abrirHorario(pedido) {
    setHorarioInput(pedido.horario || '')
    setEditandoHorario(pedido.id)
  }

  async function guardarHorarioPedido(pedido) {
    setActualizando(pedido.id)
    await guardarHorario(pedido.id, horarioInput.trim())
    setEditandoHorario(null)
    setActualizando(null)
  }

  function abrirMinimo() {
    setMinimoInput(pescaderia?.monto_minimo_reparto ? String(pescaderia.monto_minimo_reparto) : '')
    setEditandoMinimo(true)
  }

  async function guardarMinimo() {
    setGuardandoMin(true)
    await guardarMontoMinimoReparto(Number(minimoInput) || 0)
    setGuardandoMin(false)
    setEditandoMinimo(false)
  }

  function abrirEnvio() {
    setEnvioModoInput(pescaderia?.envio_modo || 'gratis')
    setEnvioDesdeInput(pescaderia?.envio_gratis_desde ? String(pescaderia.envio_gratis_desde) : '')
    setEditandoEnvio(true)
  }

  async function guardarEnvio() {
    setGuardandoEnvio(true)
    await guardarEnvioConfig(envioModoInput, Number(envioDesdeInput) || 0)
    setGuardandoEnvio(false)
    setEditandoEnvio(false)
  }

  // Métricas del día
  const hoy = new Date().toDateString()
  const pedidosHoy = pedidos.filter((p) => new Date(p.created_at).toDateString() === hoy)
  const ventasHoy = pedidosHoy
    .filter((p) => p.estado !== 'cancelado')
    .reduce((acc, p) => acc + Number(p.total), 0)

  // ¿Esta pescadería hace reparto? (si no llega la modalidad, igual lo mostramos)
  const haceReparto = pescaderia?.modalidad
    ? ['local_reparto', 'solo_reparto'].includes(pescaderia.modalidad)
    : true

  // Reparto del día: pedidos delivery recibidos HOY, ordenados del primero al último
  const repartoHoy = pedidos
    .filter((p) =>
      p.tipo_entrega === 'delivery' &&
      p.estado !== 'cancelado' &&
      new Date(p.created_at).toDateString() === hoy
    )
    .sort((a, b) =>
      franjaOrden(a.franja) - franjaOrden(b.franja) ||
      new Date(a.created_at) - new Date(b.created_at)
    )

  // Filtrar pedidos
  // ── Pesaje: cargar el peso real de los ítems por kg ──
  const [pesando, setPesando] = useState(null)        // id del pedido en modo pesaje
  const [pesosInput, setPesosInput] = useState({})     // { itemId: stringKg }
  const [guardandoPeso, setGuardandoPeso] = useState(false)
  const [errorPeso, setErrorPeso] = useState(null)

  // Cantidad en kg legible: "½ kg", "1¼ kg"; o el número exacto si es un peso real (0.54 kg)
  function fmtKg(c) {
    const n = Number(c)
    const entero = Math.floor(n + 1e-9)
    const frac = +(n - entero).toFixed(2)
    const simb = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[frac]
    if (simb !== undefined) return (entero === 0 ? simb : `${entero}${simb}`) + ' kg'
    return n.toLocaleString('es-AR') + ' kg'
  }

  function abrirPesaje(pedido) {
    const init = {}
    for (const it of (pedido.items || [])) {
      if (it.unidad === 'kg') {
        const base = it.cantidad_final != null ? it.cantidad_final : it.cantidad
        init[it.id] = String(base)
      }
    }
    setPesosInput(init)
    setErrorPeso(null)
    setPesando(pedido.id)
  }

  // Total recalculado en vivo mientras el dueño carga pesos
  function totalPesando(pedido) {
    let t = 0
    for (const it of (pedido.items || [])) {
      let cant
      if (it.unidad === 'kg') {
        const v = pesosInput[it.id]
        cant = (v !== undefined && v !== '') ? Number(v) : (it.cantidad_final != null ? it.cantidad_final : it.cantidad)
      } else {
        cant = it.cantidad
      }
      if (Number.isNaN(cant) || cant < 0) cant = 0
      t += Math.round(Number(it.precio_unit) * cant)
    }
    t += Number(pedido.envio || 0) - Number(pedido.descuento || 0)
    return Math.max(0, t)
  }

  async function confirmarPesos(pedido) {
    setGuardandoPeso(true)
    setErrorPeso(null)
    const pesos = (pedido.items || [])
      .filter((it) => it.unidad === 'kg')
      .map((it) => ({ itemId: it.id, cantidadFinal: Number(pesosInput[it.id]) }))
    const res = await ajustarPesosPedido(pedido.id, pesos)
    setGuardandoPeso(false)
    if (res?.error) { setErrorPeso(res.error); return }
    setPedidos((prev) => prev.map((p) => {
      if (p.id !== pedido.id) return p
      const nuevosItems = (p.items || []).map((it) => {
        const aj = res.items?.find((u) => u.id === it.id)
        return aj ? { ...it, cantidad_final: aj.cantidad_final, subtotal_final: aj.subtotal_final } : it
      })
      return { ...p, items: nuevosItems, total_final: res.total_final, pesado: true }
    }))
    setPesando(null)
  }

  const activos = pedidos.filter((p) => !['entregado', 'cancelado'].includes(p.estado))
  const finalizados = pedidos.filter((p) => ['entregado', 'cancelado'].includes(p.estado))
  const lista =
    filtro === 'reparto' ? repartoHoy :
    filtro === 'activos' ? activos : finalizados

  // Alerta de vencimiento de trial
  const diasTrial = (() => {
    if (!pescaderia?.trial_hasta) return null
    const vence = new Date(pescaderia.trial_hasta)
    const hoy = new Date()
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
  })()
  const mostrarAlertaTrial = diasTrial !== null && diasTrial <= 5

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <BarraUsuario perfil="pescaderia" emojiRubro={pescaderia?.emoji_rubro} />

      {/* Alerta vencimiento trial */}
      {mostrarAlertaTrial && (
        <div className={`relative z-10 mx-4 mt-4 rounded-2xl px-4 py-3.5 border flex items-start gap-3 ${
          diasTrial <= 0
            ? 'bg-[#e74c3c]/15 border-[#e74c3c]/40 text-[#e74c3c]'
            : 'bg-[#f39c12]/15 border-[#f39c12]/40 text-[#f39c12]'
        }`} style={{ animation: 'bmFadeUp 0.4s ease both' }}>
          <span className="text-2xl shrink-0">{diasTrial <= 0 ? '🚨' : '⏳'}</span>
          <div>
            <div className="font-extrabold text-sm">
              {diasTrial <= 0
                ? '¡Tu periodo de prueba venció!'
                : diasTrial === 1
                ? '¡Tu periodo de prueba vence mañana!'
                : `Tu periodo de prueba vence en ${diasTrial} días`}
            </div>
            <div className="text-[12px] mt-0.5 opacity-80">
              {diasTrial <= 0
                ? 'Contactá al administrador para continuar usando el sistema.'
                : 'Contactá al administrador para no perder el acceso al sistema.'}
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-4xl mx-auto p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#4db8ff]/12 border border-[#4db8ff]/30 flex items-center justify-center text-2xl shrink-0">
              {pescaderia?.emoji_rubro || '🛒'}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight leading-tight">{pescaderia?.nombre || 'Mi tienda'}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-white/40">Hola, {nombreUsuario} 👋</p>
                {pescaderia?.modalidad && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: pescaderia.modalidad === 'solo_local' ? 'rgba(77,184,255,0.12)' : pescaderia.modalidad === 'solo_reparto' ? 'rgba(155,89,182,0.15)' : 'rgba(46,204,113,0.12)',
                      color: pescaderia.modalidad === 'solo_local' ? '#4db8ff' : pescaderia.modalidad === 'solo_reparto' ? '#9b59b6' : '#2ecc71',
                      borderColor: pescaderia.modalidad === 'solo_local' ? 'rgba(77,184,255,0.3)' : pescaderia.modalidad === 'solo_reparto' ? 'rgba(155,89,182,0.35)' : 'rgba(46,204,113,0.3)',
                    }}>
                    {pescaderia.modalidad === 'solo_local' ? '🏪 Solo local' : pescaderia.modalidad === 'solo_reparto' ? '🛵 Solo reparto' : '🏪🛵 Local + reparto'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <a href="/pescaderia/productos"
              className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all text-center whitespace-nowrap">
              {pescaderia?.emoji_rubro || '📦'} Productos
            </a>
            <a href="/pescaderia/clientes"
              className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all text-center whitespace-nowrap">
              👥 Clientes
            </a>
            {pescaderia?.modalidad === 'solo_local' && (
              <a href="/pescaderia/proveedores"
                className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all text-center whitespace-nowrap">
                🚚 Proveedores
              </a>
            )}
            {pescaderia?.modalidad === 'solo_local' && (
              <a href="/pescaderia/fidelizacion"
                className="bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all text-center whitespace-nowrap">
                🎁 Fidelización
              </a>
            )}
            {haceReparto && (
              <a href="/pescaderia/fidelizacion"
                className="col-span-2 bg-white/[0.08] border border-white/12 text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-all text-center whitespace-nowrap">
                🎁 Fidelización
              </a>
            )}
          </div>
        </div>

        {/* Métricas del día */}
        <div className="flex flex-col gap-2.5 mb-7">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm flex items-center justify-between">
            <span className="text-[11px] text-white/40 uppercase tracking-wide">Pedidos hoy</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white">{pedidosHoy.length}</span>
              <span className="text-[11px] text-white/30">pedidos</span>
            </span>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm flex items-center justify-between">
            <span className="text-[11px] text-white/40 uppercase tracking-wide">Activos</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#4db8ff]">{activos.length}</span>
              <span className="text-[11px] text-white/30">en curso</span>
            </span>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm flex items-center justify-between">
            <span className="text-[11px] text-white/40 uppercase tracking-wide">Ventas hoy</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#2ecc71]">{fmt(ventasHoy)}</span>
              <span className="text-[11px] text-white/30">facturado</span>
            </span>
          </div>
        </div>

        {/* Tarjeta del link de la tienda */}
        <div className="bg-[linear-gradient(135deg,rgba(77,184,255,0.12),rgba(46,204,113,0.08))] border border-[#4db8ff]/25 rounded-2xl p-4 mb-7">
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
              className="flex-[3] bg-[#4db8ff] text-[#03174a] font-bold text-sm py-2 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5">
              <span>📤</span> Compartir
            </button>
            <button onClick={copiarLink}
              className="flex-[1] bg-white/[0.08] border border-white/12 text-white font-medium text-xs py-2 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1">
              {copiado ? <><span>✓</span> Copiado</> : <><span>📋</span> Copiar</>}
            </button>
            <button onClick={() => setVerQR(!verQR)}
              className="bg-white/[0.08] border border-white/12 text-white font-medium text-sm py-2 px-3 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center">
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

        {/* Invitar a la red */}
        {linkInvitacion && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🤝</span>
              <span className="text-sm font-bold text-white">Invitar comercios</span>
            </div>
            <p className="text-[12px] text-white/45 mb-3 leading-relaxed">
              Compartí tu link o QR. El comercio que entre por ahí se da de alta solo y queda recomendado por vos.
            </p>
            <div className="flex justify-center mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(linkInvitacion)}`}
                alt="QR de invitación"
                width={150}
                height={150}
                className="rounded-xl bg-white p-2"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={compartirInvitacion}
                className="flex-[3] bg-[#4db8ff] text-[#03174a] font-bold text-sm py-2 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5">
                <span>📤</span> Invitar
              </button>
              <button onClick={copiarInvitacion}
                className="flex-[1] bg-white/[0.08] border border-white/12 text-white font-medium text-xs py-2 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1">
                {copiadoInvite ? <><span>✓</span> Copiado</> : <><span>📋</span> Copiar</>}
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {haceReparto && (
            <button onClick={() => setFiltro('reparto')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filtro === 'reparto' ? 'bg-[#9b59b6] text-white' : 'bg-white/[0.06] text-white/55 border border-white/10'
              }`}>
              🛵 Reparto hoy ({repartoHoy.length})
            </button>
          )}
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

        {/* Pedido mínimo para envío (configuración del dueño, solo en reparto) */}
        {filtro === 'reparto' && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-[10px] text-white/40 uppercase tracking-wide font-bold">Pedido mínimo para envío</div>
                {editandoMinimo ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center bg-white/[0.06] border border-white/15 rounded-lg px-2 focus-within:border-[#4db8ff]/60">
                      <span className="text-white/40 text-sm">$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={minimoInput}
                        onChange={(e) => setMinimoInput(e.target.value)}
                        placeholder="0"
                        className="w-28 bg-transparent py-2 px-1 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={guardarMinimo}
                      disabled={guardandoMin}
                      className="bg-[#4db8ff] text-[#03174a] font-bold text-xs px-3 py-2 rounded-lg active:scale-95 transition-all disabled:opacity-60 shrink-0">
                      {guardandoMin ? '...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => setEditandoMinimo(false)}
                      className="text-white/40 hover:text-white text-sm px-1 shrink-0">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="text-xl font-extrabold text-white mt-0.5">
                    {Number(pescaderia?.monto_minimo_reparto) > 0 ? fmt(pescaderia.monto_minimo_reparto) : 'Sin mínimo'}
                  </div>
                )}
              </div>
              {!editandoMinimo && (
                <button
                  onClick={abrirMinimo}
                  className="bg-white/[0.08] border border-white/12 text-white text-xs font-medium px-3 py-2 rounded-lg active:scale-95 transition-all shrink-0">
                  Editar
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/35 mt-2">Los clientes no van a poder pedir envío por menos de este monto. Ponelo en 0 para no exigir mínimo.</p>
          </div>
        )}

        {filtro === 'reparto' && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wide font-bold mb-2">Costo de envío</div>
            {editandoEnvio ? (
              <div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'gratis', emoji: '🆓', label: 'Gratis siempre', desc: 'El envío nunca tiene costo.' },
                    { id: 'gratis_desde', emoji: '🎯', label: 'Gratis a partir de un monto', desc: 'Por debajo de ese monto, a coordinar.' },
                    { id: 'coordinar', emoji: '🤝', label: 'A coordinar con el cliente', desc: 'El costo lo arreglás por WhatsApp.' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setEnvioModoInput(m.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${envioModoInput === m.id ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.04] border-white/10'}`}>
                      <div className="text-sm font-bold text-white">{m.emoji} {m.label}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
                {envioModoInput === 'gratis_desde' && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[12px] text-white/55">Gratis desde</span>
                    <div className="flex items-center bg-white/[0.06] border border-white/15 rounded-lg px-2 focus-within:border-[#4db8ff]/60">
                      <span className="text-white/40 text-sm">$</span>
                      <input type="number" inputMode="numeric" min="0" value={envioDesdeInput}
                        onChange={(e) => setEnvioDesdeInput(e.target.value)} placeholder="0"
                        className="w-28 bg-transparent py-2 px-1 text-sm text-white focus:outline-none" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={guardarEnvio} disabled={guardandoEnvio}
                    className="bg-[#4db8ff] text-[#03174a] font-bold text-xs px-3 py-2 rounded-lg active:scale-95 transition-all disabled:opacity-60">
                    {guardandoEnvio ? '...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditandoEnvio(false)} className="text-white/40 hover:text-white text-sm px-1">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xl font-extrabold text-white">
                  {pescaderia?.envio_modo === 'coordinar' ? '🤝 A coordinar'
                    : pescaderia?.envio_modo === 'gratis_desde' ? `🎯 Gratis desde ${fmt(pescaderia?.envio_gratis_desde || 0)}`
                    : '🆓 Gratis'}
                </div>
                <button onClick={abrirEnvio}
                  className="bg-white/[0.08] border border-white/12 text-white text-xs font-medium px-3 py-2 rounded-lg active:scale-95 transition-all shrink-0">
                  Editar
                </button>
              </div>
            )}
            <p className="text-[11px] text-white/35 mt-2">Nunca se le cobra un monto fijo al cliente: o el envío es gratis, o se coordina con vos.</p>
          </div>
        )}

        {/* Mapa del recorrido (solo en modo reparto) */}
        {filtro === 'reparto' && repartoHoy.length > 0 && (
          <MapaReparto pedidos={repartoHoy} ciudad={pescaderia?.localidad || pescaderia?.ciudad || ''} origen={pescaderia?.direccion || ''} />
        )}

        {/* Lista de pedidos */}
        {lista.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.03] border border-white/8 rounded-2xl">
            <div className="text-4xl mb-3 opacity-40">{filtro === 'reparto' ? '🛵' : '📦'}</div>
            <p className="text-white/40 text-sm">
              {filtro === 'reparto'
                ? 'No hay pedidos de reparto para hoy.'
                : filtro === 'activos'
                ? 'No hay pedidos activos en este momento.'
                : 'Todavía no hay pedidos finalizados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((pedido, idx) => {
              const est = datosEstado(pedido.estado)
              const siguiente = siguienteEstado(pedido)
              const telWa = filtro === 'reparto'
                ? waNumero(pedido.cliente_telefono || pedido.telefono || pedido.telefono_contacto)
                : null
              const fr = franjaInfo(pedido.franja)
              const mostrarFranja = filtro === 'reparto' && (idx === 0 || franjaInfo(lista[idx - 1].franja).label !== fr.label)
              return (
                <div key={pedido.id}>
                  {mostrarFranja && (
                    <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                      <span className="text-base">{fr.emoji}</span>
                      <span className="text-sm font-bold text-white/80 uppercase tracking-wide">{fr.label}</span>
                    </div>
                  )}
                <div
                  className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
                  style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.05}s` }}>

                  {/* Cabecera del pedido */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {filtro === 'reparto' && (
                        <span className="w-7 h-7 rounded-full bg-[#9b59b6] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <span className="text-lg font-extrabold text-white shrink-0">#{pedido.numero}</span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                        style={{ background: `${est.color}22`, color: est.color }}>
                        {est.emoji} {pedido.estado === 'listo' && pedido.tipo_entrega !== 'delivery' ? 'Listo para retirar' : est.label}
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
                      {pedido.direccion && filtro !== 'reparto' && <span className="text-white/50">· {pedido.direccion}</span>}
                    </div>

                    {filtro === 'reparto' && pedido.direccion && (
                      <div className="bg-[#9b59b6]/12 border border-[#9b59b6]/25 rounded-xl px-3 py-2.5 mt-1">
                        <div className="text-[10px] text-[#c79be0] uppercase tracking-wide font-bold">Dirección de entrega</div>
                        <div className="text-sm text-white font-medium break-words mb-2">📍 {pedido.direccion}</div>
                        <div className="flex gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pedido.direccion)}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#4285F4] text-white text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition-transform text-center">
                            📍 Navegar
                          </a>
                          {telWa && (
                            <a
                              href={`https://wa.me/${telWa}?text=${encodeURIComponent(`¡Hola${pedido.cliente_nombre ? ' ' + pedido.cliente_nombre : ''}! Soy de ${pescaderia?.nombre || 'la tienda'}, voy en camino con tu pedido #${pedido.numero}${pedido.horario ? ` (horario estimado: ${pedido.horario})` : ''}${pedido.palabra_clave ? `\n\n🔑 Tu palabra clave: ${pedido.palabra_clave}\nDecísela al repartidor cuando te entregue el pedido.` : ''}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-[#25D366] text-[#03351b] text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition-transform text-center">
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {filtro === 'reparto' && (
                      <div className="mt-1">
                        {editandoHorario === pedido.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              value={horarioInput}
                              onChange={(e) => setHorarioInput(e.target.value)}
                              placeholder="Ej: 18 a 19 hs"
                              className="flex-1 min-w-0 bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#4db8ff]/60"
                            />
                            <button
                              onClick={() => guardarHorarioPedido(pedido)}
                              disabled={actualizando === pedido.id}
                              className="bg-[#4db8ff] text-[#03174a] font-bold text-xs px-3 py-2 rounded-lg active:scale-95 transition-all disabled:opacity-60 shrink-0">
                              {actualizando === pedido.id ? '...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => setEditandoHorario(null)}
                              className="text-white/40 hover:text-white text-sm px-1 shrink-0">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => abrirHorario(pedido)}
                            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
                            <span className="text-white/40">🕒</span>
                            {pedido.horario
                              ? <span>Entrega: <span className="text-white font-medium">{pedido.horario}</span> <span className="text-white/30 text-xs">(editar)</span></span>
                              : <span className="text-white/45">Agregar horario de entrega</span>}
                          </button>
                        )}
                      </div>
                    )}
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

                  {/* Contacto del cliente */}
                  {(pedido.cliente_telefono || pedido.cliente_email) && (
                    <div className="pt-3 border-t border-white/8">
                      <p className="text-[10px] text-white/35 uppercase tracking-wide font-bold mb-2">Contacto del cliente</p>
                      <div className="flex gap-2 flex-wrap">
                        {pedido.cliente_telefono && (() => {
                          const tel = waNumero(pedido.cliente_telefono)
                          return tel ? (
                            <a href={`https://wa.me/${tel}?text=${encodeURIComponent(`¡Hola${pedido.cliente_nombre ? ' ' + pedido.cliente_nombre : ''}! Soy de ${pescaderia?.nombre || 'la tienda'}, te escribo por tu pedido #${pedido.numero}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
                              💬 {pedido.cliente_telefono}
                            </a>
                          ) : (
                            <span className="text-xs text-white/45 px-3 py-2 bg-white/[0.04] border border-white/8 rounded-xl">
                              📱 {pedido.cliente_telefono}
                            </span>
                          )
                        })()}
                        {pedido.cliente_email && (
                          <a href={`mailto:${pedido.cliente_email}?subject=Tu pedido #${pedido.numero}&body=Hola${pedido.cliente_nombre ? ' ' + pedido.cliente_nombre : ''}, te escribimos de ${pescaderia?.nombre || 'la pescadería'} sobre tu pedido #${pedido.numero}.`}
                            className="flex items-center gap-1.5 bg-white/[0.07] border border-white/15 text-white/70 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
                            ✉️ {pedido.cliente_email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Productos del pedido + pesaje */}
                  {pedido.items && pedido.items.length > 0 && (
                    <div className="pt-3 border-t border-white/8">
                      <p className="text-[10px] text-white/35 uppercase tracking-wide font-bold mb-2">
                        Productos
                        {pedido.pesado && <span className="text-[#2ecc71] normal-case"> · pesado ✓</span>}
                      </p>
                      <div className="space-y-1.5">
                        {pedido.items.map((it) => {
                          const esKg = it.unidad === 'kg'
                          const pesandoEste = pesando === pedido.id && esKg
                          return (
                            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-white/75 min-w-0 truncate">
                                <span className="text-white/45">{esKg ? fmtKg(it.cantidad_final != null ? it.cantidad_final : it.cantidad) : `${it.cantidad}×`}</span> {it.nombre}
                              </span>
                              {pesandoEste ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number" step="0.001" min="0" inputMode="decimal"
                                    value={pesosInput[it.id] ?? ''}
                                    onChange={(e) => setPesosInput((s) => ({ ...s, [it.id]: e.target.value }))}
                                    className="w-20 bg-white/[0.06] border border-[#4db8ff]/40 rounded-lg px-2 py-1 text-white text-right text-sm outline-none focus:border-[#4db8ff]"
                                  />
                                  <span className="text-white/40 text-xs">kg</span>
                                </div>
                              ) : (
                                <span className="text-white/55 shrink-0">{fmt(it.subtotal_final != null ? it.subtotal_final : it.subtotal)}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {!['entregado', 'cancelado'].includes(pedido.estado) && pedido.items.some((it) => it.unidad === 'kg') && (
                        pesando === pedido.id ? (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white/55 text-sm">Total con pesos</span>
                              <span className="text-lg font-extrabold text-[#2ecc71]">{fmt(totalPesando(pedido))}</span>
                            </div>
                            {errorPeso && <div className="text-[#e74c3c] text-xs mb-2">{errorPeso}</div>}
                            <div className="flex gap-2">
                              <button onClick={() => { setPesando(null); setErrorPeso(null) }}
                                className="flex-1 bg-white/[0.08] border border-white/12 text-white/70 text-sm font-medium py-2 rounded-xl active:scale-95 transition-all">
                                Cancelar
                              </button>
                              <button onClick={() => confirmarPesos(pedido)} disabled={guardandoPeso}
                                className="flex-[2] bg-[#2ecc71] text-[#03351b] font-bold text-sm py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60">
                                {guardandoPeso ? 'Guardando...' : '✓ Confirmar pesos'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => abrirPesaje(pedido)}
                            className="mt-3 w-full bg-[#4db8ff]/12 border border-[#4db8ff]/30 text-[#4db8ff] text-sm font-bold py-2 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5">
                            ⚖️ {pedido.pesado ? 'Reajustar pesos' : 'Cargar peso real'}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* Total y acciones */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/8 flex-wrap">
                    {(() => {
                      const hayKg = (pedido.items || []).some((it) => it.unidad === 'kg')
                      const esFinal = pedido.pesado && pedido.total_final != null
                      const mostrar = esFinal ? pedido.total_final : pedido.total
                      return (
                        <span className="flex flex-col leading-tight">
                          <span className="text-lg font-extrabold text-[#4db8ff]">{(!pedido.pesado && hayKg) ? '~' : ''}{fmt(mostrar)}</span>
                          {(!pedido.pesado && hayKg) && <span className="text-[10px] text-white/40">estimado</span>}
                          {esFinal && <span className="text-[10px] text-[#2ecc71]">final · pesado</span>}
                        </span>
                      )
                    })()}

                    {!['entregado', 'cancelado'].includes(pedido.estado) && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => cancelar(pedido)}
                          disabled={actualizando === pedido.id}
                          className="text-xs text-white/40 hover:text-[#e74c3c] px-2 transition-colors disabled:opacity-50">
                          Cancelar
                        </button>
                        {filtro === 'reparto' ? (
                          <button
                            onClick={() => entregar(pedido)}
                            disabled={actualizando === pedido.id}
                            className="bg-[#2ecc71] text-[#03351b] font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60">
                            {actualizando === pedido.id ? '...' : '✓ Entregado'}
                          </button>
                        ) : (
                          siguiente && (
                            <button
                              onClick={() => avanzar(pedido)}
                              disabled={actualizando === pedido.id}
                              className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60">
                              {actualizando === pedido.id ? '...' : `→ ${datosEstado(siguiente).label}`}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

        {/* MODAL VERIFICAR PALABRA CLAVE */}
        {verificandoEntrega && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
            <div className="w-full max-w-sm bg-[#051e5c] border border-white/15 rounded-2xl p-6"
                 style={{ animation: 'bmFadeUp 0.25s ease both' }}>
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">🔑</div>
                <h3 className="text-lg font-extrabold text-white">Verificar entrega</h3>
                <p className="text-white/45 text-sm mt-1">Pedido #{verificandoEntrega.numero}</p>
                <p className="text-white/45 text-sm">Ingresá la palabra clave del cliente</p>
              </div>
              <input
                value={inputClave}
                onChange={(e) => { setInputClave(e.target.value); setErrorClave(null) }}
                placeholder="ej: mar-perla-42"
                autoFocus
                className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-4 py-3 text-white text-center text-lg font-bold placeholder:text-white/25 outline-none focus:border-[#4db8ff]/60 mb-2"
              />
              {errorClave && (
                <div className="text-[#e74c3c] text-xs text-center mb-3">{errorClave}</div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setVerificandoEntrega(null); setErrorClave(null) }}
                  className="flex-1 bg-white/8 text-white/60 py-2.5 rounded-xl text-sm">
                  Cancelar
                </button>
                <button
                  onClick={confirmarEntrega}
                  disabled={!inputClave.trim() || actualizando === verificandoEntrega.id}
                  className="flex-1 bg-[#2ecc71] text-[#03351b] font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50">
                  {actualizando === verificandoEntrega.id ? '...' : '✓ Confirmar entrega'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST pedido nuevo */}
        {toastPedido && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#2ecc71] text-[#03351b] px-5 py-3.5 rounded-2xl shadow-[0_8px_32px_rgba(46,204,113,0.4)] font-bold text-sm"
            style={{ animation: 'bmSlideUp 0.35s ease both' }}
          >
            <span className="text-xl">🆕</span>
            <div>
              <div>¡Pedido #{toastPedido.numero} recibido!</div>
              <div className="text-[11px] font-normal opacity-75">
                ${Number(toastPedido.total).toLocaleString('es-AR')}
              </div>
            </div>
            <button onClick={() => setToastPedido(null)} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        )}

      <style>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
