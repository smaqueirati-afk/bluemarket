'use client'

import { useState } from 'react'
import { solicitarProveedor } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'

const MODALIDAD_LABEL = {
  local_reparto: 'Local y reparto',
  solo_reparto: 'Solo reparto',
}

function EstadoVinculo({ vinculo }) {
  if (!vinculo) return null
  if (vinculo.estado === 'aprobado') {
    return <span className="text-[12px] font-bold text-[#2ecc71]">✓ Vinculado</span>
  }
  if (vinculo.estado === 'pendiente') {
    const txt = vinculo.iniciado_por === 'proveedor' ? 'Te invitó' : 'Solicitud enviada'
    return <span className="text-[12px] font-bold text-[#f39c12]">{txt}</span>
  }
  if (vinculo.estado === 'rechazado') {
    return <span className="text-[12px] font-medium text-white/40">Rechazado</span>
  }
  return null
}

export default function PanelProveedores({ proveedores: inicial }) {
  const [proveedores, setProveedores] = useState(inicial || [])
  const [cargando, setCargando] = useState(null)
  const [error, setError] = useState(null)

  async function pedir(id) {
    setCargando(id)
    setError(null)
    const res = await solicitarProveedor(id)
    setCargando(null)
    if (res.error) {
      setError(res.error)
      return
    }
    setProveedores((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, vinculo: { estado: res.estado || 'pendiente', iniciado_por: 'local' } }
          : p
      )
    )
  }

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <BarraUsuario perfil="pescaderia" />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-1">
          <a href="/pescaderia" className="text-white/60 hover:text-white text-2xl leading-none">←</a>
          <h1 className="text-2xl font-extrabold tracking-tight">Proveedores</h1>
        </div>
        <p className="text-white/45 text-sm mb-6">
          Pescaderías con reparto a las que les podés comprar mayorista. Mandá la solicitud y, cuando te aprueben, comprás.
        </p>

        {error && (
          <div className="bg-[#e74c3c]/15 border border-[#e74c3c]/30 rounded-xl px-4 py-3 mb-4 text-sm text-[#ff9b8f]">
            {error}
          </div>
        )}

        {proveedores.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <div className="text-4xl mb-3">🚚</div>
            <p className="text-sm">Todavía no hay proveedores con reparto disponibles.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {proveedores.map((p) => (
              <div
                key={p.id}
                className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{p.nombre}</div>
                  <div className="text-[12px] text-white/40 mt-0.5">
                    {MODALIDAD_LABEL[p.modalidad] || p.modalidad}
                  </div>
                </div>
                <div className="shrink-0">
                  {p.vinculo ? (
                    <EstadoVinculo vinculo={p.vinculo} />
                  ) : (
                    <button
                      onClick={() => pedir(p.id)}
                      disabled={cargando === p.id}
                      className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {cargando === p.id ? '...' : 'Solicitar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
