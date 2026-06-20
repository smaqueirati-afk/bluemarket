'use client'

import { useState } from 'react'

const RUBROS = [
  { rubro: 'Pescadería', emoji: '🐟' },
  { rubro: 'Quesería', emoji: '🧀' },
  { rubro: 'Carnicería', emoji: '🥩' },
  { rubro: 'Verdulería', emoji: '🥦' },
  { rubro: 'Almacén', emoji: '🛒' },
  { rubro: 'Panadería', emoji: '🥖' },
  { rubro: 'Rotisería', emoji: '🍗' },
]

export default function RubroSelector() {
  const [seleccion, setSeleccion] = useState('')
  const [otro, setOtro] = useState(false)
  const [texto, setTexto] = useState('')

  function elegir(r) {
    setOtro(false)
    setSeleccion(r)
    setTexto('')
  }

  function elegirOtro() {
    setOtro(true)
    setSeleccion('')
  }

  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-white/45 font-bold mb-2">
        Rubro
      </label>
      <div className="grid grid-cols-2 gap-2">
        {RUBROS.map((r) => (
          <button
            type="button"
            key={r.rubro}
            onClick={() => elegir(r.rubro)}
            className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-left transition-all ${
              seleccion === r.rubro
                ? 'border-[#4db8ff] bg-[#4db8ff]/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-sm">{r.emoji} {r.rubro}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={elegirOtro}
          className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-left transition-all ${
            otro ? 'border-[#4db8ff] bg-[#4db8ff]/10' : 'border-white/10 bg-white/5'
          }`}
        >
          <span className="text-sm">✏️ Otro</span>
        </button>
      </div>

      {otro && (
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Vivero, Dietética, Vinoteca..."
          className="w-full mt-2.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
        />
      )}

      {/* Valores reales que viajan en el form */}
      <input type="hidden" name="rubro" value={otro ? texto : seleccion} required />
      <input type="hidden" name="emoji_rubro" value={otro ? '🛍️' : (RUBROS.find((r) => r.rubro === seleccion)?.emoji || '🛍️')} />
    </div>
  )
}
