'use client'

import { useState, useEffect } from 'react'
import { getPescaderiaDetalle, resetPedidosPescaderia, getMiembrosTienda, agregarMiembro, cambiarRolMiembro, quitarMiembro } from './actions'

const ESTADOS = {
  nuevo:      { label: 'Recibido',   color: '#4db8ff',  bg: '#4db8ff22' },
  preparando: { label: 'Preparando', color: '#f39c12',  bg: '#f39c1222' },
  listo:      { label: 'Listo',      color: '#2ecc71',  bg: '#2ecc7122' },
  en_camino:  { label: 'En camino',  color: '#9b59b6',  bg: '#9b59b622' },
  entregado:  { label: 'Entregado',  color: '#2ecc71',  bg: '#2ecc7122' },
  cancelado:  { label: 'Cancelado',  color: '#e74c3c',  bg: '#e74c3c22' },
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR')
}

function fmtFecha(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function PescaderiaDetalle({ pescaderia, onVolver }) {
  const [tab, setTab] = useState('pedidos') // 'pedidos' | 'clientes' | 'miembros'
  const [miembros, setMiembros] = useState([])
  const [cargandoMiembros, setCargandoMiembros] = useState(false)
  const [emailNuevo, setEmailNuevo] = useState('')
  const [rolNuevo, setRolNuevo] = useState('colaborador')
  const [msgMiembros, setMsgMiembros] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [noExiste, setNoExiste] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [reseteando, setReseteando] = useState(false)
  const [avisoReset, setAvisoReset] = useState(null)

  async function handleReset() {
    const total = datos?.pedidos?.length || 0
    const ok = window.confirm(
      `¿Borrar los ${total} pedido(s) de "${pescaderia.nombre}" y reiniciar la numeración?\n\n` +
      `Esto borra los pedidos (y sus movimientos de cuenta corriente) de esta pescadería. No se puede deshacer.`
    )
    if (!ok) return
    setReseteando(true)
    setAvisoReset(null)
    const res = await resetPedidosPescaderia(pescaderia.id)
    setReseteando(false)
    if (res?.error) {
      setAvisoReset({ tipo: 'error', texto: res.error })
      return
    }
    setAvisoReset({ tipo: 'ok', texto: `Listo: ${res.borrados} pedido(s) borrados. El próximo pedido será #${res.proximo}.` })
    // Recargar el detalle
    setCargando(true)
    getPescaderiaDetalle(pescaderia.id).then((r) => {
      if (!r.error) setDatos(r)
      setCargando(false)
    })
  }

  async function cargarMiembros() {
    setCargandoMiembros(true)
    const res = await getMiembrosTienda(pescaderia.id)
    setCargandoMiembros(false)
    if (!res.error) setMiembros(res.miembros || [])
  }

  useEffect(() => {
    setCargando(true)
    setError(null)
    getPescaderiaDetalle(pescaderia.id).then((res) => {
      if (res.error) setError(res.error)
      else setDatos(res)
      setCargando(false)
    })
  }, [pescaderia.id])

  useEffect(() => {
    if (tab === 'miembros') cargarMiembros()
  }, [tab])

  const pedidosFiltrados = (datos?.pedidos || []).filter((p) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      String(p.numero).includes(q) ||
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.estado?.toLowerCase().includes(q)
    )
  })

  const clientesFiltrados = (datos?.clientes || []).filter((c) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ animation: 'bmFadeUp 0.35s ease both' }}>

      {/* Header de vuelta */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onVolver}
          className="w-9 h-9 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center text-white text-lg active:scale-95 transition-transform hover:border-white/25"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight">{pescaderia.nombre}</h2>
          <p className="text-xs text-white/40">/{pescaderia.slug}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
            pescaderia.plan === 'trial' ? 'bg-[#f39c12]/15 text-[#f39c12]' : 'bg-[#4db8ff]/15 text-[#4db8ff]'
          }`}>
            {pescaderia.plan}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${pescaderia.activa ? 'bg-[#2ecc71]' : 'bg-white/20'}`}
                style={pescaderia.activa ? { boxShadow: '0 0 8px rgba(46,204,113,0.6)' } : {}} />
        </div>
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <div className="text-3xl mb-3 opacity-50">🐟</div>
          <p className="text-sm">Cargando datos...</p>
        </div>
      ) : error ? (
        <div className="bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded-2xl px-4 py-3 text-sm text-[#e74c3c]">
          {error}
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Clientes', valor: datos.metricas.totalClientes, color: '#4db8ff' },
              { label: 'Pedidos totales', valor: datos.metricas.totalPedidos, color: '#2ecc71' },
              { label: 'Este mes', valor: datos.metricas.pedidosMes, color: '#f39c12' },
              { label: 'Facturado', valor: fmt(datos.metricas.totalFacturado), color: '#9b59b6', grande: true },
            ].map((m) => (
              <div key={m.label} className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">{m.label}</div>
                <div className={`${m.grande ? 'text-lg' : 'text-2xl'} font-extrabold`} style={{ color: m.color }}>
                  {m.valor}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.05] border border-white/10 rounded-xl p-1 mb-4">
            {[
              { id: 'pedidos', label: `Pedidos (${datos.pedidos.length})` },
              { id: 'clientes', label: `Clientes (${datos.clientes.length})` },
              { id: 'miembros', label: `👥 Miembros` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setBusqueda('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-[#4db8ff] text-[#03174a]'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex items-center gap-2.5 bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 mb-4">
            <span className="text-white/30 text-sm">🔍</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={tab === 'pedidos' ? 'Buscar por número, cliente o estado...' : 'Buscar por nombre, email o teléfono...'}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="text-white/30 hover:text-white text-xs">✕</button>
            )}
          </div>

          {/* TAB PEDIDOS */}
          {tab === 'pedidos' && (
            <div className="space-y-2">
              {pedidosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  {busqueda ? 'Sin resultados para esa búsqueda.' : 'Esta pescadería no tiene pedidos todavía.'}
                </div>
              ) : (
                pedidosFiltrados.map((p) => {
                  const est = ESTADOS[p.estado] || ESTADOS.nuevo
                  return (
                    <div key={p.id}
                      className="bg-white/[0.05] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-white/15 transition-colors"
                    >
                      {/* Número */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 bg-white/[0.07] text-white/60">
                        #{p.numero}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{p.cliente_nombre}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                            style={{ background: est.bg, color: est.color }}
                          >
                            {est.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/35 mt-0.5 flex items-center gap-2">
                          <span>{fmtFecha(p.created_at)}</span>
                          <span>·</span>
                          <span>{p.tipo_entrega === 'delivery' ? '🏠 Envío' : '🏪 Retiro'}</span>
                          <span>·</span>
                          <span>{p.metodo_pago === 'efectivo' ? '💵' : p.metodo_pago === 'transferencia' ? '🏦' : '💳'} {p.metodo_pago}</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-base font-extrabold text-[#4db8ff] shrink-0">
                        {fmt(p.total)}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Resetear numeración */}
              <div className="mt-6 pt-5 border-t border-white/8">
                {avisoReset && (
                  <div className={`mb-3 px-4 py-3 rounded-xl text-sm ${
                    avisoReset.tipo === 'ok'
                      ? 'bg-[#2ecc71]/12 border border-[#2ecc71]/30 text-[#2ecc71]'
                      : 'bg-[#e74c3c]/12 border border-[#e74c3c]/30 text-[#e74c3c]'
                  }`}>
                    {avisoReset.texto}
                  </div>
                )}
                <button
                  onClick={handleReset}
                  disabled={reseteando}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-[#e74c3c]/12 border border-[#e74c3c]/30 text-[#e74c3c] active:scale-[0.99] transition-transform hover:bg-[#e74c3c]/20 disabled:opacity-60"
                >
                  {reseteando ? 'Reseteando...' : '🔄 Resetear numeración (borra los pedidos)'}
                </button>
                <p className="text-[11px] text-white/35 mt-2 text-center">
                  Borra los pedidos de esta pescadería y reinicia el contador. El número de pedido es global; vuelve a #1 si no quedan pedidos en ninguna pescadería.
                </p>
              </div>
            </div>
          )}
          {tab === 'clientes' && (
            <div className="space-y-2">
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-sm">
                  {busqueda ? 'Sin resultados para esa búsqueda.' : 'Esta pescadería no tiene clientes registrados.'}
                </div>
              ) : (
                clientesFiltrados.map((c) => (
                  <div key={c.id}
                    className="bg-white/[0.05] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-white/15 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/25 flex items-center justify-center text-base shrink-0">
                      👤
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.nombre || '—'}</div>
                      <div className="text-[11px] text-white/35 mt-0.5 flex items-center gap-2 flex-wrap">
                        {c.email && <span>{c.email}</span>}
                        {c.telefono && <><span>·</span><span>📱 {c.telefono}</span></>}
                        <span>·</span>
                        <span>desde {fmtFecha(c.created_at)}</span>
                      </div>
                    </div>

                    {/* CC */}
                    <div className="shrink-0 text-right">
                      {c.cc_habilitada ? (
                        <div>
                          <div className="text-[10px] text-white/35 uppercase tracking-wide">Cta. cte.</div>
                          <div className={`text-sm font-extrabold ${Number(c.cc_saldo) > 0 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                            {fmt(c.cc_saldo)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/20 uppercase tracking-wide">Sin CC</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB MIEMBROS ── */}
          {tab === 'miembros' && (
            <div className="space-y-4">

              {/* Agregar miembro */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="text-sm font-bold text-white">➕ Agregar miembro</div>
                <input
                  value={emailNuevo}
                  onChange={(e) => setEmailNuevo(e.target.value)}
                  placeholder="email@gmail.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
                />
                <div className="flex gap-2">
                  {[
                    { val: 'colaborador', label: '👤 Colaborador', desc: 'Pedidos y productos' },
                    { val: 'full',        label: '⚡ Full',        desc: 'Acceso total' },
                  ].map((r) => (
                    <button key={r.val} onClick={() => setRolNuevo(r.val)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${rolNuevo === r.val ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.06] text-white/60 border border-white/10'}`}>
                      <div>{r.label}</div>
                      <div className={`text-[10px] mt-0.5 ${rolNuevo === r.val ? 'text-[#03174a]/70' : 'text-white/35'}`}>{r.desc}</div>
                    </button>
                  ))}
                </div>
                {/* Usuario no existe → ofrecer invitación por WhatsApp */}
                {noExiste && (
                  <div className="bg-[#f39c12]/10 border border-[#f39c12]/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-white/70">
                      <span className="text-[#f39c12] font-bold">"{emailNuevo}"</span> todavía no se registró en BlueMarket.
                      Podés invitarlo por WhatsApp para que entre y se registre.
                    </p>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${pescaderia.emoji_rubro || '🛒'} *${pescaderia.nombre}* te invita a sumarte a BlueMarket!\n\nEntrá con tu cuenta de Google y empezá a gestionar la tienda:\nhttps://bluemarket-two.vercel.app/t/${pescaderia.slug}\n\n_Es gratis y rápido_ ✅`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform">
                      💬 Invitar por WhatsApp
                    </a>
                    <p className="text-[10px] text-white/35 text-center">
                      Después de que se registre, volvé a agregarlo acá.
                    </p>
                  </div>
                )}

                {msgMiembros && !noExiste && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${msgMiembros.ok ? 'bg-[#2ecc71]/12 text-[#2ecc71]' : 'bg-[#e74c3c]/12 text-[#e74c3c]'}`}>
                    {msgMiembros.texto}
                  </div>
                )}
                <button
                  disabled={agregando || !emailNuevo.trim()}
                  onClick={async () => {
                    setAgregando(true); setMsgMiembros(null); setNoExiste(false)
                    const res = await agregarMiembro(pescaderia.id, emailNuevo.trim(), rolNuevo)
                    setAgregando(false)
                    if (res.error && res.error.includes('No existe')) {
                      setNoExiste(true)
                      return
                    }
                    if (res.error) { setMsgMiembros({ ok: false, texto: res.error }); return }
                    setMsgMiembros({ ok: true, texto: `✓ ${res.nombre} agregado como ${rolNuevo}` })
                    setEmailNuevo(''); setNoExiste(false)
                    cargarMiembros()
                  }}
                  className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50">
                  {agregando ? 'Agregando...' : 'Agregar'}
                </button>
              </div>

              {/* Lista de miembros */}
              {cargandoMiembros ? (
                <div className="text-center py-6 text-white/40 text-sm">Cargando...</div>
              ) : miembros.length === 0 ? (
                <div className="text-center py-6 text-white/40 text-sm">Sin miembros todavía.</div>
              ) : (
                <div className="space-y-2">
                  {miembros.map((m) => (
                    <div key={m.id} className="bg-white/[0.05] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/25 flex items-center justify-center text-base shrink-0">
                        {m.rol_tienda === 'admin' ? '👑' : m.rol_tienda === 'full' ? '⚡' : '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-semibold truncate">{m.nombre || m.email}</div>
                        <div className="text-[11px] text-white/40 truncate">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Cambiar rol (no al admin) */}
                        {m.rol_tienda !== 'admin' && (
                          <select
                            value={m.rol_tienda}
                            onChange={async (e) => {
                              await cambiarRolMiembro(m.id, e.target.value)
                              cargarMiembros()
                            }}
                            className="bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
                            <option value="colaborador">Colaborador</option>
                            <option value="full">Full</option>
                          </select>
                        )}
                        {m.rol_tienda === 'admin' && (
                          <span className="text-[11px] text-[#f39c12] font-bold px-2 py-1 bg-[#f39c12]/10 rounded-lg">Admin</span>
                        )}
                        {/* Quitar (no al admin) */}
                        {m.rol_tienda !== 'admin' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Quitar a ${m.nombre || m.email} de esta tienda?`)) return
                              const res = await quitarMiembro(m.id)
                              if (res.error) { setMsgMiembros({ ok: false, texto: res.error }); return }
                              cargarMiembros()
                            }}
                            className="text-[#e74c3c] text-sm px-2 py-1.5 bg-[#e74c3c]/10 rounded-lg active:scale-95 transition-transform">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-white/30 text-center">
                👑 Admin · acceso total + gestión de miembros<br/>
                ⚡ Full · acceso total sin gestión<br/>
                👤 Colaborador · solo pedidos y productos
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
