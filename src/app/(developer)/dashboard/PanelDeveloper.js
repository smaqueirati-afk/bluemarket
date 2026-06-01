'use client'

import { useState } from 'react'
import { crearPescaderia } from './actions'

export default function PanelDeveloper({ pescaderias }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

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

  return (
    <div className="min-h-screen bg-[#0a0a12] text-[#f0f0f8] p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold">
              <span className="text-[#4db8ff]">Blue</span>Market
            </h1>
            <p className="text-sm text-white/40 mt-1">Developer Console</p>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl"
          >
            {mostrarForm ? 'Cancelar' : '+ Nueva pescadería'}
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            mensaje.tipo === 'error'
              ? 'bg-red-500/15 border border-red-500/30 text-red-400'
              : 'bg-green-500/15 border border-green-500/30 text-green-400'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <form onSubmit={handleSubmit} className="bg-[#111120] border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre de la pescadería</label>
              <input name="nombre" required placeholder="Pescadería Tigre"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Slug (identificador único, sin espacios)</label>
              <input name="slug" required placeholder="pescaderia-tigre"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Teléfono (opcional)</label>
              <input name="telefono" placeholder="+54 11 1234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]" />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl disabled:opacity-60">
              {cargando ? 'Creando...' : 'Crear pescadería'}
            </button>
          </form>
        )}

        {/* Lista de pescaderías */}
        <div>
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-3">
            Pescaderías ({pescaderias.length})
          </h2>

          {pescaderias.length === 0 ? (
            <p className="text-white/40 text-sm py-8 text-center">
              Todavía no hay pescaderías. Creá la primera con el botón de arriba.
            </p>
          ) : (
            <div className="space-y-2">
              {pescaderias.map((p) => (
                <div key={p.id} className="bg-[#111120] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{p.nombre}</div>
                    <div className="text-xs text-white/40 mt-0.5">/{p.slug} · {p.telefono || 'sin teléfono'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                      p.plan === 'trial' ? 'bg-orange-500/15 text-orange-400' : 'bg-[#4db8ff]/15 text-[#4db8ff]'
                    }`}>
                      {p.plan}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${p.activa ? 'bg-green-400' : 'bg-white/20'}`}></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}