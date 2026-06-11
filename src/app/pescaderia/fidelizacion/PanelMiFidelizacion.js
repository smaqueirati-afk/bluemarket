import BarraUsuario from '../../../components/BarraUsuario'

const NIVEL_INFO = {
  bronce: { emoji: '🥉', color: '#cd7f32', label: 'Bronce' },
  plata: { emoji: '🥈', color: '#c0c0c0', label: 'Plata' },
  oro: { emoji: '🥇', color: '#ffd700', label: 'Oro' },
  diamante: { emoji: '💎', color: '#4db8ff', label: 'Diamante' },
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')

function NivelBadge({ nivel }) {
  if (!nivel) return <span className="text-[12px] text-white/35">Sin nivel todavía</span>
  const info = NIVEL_INFO[nivel] || {}
  return (
    <span className="text-[13px] font-bold" style={{ color: info.color }}>
      {info.emoji} {info.label}
    </span>
  )
}

export default function PanelMiFidelizacion({ proveedores = [], mesLabel }) {
  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <BarraUsuario perfil="pescaderia" />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-1">
          <a href="/pescaderia" className="text-white/60 hover:text-white text-2xl leading-none">←</a>
          <h1 className="text-2xl font-extrabold tracking-tight">Mi fidelización</h1>
        </div>
        <p className="text-white/45 text-sm mb-6">
          Lo que te devuelve cada proveedor según lo que le comprás cada mes. La devolución entra como saldo a favor en tu cuenta corriente con ese proveedor.
        </p>

        {proveedores.length === 0 ? (
          <div className="text-white/35 text-sm bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-10 text-center">
            <div className="text-3xl mb-3">🎁</div>
            Ninguno de tus proveedores tiene un programa de fidelización activo todavía.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {proveedores.map((p) => (
              <div key={p.pescaderia_id} className="bg-white/[0.06] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-white/40 font-bold">Proveedor</div>
                    <div className="font-extrabold text-lg truncate">{p.nombre}</div>
                  </div>
                  <NivelBadge nivel={p.nivel} />
                </div>

                {/* Mes actual */}
                {p.tieneActivo ? (
                  <div className="bg-white/[0.04] border border-white/8 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wide text-white/40 font-bold mb-2">
                      Este mes{mesLabel ? ` · ${mesLabel}` : ''}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[12px] text-white/45">Le compraste</div>
                        <div className="text-xl font-extrabold text-[#4db8ff]">{fmt(p.acumulado)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-white/45">Retorno estimado</div>
                        <div className="text-xl font-extrabold text-[#2ecc71]">{fmt(p.retorno)}</div>
                      </div>
                    </div>
                    {p.proximo ? (
                      <div className="mt-3 text-[12px] text-white/55">
                        Te faltan <span className="text-white font-bold">{fmt(p.faltaProximo)}</span> para llegar a <NivelBadge nivel={p.proximo} /> ({p.pctProximo}% de retorno).
                      </div>
                    ) : (
                      p.nivel && <div className="mt-3 text-[12px] text-white/55">¡Ya estás en el nivel más alto! 🎉</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/[0.04] border border-white/8 rounded-xl px-4 py-5 text-center text-white/40 text-sm">
                    Todavía no le compraste este mes.
                  </div>
                )}

                {/* Historial de retornos cobrados */}
                {p.cerrados.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wide text-white/40 font-bold mb-2">Retornos cobrados</div>
                    <div className="flex flex-col gap-2">
                      {p.cerrados.map((c) => (
                        <div key={c.id} className="bg-white/[0.03] border border-white/8 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] text-white/85 capitalize">
                              {c.cerrado_at ? new Date(c.cerrado_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '—'}
                            </div>
                            <div className="text-[11px]"><NivelBadge nivel={c.nivel_alcanzado} /></div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-white/40">Compraste {fmt(c.facturacion_acumulada)}</div>
                            <div className="text-[13px] font-bold text-[#2ecc71]">Cobraste {fmt(c.beneficio_otorgado)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
