'use client'

import { useState } from 'react'

// Pantalla de checkout. Recibe el carrito y una función para volver/confirmar.
export default function Checkout({ carrito, onVolver, onConfirmar, cargando, errorExterno, ccHabilitada, necesitaLogin, onLogin, invitado }) {
  const [entrega, setEntrega] = useState(invitado ? 'envio' : 'retiro')   // 'envio' | 'retiro'
  const [pago, setPago] = useState('efectivo')       // 'efectivo' | 'transferencia'
  const [direccion, setDireccion] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState(null)

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  const totalPrecio = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0)

  function confirmar() {
    setError(null)
    if (entrega === 'envio' && !direccion.trim()) {
      setError('Necesitamos tu dirección para el envío')
      return
    }
    onConfirmar({
      entrega,
      pago,
      direccion: entrega === 'envio' ? direccion.trim() : null,
      nota: nota.trim() || null,
      total: totalPrecio,
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

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bm-no-scrollbar space-y-5">

        {/* ENTREGA */}
        <div>
          <h2 className="text-xs text-white/50 uppercase tracking-wide mb-2.5 font-bold">¿Cómo lo recibís?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => invitado && setEntrega('envio')}
              disabled={!invitado}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                !invitado
                  ? 'bg-white/[0.02] border-white/8 opacity-50 cursor-not-allowed'
                  : entrega === 'envio' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-sm font-bold text-white">Envío a domicilio</div>
              <div className="text-[11px] text-white/45 mt-0.5">{invitado ? 'Te lo llevamos' : '🔒 Solo invitados'}</div>
            </button>
            <button onClick={() => setEntrega('retiro')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                entrega === 'retiro' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <div className="text-2xl mb-1">🏪</div>
              <div className="text-sm font-bold text-white">Retiro en local</div>
              <div className="text-[11px] text-white/45 mt-0.5">Lo pasás a buscar</div>
            </button>
          </div>
        </div>

        {/* DIRECCIÓN (solo si es envío) */}
        {entrega === 'envio' && (
          <div style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <h2 className="text-xs text-white/50 uppercase tracking-wide mb-2.5 font-bold">Dirección de entrega</h2>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, piso, localidad"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
            />
          </div>
        )}

        {/* PAGO */}
        <div>
          <h2 className="text-xs text-white/50 uppercase tracking-wide mb-2.5 font-bold">¿Cómo pagás?</h2>
          <div className="space-y-2">
            <button onClick={() => setPago('efectivo')}
              className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                pago === 'efectivo' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <span className="text-2xl">💵</span>
              <span className="text-sm font-bold text-white">Efectivo al recibir</span>
            </button>
            <button onClick={() => setPago('transferencia')}
              className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                pago === 'transferencia' ? 'bg-[#4db8ff]/15 border-[#4db8ff]' : 'bg-white/[0.05] border-white/10'
              }`}>
              <span className="text-2xl">🏦</span>
              <span className="text-sm font-bold text-white">Transferencia</span>
            </button>
            {ccHabilitada && (
              <button onClick={() => setPago('cuenta_corriente')}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  pago === 'cuenta_corriente' ? 'bg-[#2ecc71]/15 border-[#2ecc71]' : 'bg-white/[0.05] border-white/10'
                }`}>
                <span className="text-2xl">📒</span>
                <div className="text-left">
                  <span className="text-sm font-bold text-white block">Cuenta corriente</span>
                  <span className="text-[10px] text-white/45">Se suma a tu cuenta para pagar después</span>
                </div>
              </button>
            )}
            <div className="w-full p-3.5 rounded-2xl border border-white/8 bg-white/[0.02] flex items-center gap-3 opacity-50">
              <span className="text-2xl">💳</span>
              <div>
                <span className="text-sm font-bold text-white/60">Mercado Pago</span>
                <span className="text-[10px] text-white/40 ml-2">próximamente</span>
              </div>
            </div>
          </div>
        </div>

        {/* NOTA */}
        <div>
          <h2 className="text-xs text-white/50 uppercase tracking-wide mb-2.5 font-bold">Aclaraciones (opcional)</h2>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: sin escamas, tocar timbre 2B, llamar al llegar..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff] resize-none"
          />
        </div>

        {/* RESUMEN */}
        <div>
          <h2 className="text-xs text-white/50 uppercase tracking-wide mb-2.5 font-bold">Tu pedido ({totalItems})</h2>
          <div className="bg-white/[0.05] border border-white/8 rounded-2xl p-4 space-y-2.5">
            {carrito.map((item) => (
              <div key={item.producto.id} className="flex items-center justify-between text-sm">
                <span className="text-white/70">
                  <span className="text-white/40">{item.cantidad}×</span> {item.producto.emoji} {item.producto.nombre}
                </span>
                <span className="text-white font-semibold">{fmt(item.producto.precio * item.cantidad)}</span>
              </div>
            ))}
            <div className="border-t border-white/8 pt-2.5 flex items-center justify-between">
              <span className="text-white/55 text-sm">Total</span>
              <span className="text-xl font-extrabold text-[#4db8ff]">{fmt(totalPrecio)}</span>
            </div>
          </div>
        </div>

        {(error || errorExterno) && !necesitaLogin && (
          <div className="px-4 py-3 rounded-xl text-sm bg-[#e74c3c]/15 border border-[#e74c3c]/30 text-[#e74c3c]">
            {error || errorExterno}
          </div>
        )}

        {necesitaLogin && (
          <div className="px-4 py-4 rounded-xl bg-[#4db8ff]/10 border border-[#4db8ff]/30 text-center">
            <div className="text-2xl mb-2">🔑</div>
            <p className="text-sm text-white font-semibold mb-1">Iniciá sesión para confirmar</p>
            <p className="text-[12px] text-white/55 mb-3">Necesitamos saber quién sos para enviarte el pedido. Tu carrito se mantiene.</p>
            <button onClick={onLogin}
              className="w-full bg-white text-[#03174a] font-bold py-3 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <span>Continuar con Google</span>
            </button>
          </div>
        )}

      </div>

      {/* Footer fijo */}
      {!necesitaLogin && (
        <div className="shrink-0 px-4 py-4 border-t border-white/8 bg-[#03174a]">
          <button
            onClick={confirmar}
            disabled={cargando}
            className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60">
            {cargando ? 'Confirmando...' : `Confirmar pedido · ${fmt(totalPrecio)}`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
