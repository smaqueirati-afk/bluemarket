'use client'

import { useState, useEffect } from 'react'
import { crearPescaderia, asignarDueno, borrarPescaderia, reactivarUsuario, reactivarUsuarioPorEmail, toggleTrial, resetTotal } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'
import PescaderiaDetalle from './PescaderiaDetalle'
import CatalogoMaster from './CatalogoMaster'

export default function PanelDeveloper({ pescaderias, catalogo, usuarioId }) {
  const [pestana, setPestana] = useState('pescaderias')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // El mensaje (error o éxito) se borra solo a los 6s para no quedar pegado en pantalla
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(() => setMensaje(null), 6000)
    return () => clearTimeout(t)
  }, [mensaje])
  const [pescaderiaSeleccionada, setPescaderiaSeleccionada] = useState(null)

  const [asignandoId, setAsignandoId] = useState(null)
  const [emailDueno, setEmailDueno] = useState('')
  const [noExisteDueno, setNoExisteDueno] = useState(false)
  const [rubrosAbiertos, setRubrosAbiertos] = useState({})

  function toggleRubro(rubro) {
    setRubrosAbiertos(prev => ({ ...prev, [rubro]: !prev[rubro] }))
  }
  function esAbierto(rubro) {
    // Por defecto todos abiertos (undefined = true)
    return rubrosAbiertos[rubro] !== false
  }
  const [cargandoAsig, setCargandoAsig] = useState(false)

  const [borrandoId, setBorrandoId] = useState(null)
  const [cargandoBorrar, setCargandoBorrar] = useState(false)

  const [reactivandoId, setReactivandoId] = useState(null)

  const [toggling, setToggling] = useState(null)

  const [copiadoInvite, setCopiadoInvite] = useState(false)

  const linkInvitacion = typeof window !== 'undefined' && usuarioId
    ? `${window.location.origin}/invitacion/${usuarioId}`
    : ''

  async function copiarInvitacion() {
    try {
      await navigator.clipboard.writeText(linkInvitacion)
      setCopiadoInvite(true)
      setTimeout(() => setCopiadoInvite(false), 2000)
    } catch (e) { setCopiadoInvite(false) }
  }

  async function compartirInvitacion() {
    const texto = `Sumá tu negocio a BlueMarket\n${linkInvitacion}`
    if (navigator.share) {
      try { await navigator.share({ title: 'BlueMarket', text: texto, url: linkInvitacion }) } catch (e) { }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  async function handleToggleTrial(pescaderiaId, activar) {
    setToggling(pescaderiaId)
    setMensaje(null)
    const resultado = await toggleTrial(pescaderiaId, activar)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({
        tipo: 'ok',
        texto: activar
          ? `Trial iniciado ✓ Vence el ${new Date(resultado.trial_hasta).toLocaleDateString('es-AR')}`
          : 'Trial cancelado ✓'
      })
    }
    setToggling(null)
  }

  const [mostrarReactivar, setMostrarReactivar] = useState(false)
  const [emailReactivar, setEmailReactivar] = useState('')
  const [cargandoReactivar, setCargandoReactivar] = useState(false)

  async function handleReactivarPorEmail() {
    setCargandoReactivar(true)
    setMensaje(null)
    const resultado = await reactivarUsuarioPorEmail(emailReactivar)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: `${resultado.email} reactivado ✓ Ya puede ingresar con Google.` })
      setEmailReactivar('')
      setMostrarReactivar(false)
    }
    setCargandoReactivar(false)
  }

  async function handleReactivar(authUserId) {
    setReactivandoId(authUserId)
    setMensaje(null)
    const resultado = await reactivarUsuario(authUserId)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: `${resultado.email} reactivado ✓ Ya puede ingresar con Google.` })
    }
    setReactivandoId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)
    const formData = new FormData(e.target)
    const resultado = await crearPescaderia(formData)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Pescadería creada ✓' })
      e.target.reset()
      setMostrarForm(false)
    }
    setCargando(false)
  }

  async function handleAsignar(pescaderiaId) {
    setCargandoAsig(true)
    setMensaje(null)
    setNoExisteDueno(false)
    const resultado = await asignarDueno(pescaderiaId, emailDueno)
    if (resultado.error) {
      if (resultado.error.toLowerCase().includes('no se encontró') || resultado.error.toLowerCase().includes('no existe')) {
        setNoExisteDueno(true)
      } else {
        setMensaje({ tipo: 'error', texto: resultado.error })
      }
    } else {
      setMensaje({ tipo: 'ok', texto: `${resultado.email} ahora es dueño ✓` })
      setAsignandoId(null)
      setEmailDueno('')
      setNoExisteDueno(false)
    }
    setCargandoAsig(false)
  }

  async function handleBorrar(id) {
    setCargandoBorrar(true)
    setMensaje(null)
    const resultado = await borrarPescaderia(id)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Pescadería borrada ✓' })
    }
    setBorrandoId(null)
    setCargandoBorrar(false)
  }

  const [copiadoSlug, setCopiadoSlug] = useState(null)

  // ── Reset total ──
  const [confirmReset, setConfirmReset] = useState('')
  const [reseteandoTotal, setReseteandoTotal] = useState(false)
  const [msgReset, setMsgReset] = useState(null)

  async function handleResetTotal() {
    if (confirmReset !== 'BORRAR TODO') return
    setReseteandoTotal(true)
    setMsgReset(null)
    const res = await resetTotal(confirmReset)
    setReseteandoTotal(false)
    if (res?.error) {
      setMsgReset({ tipo: 'error', texto: res.error })
      return
    }
    setMsgReset({ tipo: 'ok', texto: 'Base reseteada. Quedaron solo tu usuario developer y el catálogo master. Recargá para verlo.' })
    setConfirmReset('')
  }

  async function copiarLinkTienda(slug) {
    const link = `${window.location.origin}/t/${slug}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiadoSlug(slug)
      setTimeout(() => setCopiadoSlug(null), 2000)
    } catch {}
  }

  const activas = pescaderias.filter((p) => p.activa).length
  const trials = pescaderias.filter((p) => p.plan === 'trial').length
  const pescBorrar = borrandoId ? pescaderias.find((x) => x.id === borrandoId) : null

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <BarraUsuario perfil="developer" />

      <div className="relative max-w-4xl mx-auto p-6">

        {/* Tabs */}
        {!pescaderiaSeleccionada && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button onClick={() => setPestana('pescaderias')}
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${pestana === 'pescaderias' ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.07] text-white/60 border border-white/10'}`}>
              🏪 Comercios Online
            </button>
            <button onClick={() => setPestana('catalogo')}
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${pestana === 'catalogo' ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.07] text-white/60 border border-white/10'}`}>
              📦 Catálogo master
            </button>
            <button onClick={() => setPestana('limpieza')}
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${pestana === 'limpieza' ? 'bg-[#e74c3c] text-white' : 'bg-white/[0.07] text-white/60 border border-white/10'}`}>
              🧹 Limpieza
            </button>
          </div>
        )}

        {/* ── CATÁLOGO MASTER ── */}
        {pestana === 'catalogo' && !pescaderiaSeleccionada && (
          <CatalogoMaster productos={catalogo || []} pescaderias={pescaderias} />
        )}

        {/* ── LIMPIEZA / ZONA PELIGROSA ── */}
        {pestana === 'limpieza' && !pescaderiaSeleccionada && (
          <div style={{ animation: 'bmFadeUp 0.35s ease both' }}>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#e74c3c]">Zona peligrosa</h1>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-[1.5px]">Limpieza de la base</p>
            </div>

            <div className="bg-[#e74c3c]/[0.07] border border-[#e74c3c]/30 rounded-2xl p-5">
              <h2 className="text-base font-extrabold text-white mb-2">🧹 Reset total</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-3">
                Deja la base como recién instalada. Borra <span className="text-white font-semibold">todas las tiendas,
                productos, pedidos, clientes, cuentas corrientes y fidelización</span>, y reinicia la numeración de pedidos a #1.
              </p>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 mb-4 text-[12px] text-white/55 leading-relaxed">
                <span className="text-[#2ecc71] font-semibold">Se conserva:</span> tu usuario developer, el catálogo master y todos los productos cargados.<br />
                <span className="text-white/40">Las cuentas de Google de prueba siguen existiendo (se vuelven a registrar solas al entrar de nuevo).</span>
              </div>

              <p className="text-[12px] text-white/50 mb-2">Para confirmar, escribí <span className="font-bold text-white">BORRAR TODO</span>:</p>
              <input
                value={confirmReset}
                onChange={(e) => setConfirmReset(e.target.value)}
                placeholder="BORRAR TODO"
                className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#e74c3c]/50 mb-3"
              />

              {msgReset && (
                <div className={`mb-3 px-4 py-3 rounded-xl text-sm ${
                  msgReset.tipo === 'ok'
                    ? 'bg-[#2ecc71]/12 border border-[#2ecc71]/30 text-[#2ecc71]'
                    : 'bg-[#e74c3c]/12 border border-[#e74c3c]/30 text-[#e74c3c]'
                }`}>
                  {msgReset.texto}
                </div>
              )}

              <button
                onClick={handleResetTotal}
                disabled={reseteandoTotal || confirmReset !== 'BORRAR TODO'}
                className="w-full py-3 rounded-xl text-sm font-bold bg-[#e74c3c] text-white active:scale-[0.99] transition-transform hover:bg-[#c0392b] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reseteandoTotal ? 'Borrando todo...' : '🗑️ Resetear toda la base'}
              </button>
            </div>
          </div>
        )}

        {/* ── VISTA DETALLE ── */}
        {pestana === 'pescaderias' && (
        <>
        {pescaderiaSeleccionada ? (
          <PescaderiaDetalle
            pescaderia={pescaderiaSeleccionada}
            onVolver={() => setPescaderiaSeleccionada(null)}
          />
        ) : (
          <>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="text-[#4db8ff]">Blue</span>Market
            </h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-[1.5px]">Developer Console</p>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="w-full sm:w-auto bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-[0_0_16px_rgba(77,184,255,0.4)] active:scale-95 whitespace-nowrap"
          >
            {mostrarForm ? 'Cancelar' : '+ Nueva tienda'}
          </button>
        </div>

        {/* Métricas */}
        {/* Invitar tiendas */}
        {linkInvitacion && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🤝</span>
              <span className="text-sm font-bold text-white">Invitar tiendas</span>
            </div>
            <p className="text-[12px] text-white/45 mb-3 leading-relaxed">
              Compartí tu link o QR. La tienda que entre por ahí se da de alta sola y queda recomendada por vos.
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

        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">Total</div>
            <div className="text-2xl font-extrabold mt-1 text-white">{pescaderias.length}</div>
            <div className="text-[11px] text-white/30 mt-1">tiendas</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">Activas</div>
            <div className="text-2xl font-extrabold mt-1 text-[#2ecc71]">{activas}</div>
            <div className="text-[11px] text-white/30 mt-1">funcionando</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">Prueba</div>
            <div className="text-2xl font-extrabold mt-1 text-[#f39c12]">{trials}</div>
            <div className="text-[11px] text-white/30 mt-1">trial</div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div
            onClick={() => setMensaje(null)}
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border cursor-pointer flex items-start justify-between gap-3 ${
              mensaje.tipo === 'error'
                ? 'bg-[#e74c3c]/15 border-[#e74c3c]/30 text-[#e74c3c]'
                : 'bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#2ecc71]'
            }`}>
            <span>{mensaje.texto}</span>
            <span className="opacity-60 shrink-0 text-base leading-none">×</span>
          </div>
        )}

        {/* Formulario crear */}
        {mostrarForm && (
          <form onSubmit={handleSubmit}
            className="bg-white/[0.06] border border-white/12 rounded-2xl p-5 mb-6 space-y-4 backdrop-blur-md"
            style={{ animation: 'bmFadeUp 0.4s ease both' }}>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre del negocio</label>
              <input name="nombre" required placeholder="Quesería La Comarca"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff]" />
            </div>
            <input name="slug" type="hidden" value="" />
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Rubro</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { rubro: 'pescadería', emoji: '🐟' },
                  { rubro: 'quesería',   emoji: '🧀' },
                  { rubro: 'carnicería', emoji: '🥩' },
                  { rubro: 'verdulería', emoji: '🥦' },
                  { rubro: 'panadería',  emoji: '🥖' },
                  { rubro: 'almacén',    emoji: '🛒' },
                  { rubro: 'rotisería',  emoji: '🍗' },
                  { rubro: 'otro',       emoji: '📦' },
                ].map((r) => (
                  <label key={r.rubro} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer has-[:checked]:border-[#4db8ff] has-[:checked]:bg-[#4db8ff]/10 transition-all">
                    <input type="radio" name="rubro" value={r.rubro} defaultChecked={r.rubro === 'pescadería'} className="accent-[#4db8ff]" />
                    <span className="text-sm">{r.emoji} {r.rubro.charAt(0).toUpperCase() + r.rubro.slice(1)}</span>
                    <input type="hidden" name={`emoji_${r.rubro}`} value={r.emoji} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Teléfono / WhatsApp (opcional)</label>
              <input name="telefono" placeholder="+54 11 1234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-2">¿Cómo trabaja?</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 cursor-pointer has-[:checked]:border-[#4db8ff] has-[:checked]:bg-[#4db8ff]/10 transition-all">
                  <input type="radio" name="modalidad" value="solo_local" className="mt-0.5 accent-[#4db8ff]" />
                  <div>
                    <div className="text-sm font-semibold text-white">🏪 Solo local</div>
                    <div className="text-[11px] text-white/45">Atiende al público, el cliente retira. No hace reparto.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 cursor-pointer has-[:checked]:border-[#4db8ff] has-[:checked]:bg-[#4db8ff]/10 transition-all">
                  <input type="radio" name="modalidad" value="local_reparto" defaultChecked className="mt-0.5 accent-[#4db8ff]" />
                  <div>
                    <div className="text-sm font-semibold text-white">🏪🛵 Local + reparto</div>
                    <div className="text-[11px] text-white/45">Tiene local y además entrega a domicilio.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 cursor-pointer has-[:checked]:border-[#4db8ff] has-[:checked]:bg-[#4db8ff]/10 transition-all">
                  <input type="radio" name="modalidad" value="solo_reparto" className="mt-0.5 accent-[#4db8ff]" />
                  <div>
                    <div className="text-sm font-semibold text-white">🛵 Solo reparto</div>
                    <div className="text-[11px] text-white/45">Sin local. Solo entrega a domicilio (particulares y/o restaurantes).</div>
                  </div>
                </label>
              </div>
            </div>
            <button type="submit" disabled={cargando}
              className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl transition-all hover:shadow-[0_0_16px_rgba(77,184,255,0.4)] active:scale-[0.98] disabled:opacity-60">
              {cargando ? 'Creando...' : 'Crear tienda'}
            </button>
          </form>
        )}

        {/* Reactivar usuario */}
        <div className="mb-6">
          <button
            onClick={() => { setMostrarReactivar(!mostrarReactivar); setMensaje(null) }}
            className="w-full flex items-center justify-between bg-white/[0.04] border border-[#f39c12]/30 rounded-2xl px-4 py-3 text-left transition-all hover:border-[#f39c12]/60"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">↺</span>
              <div>
                <div className="text-sm font-semibold text-[#f39c12]">Reactivar usuario</div>
                <div className="text-[11px] text-white/40">Si alguien no puede ingresar, restauralo por email</div>
              </div>
            </div>
            <span className="text-white/30 text-xs">{mostrarReactivar ? '▲' : '▼'}</span>
          </button>

          {mostrarReactivar && (
            <div className="mt-2 bg-white/[0.04] border border-white/10 rounded-2xl p-4"
                 style={{ animation: 'bmFadeUp 0.3s ease both' }}>
              <div className="text-[11px] text-white/40 uppercase tracking-wide mb-2">Email del usuario a reactivar</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailReactivar}
                  onChange={(e) => setEmailReactivar(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#f39c12]"
                />
                <button
                  onClick={handleReactivarPorEmail}
                  disabled={cargandoReactivar || !emailReactivar}
                  className="shrink-0 bg-[#f39c12] text-[#03174a] font-bold text-xs px-4 py-2 rounded-lg active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  {cargandoReactivar ? '...' : 'Reactivar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de tiendas */}
        <div>
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-3">
            Comercios Online ({pescaderias.length})
          </h2>

          {pescaderias.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.03] border border-white/8 rounded-2xl">
              <div className="text-4xl mb-3 opacity-40">🏪</div>
              <p className="text-white/40 text-sm">Todavía no hay tiendas.<br />Creá la primera con el botón de arriba.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupar por rubro */}
              {Object.entries(
                pescaderias.reduce((acc, p) => {
                  const r = p.rubro || 'otro'
                  if (!acc[r]) acc[r] = []
                  acc[r].push(p)
                  return acc
                }, {})
              ).map(([rubro, tiendas]) => (
                <div key={rubro} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
                  {/* Header del acordeón */}
                  <button
                    onClick={() => toggleRubro(rubro)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tiendas[0]?.emoji_rubro || '🛒'}</span>
                      <span className="text-sm font-bold text-white capitalize">{rubro}</span>
                      <span className="text-[11px] bg-white/10 text-white/50 font-bold px-2 py-0.5 rounded-full">{tiendas.length}</span>
                    </div>
                    <span className="text-white/40 text-sm transition-transform" style={{ display: 'inline-block', transform: esAbierto(rubro) ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>

                  {/* Contenido del acordeón */}
                  {esAbierto(rubro) && (
                    <div className="border-t border-white/8 divide-y divide-white/[0.05]">
                      {tiendas.map((p, idx) => (
                <div key={p.id}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm transition-all hover:border-[#4db8ff]/40"
                  style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.05}s` }}>

                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/30 flex items-center justify-center text-2xl shrink-0">
                      {p.emoji_rubro || '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-base">{p.nombre}</div>
                      <div className="text-xs text-white/40 mt-0.5">/{p.slug} · {p.rubro || 'tienda'} · {p.telefono || 'sin teléfono'}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                          p.plan === 'trial' ? 'bg-[#f39c12]/15 text-[#f39c12]' : 'bg-[#4db8ff]/15 text-[#4db8ff]'
                        }`}>
                          {p.plan}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${p.activa ? 'bg-[#2ecc71]' : 'bg-white/20'}`}
                              style={p.activa ? { boxShadow: '0 0 8px rgba(46,204,113,0.6)' } : {}}></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setPescaderiaSeleccionada(p); setMensaje(null) }}
                        title="Ver detalle"
                        className="h-11 px-3 rounded-xl bg-white/[0.06] border border-white/10 flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-[#4db8ff] hover:border-[#4db8ff]/40 transition-colors active:scale-90"
                      >
                        <span>Ver</span>
                        <span className="text-base">→</span>
                      </button>
                      <button
                        onClick={() => { setBorrandoId(p.id); setMensaje(null) }}
                        title="Borrar pescadería"
                        className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center text-xl text-white/35 hover:text-[#e74c3c] hover:border-[#e74c3c]/40 transition-colors active:scale-90 shrink-0"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Métricas de la tienda (sin entrar al detalle) */}
                  {p.metricas && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[
                        { label: 'Clientes', valor: p.metricas.totalClientes, color: '#4db8ff' },
                        { label: 'Pedidos', valor: p.metricas.totalPedidos, color: '#2ecc71' },
                        { label: 'Este mes', valor: p.metricas.pedidosMes, color: '#f39c12' },
                        { label: 'Facturado', valor: '$' + Number(p.metricas.totalFacturado || 0).toLocaleString('es-AR'), color: '#9b59b6' },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/[0.04] border border-white/8 rounded-xl px-2 py-2 text-center">
                          <div className="text-[9px] text-white/40 uppercase tracking-wide font-bold leading-none mb-1">{m.label}</div>
                          <div className="text-sm font-extrabold truncate" style={{ color: m.color }}>{m.valor}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trial */}
                  <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id={`trial-${p.id}`}
                        checked={!!p.trial_hasta}
                        disabled={toggling === p.id}
                        onChange={(e) => handleToggleTrial(p.id, e.target.checked)}
                        className="w-5 h-5 rounded accent-[#4db8ff] cursor-pointer"
                      />
                      <label htmlFor={`trial-${p.id}`} className="text-sm text-white/70 cursor-pointer select-none">
                        Periodo de prueba
                      </label>
                    </div>
                    {p.trial_hasta && (() => {
                      const vence = new Date(p.trial_hasta)
                      const hoy = new Date()
                      const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
                      const vencido = dias < 0
                      return (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                          vencido
                            ? 'bg-[#e74c3c]/15 text-[#e74c3c]'
                            : dias <= 7
                            ? 'bg-[#f39c12]/15 text-[#f39c12]'
                            : 'bg-[#2ecc71]/15 text-[#2ecc71]'
                        }`}>
                          {vencido ? '⚠ Vencido' : `${dias}d restantes`}
                        </span>
                      )
                    })()}
                  </div>

                  {/* Sección del dueño */}
                  <div className="mt-3 pt-3 border-t border-white/8">
                    {asignandoId === p.id ? (
                      // Modo edición: campo para asignar/cambiar dueño
                      <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                        <div className="text-[11px] text-white/40 uppercase tracking-wide mb-1.5">
                          {p.dueno_email ? 'Cambiar dueño' : 'Asignar dueño'}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={emailDueno}
                            onChange={(e) => setEmailDueno(e.target.value)}
                            placeholder="email@deldueño.com"
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
                          />
                          <button
                            onClick={() => handleAsignar(p.id)}
                            disabled={cargandoAsig}
                            className="shrink-0 bg-[#2ecc71] text-[#03174a] font-bold text-xs px-3 py-2 rounded-lg active:scale-95 disabled:opacity-60"
                          >
                            {cargandoAsig ? '...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => { setAsignandoId(null); setEmailDueno(''); setNoExisteDueno(false) }}
                            className="shrink-0 bg-white/8 text-white/50 text-xs px-3 py-2 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Usuario no existe → invitar por WhatsApp */}
                        {noExisteDueno && (
                          <div className="mt-3 bg-[#f39c12]/10 border border-[#f39c12]/30 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-white/70">
                              <span className="text-[#f39c12] font-bold">"{emailDueno}"</span> todavía no se registró.
                              Invitalo por WhatsApp para que entre con Google.
                            </p>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`*${p.nombre}* te invita a BlueMarket 🛍️\n\nGestioná tu negocio online:\nhttps://bluemarket-two.vercel.app/t/${p.slug}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform">
                              💬 Invitar por WhatsApp
                            </a>
                            <p className="text-[10px] text-white/35 text-center">
                              Después de que se registre, volvé a asignarlo acá.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : p.dueno_email ? (
                      // Tiene dueño: mostrar bloqueado + opción de cambiar
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#2ecc71]/15 border border-[#2ecc71]/30 flex items-center justify-center text-base">
                            👤
                          </div>
                          <div>
                            <div className="text-sm text-white font-semibold">{p.dueno_nombre || p.dueno_email}</div>
                            <div className="text-[11px] text-white/40">{p.dueno_email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Compartir link de la tienda con el dueño */}
                          <button
                            onClick={async () => {
                              const link = `${window.location.origin}/t/${p.slug}`
                              const msg = `*${p.nombre}* ya está en BlueMarket 🛍️\n\nGestioná tu negocio online:\n${link}`
                              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            title="Compartir link de la tienda"
                            className="text-xs bg-[#4db8ff]/12 border border-[#4db8ff]/25 text-[#4db8ff] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            onClick={() => { setAsignandoId(p.id); setEmailDueno(''); setMensaje(null) }}
                            className="text-xs text-white/40 hover:text-[#4db8ff] transition-colors"
                          >
                            Cambiar
                          </button>
                          {p.dueno_auth_id && (
                            <button
                              onClick={() => handleReactivar(p.dueno_auth_id)}
                              disabled={reactivandoId === p.dueno_auth_id}
                              title="Reactivar usuario"
                              className="text-[#f39c12] hover:text-[#f39c12]/80 transition-colors disabled:opacity-50 text-3xl leading-none"
                            >
                              {reactivandoId === p.dueno_auth_id ? '...' : '↺'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Sin dueño: compartir link + botón para asignar
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { setAsignandoId(p.id); setEmailDueno(''); setMensaje(null) }}
                          className="text-xs text-[#4db8ff] font-medium hover:underline"
                        >
                          + Asignar dueño
                        </button>
                        <button
                          onClick={async () => {
                            const link = `${window.location.origin}/t/${p.slug}`
                            const msg = `*${p.nombre}* ya está en BlueMarket 🛍️\n\nGestioná tu negocio online:\n${link}`
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                          }}
                          className="text-xs bg-[#4db8ff]/12 border border-[#4db8ff]/25 text-[#4db8ff] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                        >
                          💬 WhatsApp
                        </button>
                      </div>
                    )}
                  </div>

                </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

          </>
        )}
        </>
        )}

      </div>

      {/* Modal de confirmación de borrado */}
      {pescBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
               onClick={() => { if (!cargandoBorrar) setBorrandoId(null) }} />
          <div className="relative w-full max-w-sm bg-[#0a2a5e] border border-[#e74c3c]/30 rounded-2xl p-6 text-center"
               style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-[#e74c3c]/15 border border-[#e74c3c]/40 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-lg font-extrabold text-white mb-2">¿Borrar esta pescadería?</h3>
            <p className="text-sm text-white/60 mb-2">
              Vas a borrar <strong className="text-white">{pescBorrar.nombre}</strong> <span className="text-white/40">(/{pescBorrar.slug})</span>.
            </p>
            <p className="text-[12px] text-[#ff8a80] mb-5 leading-relaxed">
              Esto borra <strong>definitivamente</strong> también sus productos, pedidos, clientes, repartidores y movimientos de cuenta corriente. No se puede deshacer.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setBorrandoId(null)}
                disabled={cargandoBorrar}
                className="flex-1 bg-white/8 text-white/70 font-semibold py-3 rounded-xl active:scale-[0.98] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBorrar(pescBorrar.id)}
                disabled={cargandoBorrar}
                className="flex-1 bg-[#e74c3c] text-white font-bold py-3 rounded-xl active:scale-[0.98] disabled:opacity-60"
              >
                {cargandoBorrar ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
