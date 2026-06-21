'use client'

import { useState } from 'react'

// Pantalla de checkout. Recibe el carrito y una función para volver/confirmar.
export default function Checkout({ carrito, onVolver, onConfirmar, cargando, errorExterno, ccHabilitada, necesitaLogin, onLogin, modalidad, soloDelivery, retorno, envioModo, envioGratisDesde, mpActivo }) {
  const puedeEnvio = modalidad !== 'solo_local'
  const puedeRetiro = modalidad !== 'solo_reparto' && !soloDelivery
  const [entrega, setEntrega] = useState(puedeEnvio ? 'envio' : 'retiro')
  const [pago, setPago] = useState('efectivo')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState(null)
  const [usarRetorno, setUsarRetorno] = useState(false)
  const [franja, setFranja] = useState('cualquiera')

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  // Cantidad legible: "½ kg", "1¼ kg"... para productos por peso; "2×" para el resto
  function fmtCant(c, unidad) {
    if (unidad !== 'kg') return `${c}×`
    const entero = Math.floor(c + 1e-9)
    const frac = +(c - entero).toFixed(2)
    const simb = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[frac]
    const txt = simb === undefined ? c.toLocaleString('es-AR') : (entero === 0 ? simb : `${entero}${simb}`)
    const gr = Math.round(Number(c) * 1000)
    return `${txt} kg · ${gr} g`
  }

  const hayPorPeso = carrito.some((i) => i.producto.unidad === 'kg')

  const totalPrecio = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0)

  // ── Retorno de fidelización ──
  const ret = retorno || { disponible: 0, maxTier: false, nivel: null }
  const hayRetorno = Number(ret.disponible) > 0 && !necesitaLogin
  const aplicaRetorno = hayRetorno && (ret.maxTier || usarRetorno)
  const descuentoRetorno = aplicaRetorno ? Math.min(Number(ret.disponible), totalPrecio) : 0
  const totalFinal = totalPrecio - descuentoRetorno

  // ── Envío: no se cobra un número fijo; o es gratis o se coordina ──
  const envModo = envioModo || 'gratis'
  const envDesde = Number(envioGratisDesde) || 0
  const esEnvio = soloDelivery || entrega === 'envio'
  let envioTexto = 'Gratis'
  let envioColor = '#2ecc71'
  let envioNota = null
  if (envModo === 'gratis_desde') {
    if (envDesde > 0 && totalPrecio >= envDesde) {
      envioTexto = '¡Gratis! 🎉'
    } else {
      envioTexto = 'A coordinar'
      envioColor = '#f39c12'
      const falta = envDesde - totalPrecio
      if (falta > 0) envioNota = `Comprando ${fmt(falta)} más, tu envío es gratis 🎉`
    }
  } else if (envModo === 'coordinar') {
    envioTexto = 'A coordinar'
    envioColor = '#f39c12'
    envioNota = 'El costo del envío lo coordinás con el local por WhatsApp.'
  }

  function confirmar() {
    setError(null)
    const entregaFinal = soloDelivery ? 'envio' : entrega
    if (entregaFinal === 'envio' && !direccion.trim()) {
      setError('Necesitamos tu dirección para el envío')
      return
    }
    if (!telefono.trim()) {
      setError('Necesitamos tu teléfono para coordinar por WhatsApp')
      return
    }
    onConfirmar({
      entrega: entregaFinal,
      pago,
      direccion: entregaFinal === 'envio' ? direccion.trim() : null,
      telefono: telefono.trim(),
      nota: nota.trim() || null,
      franja: entregaFinal === 'envio' && franja !== 'cualquiera' ? franja : null,
      total: totalFinal,
      usarRetorno: aplicaRetorno,
    })
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">

      {/* Cabecera */}
      <div className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3 border-b border-white/8">
        <button onClick={onVolver} className="w-9 h-9 bg-white/[0.07] border border-white/12 rounded-xl flex items-center justify-center text-white active:scale-95">
          ←
        </button>
        <h1 className="text-lg font-extrabold text-white">Confirmar pedido</h1>
      </div>

      {/* Login primero: si no inició sesión, ve solo esto */}
      {necesitaLogin && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm px-5 py-7 rounded-2xl bg-[#4db8ff]/10 border border-[#4db8ff]/30 text-center" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <div className="text-4xl mb-3">🔑</div>
            <p className="text-lg text-white font-bold mb-1.5">Iniciá sesión para confirmar</p>
            <p className="text-sm text-white/55 mb-5 leading-snug">Necesitamos saber quién sos para enviarte el pedido. Tu carrito se mantiene.</p>
            <button onClick={onLogin}
              className="w-full bg-white text-[#03174a] font-extrabold text-base py-3.5 rounded-xl active:scale-[0.98] transition-transform">
              Continuar con Google
            </button>
          </div>
        </div>
      )}

      {/* Contenido scrolleable (solo cuando ya inició sesión) */}
      {!necesitaLogin && (
      <div className="flex-1 overflow-y-auto px-4 py-4 bm-no-scrollbar space-y-5">

        {/* ENTREGA */}
        <div>
          <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">📦 ¿Cómo lo recibís?</h2>
          {soloDelivery ? (
            <div>
              <div className="p-3.5 rounded-2xl border border-[#4db8ff] bg-[#4db8ff]/15 text-left">
                <div className="text-2xl mb-1">🏠</div>
                <div className="text-base font-bold text-white">Envío a domicilio</div>
                <div className="text-[13px] text-white/55 mt-0.5">Te lo llevamos</div>
              </div>
              <div className="flex items-start gap-2 mt-2.5 px-1">
                <span className="text-[#f39c12] text-sm shrink-0">ℹ️</span>
                <p className="text-[13px] text-white/55 leading-relaxed">
                  Solo delivery disponible para tu primera compra. La pescadería te asignará el costo de envío y lo coordinará con vos.
                </p>
              </div>
            </div>
          ) : (
          <div className={`grid gap-2.5 ${puedeEnvio && puedeRetiro ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {puedeEnvio && (
            <button onClick={() => setEntrega('envio')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                entrega === 'envio' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-base font-bold text-white">Envío a domicilio</div>
              <div className="text-[13px] text-white/55 mt-0.5">Te lo llevamos</div>
            </button>
            )}
            {puedeRetiro && (
            <button onClick={() => setEntrega('retiro')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                entrega === 'retiro' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <div className="text-2xl mb-1">🏪</div>
              <div className="text-base font-bold text-white">Retiro en local</div>
              <div className="text-[13px] text-white/55 mt-0.5">Lo pasás a buscar</div>
            </button>
            )}
          </div>
          )}
        </div>

        {/* DIRECCIÓN (siempre si soloDelivery, o si eligió envío) */}
        {(soloDelivery || entrega === 'envio') && (
          <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">📍 ¿A dónde te lo llevamos?</h2>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, piso, localidad"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3.5 text-base text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
            />
          </div>
        )}

        {/* FRANJA HORARIA (solo envío) */}
        {(soloDelivery || entrega === 'envio') && (
          <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">🕒 ¿En qué horario te viene bien?</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'cualquiera', emoji: '🤷', label: 'Cualquiera' },
                { id: 'manana',     emoji: '☀️', label: 'Mañana' },
                { id: 'tarde',      emoji: '🌇', label: 'Tarde' },
                { id: 'noche',      emoji: '🌙', label: 'Noche' },
              ].map((f) => (
                <button key={f.id} onClick={() => setFranja(f.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    franja === f.id ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
                  }`}>
                  <span className="text-xl">{f.emoji}</span>
                  <span className="block text-base font-bold text-white mt-0.5">{f.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-white/45 mt-2">Es solo una preferencia; lo coordinamos por WhatsApp.</p>
          </div>
        )}

        {/* TELÉFONO */}
        <div>
          <h2 className="text-[15px] text-white/85 mb-1.5 font-bold">📱 Tu teléfono</h2>
          <p className="text-[13px] text-white/55 mb-2.5 leading-relaxed">
            📲 La pescadería te va a contactar por <span className="text-[#25D366] font-semibold">WhatsApp</span> para coordinar el pedido.
          </p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 focus-within:border-[#25D366]/60 transition-colors">
            <span className="text-[#25D366] text-lg shrink-0">📱</span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 11 2345-6789"
              type="tel"
              inputMode="tel"
              className="flex-1 bg-transparent text-base text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>

        {/* PAGO */}
        <div>
          <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">💳 ¿Cómo pagás?</h2>
          <div className="space-y-2">
            <button onClick={() => setPago('efectivo')}
              className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                pago === 'efectivo' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <span className="text-2xl">💵</span>
              <span className="text-base font-bold text-white">Efectivo al recibir</span>
            </button>
            <button onClick={() => setPago('transferencia')}
              className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                pago === 'transferencia' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <span className="text-2xl">🏦</span>
              <span className="text-base font-bold text-white">Transferencia</span>
            </button>
            {mpActivo && (
              <button onClick={() => setPago('mercadopago')}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pago === 'mercadopago' ? 'bg-[#009ee3]/20 border-[#009ee3]' : 'bg-white/[0.05] border-white/10'
                }`}>
                <span className="text-2xl">💳</span>
                <div className="text-left">
                  <span className="text-base font-bold text-white block">Mercado Pago</span>
                  <span className="text-[10px] text-white/45">Pagás online ahora, con tarjeta o dinero en cuenta</span>
                </div>
              </button>
            )}
            {ccHabilitada && (
              <button onClick={() => setPago('cuenta_corriente')}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pago === 'cuenta_corriente' ? 'bg-[#2ecc71]/15 border-[#2ecc71]' : 'bg-white/[0.05] border-white/10'
                }`}>
                <span className="text-2xl">📒</span>
                <div className="text-left">
                  <span className="text-base font-bold text-white block">Cuenta corriente</span>
                  <span className="text-[10px] text-white/45">Se suma a tu cuenta para pagar después</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* NOTA */}
        <div>
          <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">📝 Aclaraciones (opcional)</h2>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: sin escamas, tocar timbre 2B, llamar al llegar..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3.5 text-base text-white placeholder-white/30 outline-none focus:border-[#4db8ff] resize-none"
          />
        </div>

        {/* RETORNO DE FIDELIZACIÓN */}
        {hayRetorno && (
          ret.maxTier ? (
            <div className="px-4 py-3 rounded-2xl bg-[#2ecc71]/12 border border-[#2ecc71]/30">
              <div className="flex items-center gap-2 text-[#2ecc71] font-bold text-sm mb-0.5">
                <span>🎁</span> Nivel máximo
              </div>
              <p className="text-[12px] text-white/70">
                Se descuenta tu retorno de <span className="font-bold text-white">{fmt(ret.disponible)}</span> en esta compra automáticamente.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setUsarRetorno((v) => !v)}
              className={`w-full px-4 py-3 rounded-2xl border text-left transition-colors ${usarRetorno ? 'bg-[#2ecc71]/12 border-[#2ecc71]/40' : 'bg-white/[0.05] border-white/10'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">🎁 Usar mi retorno</div>
                  <div className="text-[12px] text-white/55">Tenés {fmt(ret.disponible)} acumulado. Si lo usás, tu mes vuelve a empezar.</div>
                </div>
                <div className={`w-6 h-6 rounded-md shrink-0 border flex items-center justify-center ${usarRetorno ? 'bg-[#2ecc71] border-[#2ecc71]' : 'border-white/30'}`}>
                  {usarRetorno && <span className="text-[#03174a] text-sm font-bold">✓</span>}
                </div>
              </div>
            </button>
          )
        )}

        {/* RESUMEN */}
        <div>
          <h2 className="text-[15px] text-white/85 mb-2.5 font-bold">🧾 Tu pedido ({totalItems})</h2>
          <div className="bg-white/[0.05] border border-white/8 rounded-2xl p-4 space-y-2.5">
            {carrito.map((item) => (
              <div key={item.producto.id} className="flex items-center justify-between text-base">
                <span className="text-white/80">
                  <span className="text-[#4db8ff] font-bold">{fmtCant(item.cantidad, item.producto.unidad)}</span> {item.producto.emoji} {item.producto.nombre}
                </span>
                <span className="text-white font-semibold">{fmt(item.producto.precio * item.cantidad)}</span>
              </div>
            ))}
            {descuentoRetorno > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#2ecc71]">🎁 Retorno aplicado</span>
                <span className="text-[#2ecc71] font-semibold">−{fmt(descuentoRetorno)}</span>
              </div>
            )}
            {esEnvio && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">🚚 Envío</span>
                <span className="font-bold" style={{ color: envioColor }}>{envioTexto}</span>
              </div>
            )}
            <div className="border-t border-white/8 pt-2.5 flex items-center justify-between">
              <span className="text-white/70 text-base">{hayPorPeso ? 'Total estimado' : 'Total'}</span>
              <span className="text-2xl font-extrabold text-[#4db8ff]">{hayPorPeso ? '~' : ''}{fmt(totalFinal)}</span>
            </div>
            {esEnvio && envioNota && (
              <p className="text-[12px] leading-snug pt-1" style={{ color: '#f39c12' }}>{envioNota}</p>
            )}
            {hayPorPeso && (
              <p className="text-[13px] text-white/55 leading-snug flex items-start gap-1.5 pt-1">
                <span className="shrink-0">⚖️</span>
                <span>Los productos por kg se pesan al preparar. El importe final puede variar según el corte.</span>
              </p>
            )}
          </div>
        </div>

        {(error || errorExterno) && !necesitaLogin && (
          <div className="px-4 py-3 rounded-xl text-sm bg-[#e74c3c]/15 border border-[#e74c3c]/30 text-[#e74c3c]">
            {error || errorExterno}
          </div>
        )}

      </div>
      )}

      {/* Footer fijo */}
      {!necesitaLogin && (
        <div className="shrink-0 px-4 py-4 border-t border-white/8 bg-[#03174a]">
          <button
            onClick={confirmar}
            disabled={cargando}
            className="w-full bg-[#4db8ff] text-[#03174a] font-extrabold text-lg py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60">
            {cargando ? 'Confirmando...' : (pago === 'mercadopago' ? `Pagar con Mercado Pago · ${hayPorPeso ? '~' : ''}${fmt(totalFinal)}` : `Confirmar pedido · ${hayPorPeso ? '~' : ''}${fmt(totalFinal)}`)}
          </button>
        </div>
      )}

      <style>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
