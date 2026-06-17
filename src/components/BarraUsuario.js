'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'

// Barra superior con identificación del perfil y botón de salir.
// Uso: <BarraUsuario perfil="pescaderia" />
// perfil puede ser: 'developer' | 'pescaderia' | 'consumidor'
export default function BarraUsuario({ perfil = 'consumidor', emojiRubro }) {
  const [nombre, setNombre] = useState('')
  const [cerrando, setCerrando] = useState(false)

  const etiquetas = {
    developer:  { texto: 'Perfil Developer',  color: '#4db8ff', emoji: '⚙️' },
    pescaderia: { texto: 'Mi tienda', color: '#2ecc71', emoji: '🏪' },
    consumidor: { texto: 'Perfil Consumidor', color: '#f39c12', emoji: '🛒' },
  }
  const etq = { ...(etiquetas[perfil] || etiquetas.consumidor), ...(emojiRubro ? { emoji: emojiRubro } : {}) }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Tomar el nombre del metadata de Google, o el email
        const n = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email?.split('@')[0]
          || 'Usuario'
        setNombre(n)
      }
    })
  }, [])

  async function cerrarSesion() {
    setCerrando(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md bg-[#03174a]/80 border-b border-white/8">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
               style={{ background: `${etq.color}22`, border: `1px solid ${etq.color}55` }}>
            {etq.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate leading-tight">{nombre}</div>
            <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: etq.color }}>
              {etq.texto}
            </div>
          </div>
        </div>
        <button
          onClick={cerrarSesion}
          disabled={cerrando}
          className="shrink-0 flex items-center gap-1.5 bg-white/[0.07] border border-white/12 text-white/70 text-xs font-medium px-3 py-2 rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          {cerrando ? 'Saliendo...' : (
            <>
              <span>Salir</span>
              <span>↪</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
