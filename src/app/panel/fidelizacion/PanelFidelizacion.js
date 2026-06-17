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

const NIVEL_INFO = {
  bronce: { emoji: '🥉', color: '#cd7f32' },
  plata: { emoji: '🥈', color: '#c0c0c0' },
  oro: { emoji: '🥇', color: '#ffd700' },
  diamante: { emoji: '💎', color: '#4db8ff' },
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')

function diasRestantes(fechaCierre) {
  const ms = new Date(fechaCierre) - new Date()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function NivelBadge({ nivel }) {
  if (!nivel) return <span className="text-[11px] text-white/35">Sin nivel</span>
  const info = NIVEL_INFO[nivel] || {}
  return (
    <span className="text-[12px] font-bold" style={{ color: info.color }}>
      {info.emoji} {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
    </span>
  )
}

export default function PanelFidelizacion({ config, activos = [], cerrados = [], mesLabel }) {
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

        {/* Ranking del mes */}
        <div className="mt-9">
          <h2 className="text-lg font-extrabold mb-1">Ranking del mes{mesLabel ? ` · ${mesLabel}` : ''}</h2>
          <p className="text-white/40 text-[12px] mb-3">Compradores con compras{mesLabel ? ` en ${mesLabel}` : ' este mes'}, ordenados por facturación. Se reinicia cada mes.</p>
          {activos.length === 0 ? (
            <div className="text-white/35 text-sm bg-white/[0.03] border border-white/8 rounded-xl px-4 py-6 text-center">
              Todavía no hay clientes acumulando este mes.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activos.map((c, i) => (
                <div key={c.id} className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-white/30 text-sm font-bold w-5 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{c.nombre}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        Compra desde {c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString('es-AR') : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#4db8ff]">{fmt(c.facturacion_acumulada)}</div>
                    <div className="mt-0.5"><NivelBadge nivel={c.nivel} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial */}
        {cerrados.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-extrabold mb-1">Historial de retornos pagados</h2>
            <p className="text-white/40 text-[12px] mb-3">Lo que devolviste a cada comprador al cerrar cada mes.</p>
            <div className="flex flex-col gap-2">
              {cerrados.map((c) => (
                <div key={c.id} className="bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-white/90 truncate">{c.nombre}</div>
                    <div className="text-[11px] text-white/40">
                      {c.cerrado_at ? new Date(c.cerrado_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : ''} · <NivelBadge nivel={c.nivel_alcanzado} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-white/40">Consumo {fmt(c.facturacion_acumulada)}</div>
                    <div className="text-[12px] font-bold text-white">Pagaste {fmt(c.beneficio_otorgado)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
