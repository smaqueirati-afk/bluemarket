'use client'

import { useState } from 'react'
import { crearPescaderia, asignarDueno } from './actions'

export default function PanelDeveloper({ pescaderias }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [asignandoId, setAsignandoId] = useState(null)
  const [emailDueno, setEmailDueno] = useState('')
  const [cargandoAsig, setCargandoAsig] = useState(false)

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
    const resultado = await asignarDueno(pescaderiaId, emailDueno)
    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: `${resultado.email} ahora es dueño ✓` })
      setAsignandoId(null)
      setEmailDueno('')
    }
    setCargandoAsig(false)
  }

  const activas = pescaderias.filter((p) => p.activa).length
  const trials = pescaderias.filter((p) => p.plan === 'trial').length

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <div className="relative max-w-4xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="text-[#4db8ff]">Blue</span>Market
            </h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-[1.5px]">Developer Console</p>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-[0_0_16px_rgba(77,184,255,0.4)] active:scale-95"
          >
            {mostrarForm ? 'Cancelar' : '+ Nueva pescadería'}
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">Total</div>
            <div className="text-2xl font-extrabold mt-1 text-white">{pescaderias.length}</div>
            <div className="text-[11px] text-white/30 mt-1">pescaderías</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">Activas</div>
            <div className="text-2xl font-extrabold mt-1 text-[#2ecc71]">{activas}</div>
            <div className="text-[11px] text-white/30 mt-1">funcionando</div>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[11px] text-white/40 uppercase tracking-wide">En prueba</div>
            <div className="text-2xl font-extrabold mt-1 text-[#f39c12]">{trials}</div>
            <div className="text-[11px] text-white/30 mt-1">trial</div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            mensaje.tipo === 'error'
              ? 'bg-[#e74c3c]/15 border-[#e74c3c]/30 text-[#e74c3c]'
              : 'bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#2ecc71]'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Formulario crear */}
        {mostrarForm && (
          <form onSubmit={handleSubmit}
            className="bg-white/[0.06] border border-white/12 rounded-2xl p-5 mb-6 space-y-4 backdrop-blur-md"
            style={{ animation: 'bmFadeUp 0.4s ease both' }}>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre de la pescadería</label>
              <input name="nombre" required placeholder="Pescadería Tigre"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Slug (identificador único, sin espacios)</label>
              <input name="slug" required placeholder="pescaderia-tigre"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Teléfono (opcional)</label>
              <input name="telefono" placeholder="+54 11 1234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff]" />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full bg-[#4db8ff] text-[#03174a] font-bold py-3 rounded-xl transition-all hover:shadow-[0_0_16px_rgba(77,184,255,0.4)] active:scale-[0.98] disabled:opacity-60">
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
            <div className="text-center py-12 bg-white/[0.03] border border-white/8 rounded-2xl">
              <div className="text-4xl mb-3 opacity-40">🐟</div>
              <p className="text-white/40 text-sm">Todavía no hay pescaderías.<br />Creá la primera con el botón de arriba.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pescaderias.map((p, idx) => (
                <div key={p.id}
                  className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm transition-all hover:border-[#4db8ff]/40"
                  style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.05}s` }}>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/30 flex items-center justify-center text-lg">
                        🐟
                      </div>
                      <div>
                        <div className="font-semibold text-white">{p.nombre}</div>
                        <div className="text-xs text-white/40 mt-0.5">/{p.slug} · {p.telefono || 'sin teléfono'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                        p.plan === 'trial' ? 'bg-[#f39c12]/15 text-[#f39c12]' : 'bg-[#4db8ff]/15 text-[#4db8ff]'
                      }`}>
                        {p.plan}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${p.activa ? 'bg-[#2ecc71]' : 'bg-white/20'}`}
                            style={p.activa ? { boxShadow: '0 0 8px rgba(46,204,113,0.6)' } : {}}></span>
                    </div>
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
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
                          />
                          <button
                            onClick={() => handleAsignar(p.id)}
                            disabled={cargandoAsig}
                            className="bg-[#2ecc71] text-[#03174a] font-bold text-xs px-3 py-2 rounded-lg active:scale-95 disabled:opacity-60"
                          >
                            {cargandoAsig ? '...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => { setAsignandoId(null); setEmailDueno('') }}
                            className="bg-white/8 text-white/50 text-xs px-3 py-2 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
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
                        <button
                          onClick={() => { setAsignandoId(p.id); setEmailDueno(''); setMensaje(null) }}
                          className="text-xs text-white/40 hover:text-[#4db8ff] transition-colors"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      // Sin dueño: botón para asignar
                      <button
                        onClick={() => { setAsignandoId(p.id); setEmailDueno(''); setMensaje(null) }}
                        className="text-xs text-[#4db8ff] font-medium hover:underline"
                      >
                        + Asignar dueño
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
