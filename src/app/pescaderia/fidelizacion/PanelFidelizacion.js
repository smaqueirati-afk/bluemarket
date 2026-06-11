'use client'

import { useState } from 'react'
import { guardarConfigFidelizacion } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'

const NIVELES = [
  { key: 'bronce', label: 'Bronce', emoji: '🥉', color: '#cd7f32' },
  { key: 'plata', label: 'Plata', emoji: '🥈', color: '#c0c0c0' },
  { key: 'oro', label: 'Oro', emoji: '🥇', color: '#ffd700' },
  { key: 'diamante', label: 'Diamante', emoji: '💎', color: '#4db8ff' },
]

export default function PanelFidelizacion({ config }) {
  const [activo, setActivo] = useState(!!config?.activo)
  const [valores, setValores] = useState(() => {
    const v = {}
    for (const n of NIVELES) {
      v[`${n.key}_min`] = config?.[`${n.key}_min`] ?? ''
      v[`${n.key}_pct`] = config?.[`${n.key}_pct`] ?? ''
    }
    return v
  })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  function set(campo, val) {
    setValores((prev) => ({ ...prev, [campo]: val }))
  }

  async function guardar() {
    setGuardando(true)
    setMsg(null)
    const res = await guardarConfigFidelizacion({ activo, ...valores })
    setGuardando(false)
    if (res.error) setMsg({ tipo: 'error', texto: res.error })
    else setMsg({ tipo: 'ok', texto: 'Configuración guardada ✓' })
  }

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <BarraUsuario perfil="pescaderia" />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-1">
          <a href="/pescaderia" className="text-white/60 hover:text-white text-2xl leading-none">←</a>
          <h1 className="text-2xl font-extrabold tracking-tight">Fidelización</h1>
        </div>
        <p className="text-white/45 text-sm mb-6">
          Premiá a tus clientes según lo que te facturan cada mes. Al cerrar el mes, cada cliente recibe un porcentaje de devolución como saldo a favor en su cuenta.
        </p>

        {/* Toggle activo */}
        <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-white">Programa activo</div>
            <div className="text-[12px] text-white/45">{activo ? 'Acumulando facturación este mes' : 'Apagado: no acumula ni genera devoluciones'}</div>
          </div>
          <button
            onClick={() => setActivo((a) => !a)}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${activo ? 'bg-[#2ecc71]' : 'bg-white/15'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${activo ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Niveles */}
        <div className="flex flex-col gap-3">
          {NIVELES.map((n) => (
            <div key={n.key} className="bg-white/[0.05] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{n.emoji}</span>
                <span className="font-bold" style={{ color: n.color }}>{n.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-white/40 font-bold mb-1">Facturación mínima</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2.5 focus-within:border-[#4db8ff]">
                    <span className="text-white/40 text-sm">$</span>
                    <input
                      type="number" min="0" inputMode="numeric"
                      value={valores[`${n.key}_min`]}
                      onChange={(e) => set(`${n.key}_min`, e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent py-2 px-1.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-white/40 font-bold mb-1">Devolución</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2.5 focus-within:border-[#4db8ff]">
                    <input
                      type="number" min="0" step="0.1" inputMode="decimal"
                      value={valores[`${n.key}_pct`]}
                      onChange={(e) => set(`${n.key}_pct`, e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent py-2 px-1.5 text-sm text-white outline-none"
                    />
                    <span className="text-white/40 text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {msg && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.tipo === 'error' ? 'bg-[#e74c3c]/15 border border-[#e74c3c]/30 text-[#ff9b8f]' : 'bg-[#2ecc71]/15 border border-[#2ecc71]/30 text-[#7fe6a6]'}`}>
            {msg.texto}
          </div>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full mt-5 bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>

        <p className="text-[11px] text-white/30 mt-4 text-center">
          Los niveles se evalúan de mayor a menor: se aplica el más alto que el cliente alcance. Dejá un nivel en $0 para desactivarlo.
        </p>
      </div>
    </div>
  )
}
