'use client'

import { useState } from 'react'
import { crearProducto, editarProducto, toggleDisponible, borrarProducto } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'

const CATEGORIAS = [
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'mariscos', label: 'Mariscos', emoji: '🦐' },
  { id: 'moluscos', label: 'Moluscos', emoji: '🦪' },
]
const UNIDADES = [
  { id: 'kg', label: 'Por kg' },
  { id: 'unidad', label: 'Por unidad' },
  { id: 'docena', label: 'Por docena' },
  { id: 'gramo', label: 'Por gramo' },
  { id: 'porcion', label: 'Por porción' },
]

// Emoji por defecto según la categoría
const EMOJI_POR_CATEGORIA = {
  pescado: '🐟',
  mariscos: '🦐',
  moluscos: '🦪',
}

// Paleta de emojis para elegir (productos de pescadería)
const EMOJIS_DISPONIBLES = [
  '🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦐', '🦞', '🦀',
  '🦪', '🐚', '🍤', '🍣', '🍥', '🐳', '🐬', '🧊', '🍋',
]

// Adivina el emoji según palabras en el nombre del producto.
// El orden importa: primero las más específicas.
const PALABRAS_EMOJI = [
  { palabras: ['langostino', 'camaron', 'camarón', 'gamba'], emoji: '🦐' },
  { palabras: ['langosta', 'bogavante'], emoji: '🦞' },
  { palabras: ['cangrejo', 'centolla'], emoji: '🦀' },
  { palabras: ['pulpo'], emoji: '🐙' },
  { palabras: ['calamar', 'sepia', 'anillo'], emoji: '🦑' },
  { palabras: ['mejillon', 'mejillón', 'almeja', 'ostra', 'vieira', 'molusco'], emoji: '🦪' },
  { palabras: ['caracol', 'cholga'], emoji: '🐚' },
  { palabras: ['tiburon', 'tiburón', 'cazon', 'cazón'], emoji: '🦈' },
  { palabras: ['sushi', 'roll'], emoji: '🍣' },
  { palabras: ['rebozado', 'milanesa', 'frito', 'tempura', 'nugget'], emoji: '🍤' },
  { palabras: ['salmon', 'salmón', 'trucha', 'atun', 'atún'], emoji: '🐟' },
  { palabras: ['merluza', 'corvina', 'lenguado', 'brotola', 'brótola', 'pejerrey', 'dorado', 'pez', 'pescado', 'filet', 'lomo'], emoji: '🐟' },
  { palabras: ['limon', 'limón'], emoji: '🍋' },
  { palabras: ['hielo', 'congelado'], emoji: '🧊' },
]

function adivinarEmoji(nombre) {
  const n = (nombre || '').toLowerCase()
  for (const item of PALABRAS_EMOJI) {
    if (item.palabras.some((p) => n.includes(p))) return item.emoji
  }
  return null // no encontró coincidencia
}

const FORM_VACIO = { nombre: '', precio: '', categoria: 'pescado', unidad: 'kg', emoji: '🐟', stock: '', descripcion: '' }

export default function GestionProductos({ productos, nombrePescaderia }) {
  const [form, setForm] = useState(FORM_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [accionando, setAccionando] = useState(null)

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setEditandoId(null)
    setMostrarForm(true)
    setMensaje(null)
  }

  function abrirEditar(p) {
    setForm({
      nombre: p.nombre || '',
      precio: p.precio || '',
      categoria: p.categoria || 'pescado',
      unidad: p.unidad || 'kg',
      emoji: p.emoji || '',
      stock: p.stock ?? '',
      descripcion: p.descripcion || '',
    })
    setEditandoId(p.id)
    setMostrarForm(true)
    setMensaje(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  async function guardar() {
    setCargando(true)
    setMensaje(null)
    const resultado = editandoId
      ? await editarProducto(editandoId, form)
      : await crearProducto(form)

    if (resultado.error) {
      setMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      setMensaje({ tipo: 'ok', texto: editandoId ? 'Producto actualizado ✓' : 'Producto agregado ✓' })
      cerrarForm()
    }
    setCargando(false)
  }

  async function cambiarDisponible(p) {
    setAccionando(p.id)
    await toggleDisponible(p.id, !p.disponible)
    setAccionando(null)
  }

  async function eliminar(p) {
    if (!confirm(`¿Borrar "${p.nombre}"? Esta acción no se puede deshacer.`)) return
    setAccionando(p.id)
    await borrarProducto(p.id)
    setAccionando(null)
  }

  return (
    <div className="min-h-screen text-white bg-[linear-gradient(180deg,#051e5c_0%,#03174a_60%,#020f30_100%)]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(77,184,255,0.12), transparent 70%)' }} />

      <BarraUsuario perfil="pescaderia" />

      <div className="relative max-w-3xl mx-auto p-5">

        {/* Header */}
        <div className="mb-5">
          <a href="/pescaderia" className="inline-flex items-center gap-1.5 bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all mb-4">← Volver a pedidos</a>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight">Mis productos</h1>
              <p className="text-xs text-white/40 truncate">{nombrePescaderia}</p>
            </div>
            <button onClick={abrirNuevo}
              className="shrink-0 bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all whitespace-nowrap">
              + Agregar
            </button>
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

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-white/[0.06] border border-white/12 rounded-2xl p-5 mb-5 space-y-3.5 backdrop-blur-md"
               style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <div className="font-bold text-white">{editandoId ? 'Editar producto' : 'Nuevo producto'}</div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre *</label>
              <input value={form.nombre} onChange={(e) => {
                  const nuevoNombre = e.target.value
                  const emojiAdivinado = adivinarEmoji(nuevoNombre)
                  // Solo autocompleto si el emoji actual es un default (de categoría) o está vacío,
                  // así no piso un emoji que el usuario eligió a mano de la grilla.
                  const esDefault = !form.emoji || Object.values(EMOJI_POR_CATEGORIA).includes(form.emoji) || form._emojiAuto
                  if (emojiAdivinado && esDefault) {
                    setForm({ ...form, nombre: nuevoNombre, emoji: emojiAdivinado, _emojiAuto: true })
                  } else {
                    setForm({ ...form, nombre: nuevoNombre })
                  }
                }}
                placeholder="Merluza fresca"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Precio *</label>
                <input type="number" inputMode="numeric" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  placeholder="1800"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Stock (opcional)</label>
                <input type="number" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="10"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Categoría</label>
                <select value={form.categoria} onChange={(e) => {
                    const nuevaCat = e.target.value
                    // Si el emoji actual está vacío o es el default de otra categoría, lo actualizo
                    const esDefaultDeOtra = Object.values(EMOJI_POR_CATEGORIA).includes(form.emoji)
                    setForm({
                      ...form,
                      categoria: nuevaCat,
                      emoji: (!form.emoji || esDefaultDeOtra) ? EMOJI_POR_CATEGORIA[nuevaCat] : form.emoji,
                    })
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
                  {CATEGORIAS.map((c) => <option key={c.id} value={c.id} className="bg-[#051e5c]">{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Unidad</label>
                <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
                  {UNIDADES.map((u) => <option key={u.id} value={u.id} className="bg-[#051e5c]">{u.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">
                Emoji (así se ve en la tienda)
              </label>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-14 h-14 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/30 flex items-center justify-center text-3xl shrink-0">
                  {form.emoji || EMOJI_POR_CATEGORIA[form.categoria] || '🐟'}
                </div>
                <p className="text-[12px] text-white/45 leading-relaxed">
                  Este es el ícono que verán tus clientes.<br />Tocá uno de abajo para cambiarlo.
                </p>
              </div>
              <div className="grid grid-cols-9 gap-1.5 bg-white/[0.03] border border-white/8 rounded-xl p-2.5">
                {EMOJIS_DISPONIBLES.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setForm({ ...form, emoji: em, _emojiAuto: false })}
                    className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${
                      form.emoji === em ? 'bg-[#4db8ff]/30 border border-[#4db8ff]' : 'bg-white/[0.04] border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={guardar} disabled={cargando}
                className="flex-1 bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all disabled:opacity-60">
                {cargando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Agregar producto')}
              </button>
              <button onClick={cerrarForm}
                className="bg-white/8 text-white/60 px-4 py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de productos */}
        {productos.length === 0 && !mostrarForm ? (
          <div className="text-center py-16 bg-white/[0.03] border border-white/8 rounded-2xl">
            <div className="text-4xl mb-3 opacity-40">🐟</div>
            <p className="text-white/45 text-sm mb-4">Todavía no cargaste productos.<br />Agregá el primero para empezar a vender.</p>
            <button onClick={abrirNuevo}
              className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95">
              + Agregar producto
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {productos.map((p, idx) => (
              <div key={p.id}
                className={`bg-white/[0.06] border rounded-2xl p-3.5 backdrop-blur-sm transition-all ${
                  p.disponible ? 'border-white/10' : 'border-white/5 opacity-55'
                }`}
                style={{ animation: 'bmFadeUp 0.4s ease both', animationDelay: `${idx * 0.04}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/25 flex items-center justify-center text-xl shrink-0">
                    {p.emoji || '🐟'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{p.nombre}</span>
                      {!p.disponible && <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded uppercase shrink-0">Pausado</span>}
                    </div>
                    <div className="text-xs text-white/45 mt-0.5">
                      {fmt(p.precio)} · {p.unidad}{p.stock != null ? ` · Stock: ${p.stock}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
                  <button onClick={() => abrirEditar(p)}
                    className="flex-1 bg-white/[0.07] border border-white/10 text-white text-xs font-medium py-2 rounded-lg active:scale-95 transition-all">
                    ✏️ Editar
                  </button>
                  <button onClick={() => cambiarDisponible(p)} disabled={accionando === p.id}
                    className="flex-1 bg-white/[0.07] border border-white/10 text-white text-xs font-medium py-2 rounded-lg active:scale-95 transition-all disabled:opacity-50">
                    {p.disponible ? '⏸ Pausar' : '▶️ Activar'}
                  </button>
                  <button onClick={() => eliminar(p)} disabled={accionando === p.id}
                    className="bg-[#e74c3c]/15 border border-[#e74c3c]/25 text-[#e74c3c] text-xs font-medium py-2 px-3 rounded-lg active:scale-95 transition-all disabled:opacity-50">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
