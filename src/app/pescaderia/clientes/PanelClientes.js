'use client'

import { useState } from 'react'
import { configurarCC, registrarPago, registrarCargo, traerMovimientos, borrarCliente } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'

export default function PanelClientes({ clientes, nombrePescaderia }) {
  const [expandido, setExpandido] = useState(null)      // cliente abierto
  const [mensaje, setMensaje] = useState(null)
  const [accion, setAccion] = useState(null)            // 'config' | 'pago' | 'movimientos'
  const [cargando, setCargando] = useState(false)

  // formularios
  const [limiteInput, setLimiteInput] = useState('')
  const [habilitadaInput, setHabilitadaInput] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [notaPago, setNotaPago] = useState('')
  const [movimientos, setMovimientos] = useState([])

  function fmt(n) {
    return '$' + Number(n || 0).toLocaleString('es-AR')
  }
  function fmtFecha(f) {
    return new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function abrir(cli, cualAccion) {
    if (expandido === cli.id && accion === cualAccion) {
      setExpandido(null); setAccion(null); return
    }
    setExpandido(cli.id)
    setAccion(cualAccion)
    setMensaje(null)
    if (cualAccion === 'config') {
      setHabilitadaInput(cli.cc_habilitada)
      setLimiteInput(cli.cc_limite ?? '')
    }
    if (cualAccion === 'pago') {
      setMontoPago(''); setNotaPago('')
    }
    if (cualAccion === 'movimientos') {
      cargarMovimientos(cli.id)
    }
  }

  async function cargarMovimientos(clienteId) {
    setMovimientos([])
    const res = await traerMovimientos(clienteId)
    if (res.ok) setMovimientos(res.movimientos)
  }

  async function guardarConfig(cli) {
    setCargando(true); setMensaje(null)
    const res = await configurarCC(cli.id, habilitadaInput, limiteInput)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else { setMensaje({ tipo: 'ok', texto: 'Configuración guardada ✓' }); setExpandido(null); setAccion(null) }
    setCargando(false)
  }

  async function eliminarCliente(cli) {
    if (!confirm(`¿Eliminar al cliente "${cli.nombre}"? Se borrará su historial de cuenta corriente. Esta acción no se puede deshacer.`)) return
    setCargando(true); setMensaje(null)
    const res = await borrarCliente(cli.id)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else { setMensaje({ tipo: 'ok', texto: 'Cliente eliminado ✓' }); setExpandido(null); setAccion(null) }
    setCargando(false)
  }

  async function guardarPago(cli) {
    setCargando(true); setMensaje(null)
    const res = await registrarPago(cli.id, montoPago, notaPago)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else { setMensaje({ tipo: 'ok', texto: `Pago registrado ✓ Nuevo saldo: ${fmt(res.nuevoSaldo)}` }); setExpandido(null); setAccion(null) }
    setCargando(false)
  }

  // Clientes con deuda primero
  const conCC = clientes.filter((c) => c.cc_habilitada)
  const deudaTotal = conCC.reduce((acc, c) => acc + (Number(c.cc_saldo) || 0), 0)

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <BarraUsuario perfil="pescaderia" />

      <div className="relative max-w-3xl mx-auto p-5">

        {/* Header */}
        <div className="mb-5">
          <a href="/pescaderia" className="text-xs text-[#4db8ff] hover:underline">← Volver a pedidos</a>
          <h1 className="text-lg font-extrabold leading-tight mt-1">Clientes y cuenta corriente</h1>
          <p className="text-xs text-white/40 truncate">{nombrePescaderia}</p>
        </div>

        {/* Resumen deuda */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wide">Clientes con CC</div>
            <div className="text-xl font-extrabold mt-1 text-[#4db8ff]">{conCC.length}</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wide">Deuda total</div>
            <div className="text-xl font-extrabold mt-1 text-[#f39c12] truncate">{fmt(deudaTotal)}</div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            mensaje.tipo === 'error'
              ? 'bg-[#e74c3c]/15 border-[#e74c3c]/30 text-[#e74c3c]'
              : 'bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#2ecc71]'
          }`}>{mensaje.texto}</div>
        )}

        {/* Lista de clientes */}
        {clientes.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.03] border border-white/8 rounded-2xl">
            <div className="text-4xl mb-3 opacity-40">👥</div>
            <p className="text-white/45 text-sm">Todavía no tenés clientes.<br />Aparecen acá cuando alguien te hace un pedido.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {clientes.map((cli, idx) => {
              const saldo = Number(cli.cc_saldo) || 0
              const tieneDeuda = saldo > 0
              const estaAbierto = expandido === cli.id
              return (
                <div key={cli.id}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
                  style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.04}s` }}>

                  {/* Fila principal */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{cli.nombre}</span>
                        {cli.cc_habilitada && (
                          <span className="text-[9px] bg-[#4db8ff]/15 text-[#4db8ff] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">CC</span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 truncate">{cli.email || cli.telefono || 'sin contacto'}</div>
                    </div>
                    {cli.cc_habilitada && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white/40 uppercase">Saldo</div>
                        <div className={`text-base font-extrabold ${tieneDeuda ? 'text-[#f39c12]' : 'text-[#2ecc71]'}`}>
                          {fmt(saldo)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
                    <button onClick={() => abrir(cli, 'config')}
                      className="flex-1 bg-white/[0.07] border border-white/10 text-white text-xs font-medium py-2 rounded-lg active:scale-95 transition-all">
                      ⚙️ Cuenta corriente
                    </button>
                    {cli.cc_habilitada && (
                      <>
                        <button onClick={() => abrir(cli, 'pago')}
                          className="flex-1 bg-[#2ecc71]/15 border border-[#2ecc71]/25 text-[#2ecc71] text-xs font-medium py-2 rounded-lg active:scale-95 transition-all">
                          💵 Registrar pago
                        </button>
                        <button onClick={() => abrir(cli, 'movimientos')}
                          className="bg-white/[0.07] border border-white/10 text-white text-xs font-medium py-2 px-3 rounded-lg active:scale-95 transition-all">
                          📋
                        </button>
                      </>
                    )}
                  </div>

                  {/* Panel expandible: CONFIGURAR CC */}
                  {estaAbierto && accion === 'config' && (
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-3" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={habilitadaInput}
                          onChange={(e) => setHabilitadaInput(e.target.checked)}
                          className="w-4 h-4 accent-[#4db8ff]" />
                        <span className="text-sm text-white">Habilitar cuenta corriente (puede comprar fiado)</span>
                      </label>
                      {habilitadaInput && (
                        <div>
                          <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Límite de crédito (opcional)</label>
                          <input type="number" inputMode="numeric" value={limiteInput}
                            onChange={(e) => setLimiteInput(e.target.value)}
                            placeholder="Ej: 50000 (vacío = sin límite)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
                        </div>
                      )}
                      <button onClick={() => guardarConfig(cli)} disabled={cargando}
                        className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-60">
                        {cargando ? 'Guardando...' : 'Guardar'}
                      </button>

                      <div className="pt-2 mt-1 border-t border-white/8">
                        <button onClick={() => eliminarCliente(cli)} disabled={cargando}
                          className="w-full text-[#e74c3c] text-xs font-medium py-2 rounded-lg hover:bg-[#e74c3c]/10 transition-colors disabled:opacity-50">
                          🗑 Eliminar cliente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Panel expandible: REGISTRAR PAGO */}
                  {estaAbierto && accion === 'pago' && (
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-3" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                      <div className="text-sm text-white/70">
                        Saldo actual: <span className="font-bold text-[#f39c12]">{fmt(saldo)}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">¿Cuánto paga?</label>
                        <input type="number" inputMode="numeric" value={montoPago}
                          onChange={(e) => setMontoPago(e.target.value)}
                          placeholder="Monto del pago"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nota (opcional)</label>
                        <input value={notaPago} onChange={(e) => setNotaPago(e.target.value)}
                          placeholder="Ej: pago en efectivo"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
                      </div>
                      <button onClick={() => guardarPago(cli)} disabled={cargando}
                        className="w-full bg-[#2ecc71] text-[#03174a] font-bold py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-60">
                        {cargando ? 'Registrando...' : 'Registrar pago'}
                      </button>
                    </div>
                  )}

                  {/* Panel expandible: MOVIMIENTOS */}
                  {estaAbierto && accion === 'movimientos' && (
                    <div className="mt-3 pt-3 border-t border-white/8" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
                      <div className="text-xs text-white/50 uppercase tracking-wide mb-2">Últimos movimientos</div>
                      {movimientos.length === 0 ? (
                        <p className="text-white/40 text-sm py-3 text-center">Sin movimientos todavía.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {movimientos.map((m) => (
                            <div key={m.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    m.tipo === 'pago' ? 'bg-[#2ecc71]/15 text-[#2ecc71]' : 'bg-[#f39c12]/15 text-[#f39c12]'
                                  }`}>
                                    {m.tipo === 'pago' ? '↓ Pago' : '↑ Cargo'}
                                  </span>
                                  <span className="text-[11px] text-white/35">{fmtFecha(m.created_at)}</span>
                                </div>
                                {m.nota && <div className="text-[11px] text-white/45 mt-0.5 truncate">{m.nota}</div>}
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <div className={`text-sm font-bold ${m.tipo === 'pago' ? 'text-[#2ecc71]' : 'text-[#f39c12]'}`}>
                                  {m.tipo === 'pago' ? '-' : '+'}{fmt(m.monto)}
                                </div>
                                <div className="text-[10px] text-white/35">saldo: {fmt(m.saldo_despues)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
