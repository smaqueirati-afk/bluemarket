'use client'

import { useState, useRef } from 'react'
import { crearProductoMaster, editarProductoMaster, borrarProductoMaster, importarDesdemaster } from './actions_master'
import { createClient } from '../../../lib/supabase/client'

const CATEGORIAS = [
  { id: 'pescado',   label: 'Pescado',    emoji: '🐟' },
  { id: 'mariscos',  label: 'Mariscos',   emoji: '🦐' },
  { id: 'lacteos',   label: 'Lácteos',    emoji: '🧀' },
  { id: 'carnes',    label: 'Carnes',     emoji: '🥩' },
  { id: 'fiambres',  label: 'Fiambres',   emoji: '🍖' },
  { id: 'verduras',  label: 'Verduras',   emoji: '🥦' },
  { id: 'panaderia', label: 'Panadería',  emoji: '🥖' },
  { id: 'bebidas',   label: 'Bebidas',    emoji: '🧃' },
  { id: 'otros',     label: 'Otros',      emoji: '📦' },
]
const RUBROS = [
  { id: 'pescadería', emoji: '🐟' },
  { id: 'quesería',   emoji: '🧀' },
  { id: 'carnicería', emoji: '🥩' },
  { id: 'verdulería', emoji: '🥦' },
  { id: 'panadería',  emoji: '🥖' },
  { id: 'almacén',    emoji: '🛒' },
  { id: 'rotisería',  emoji: '🍗' },
  { id: 'otro',       emoji: '📦' },
]
const UNIDADES = ['kg', 'unidad', 'docena', 'gramo', 'porcion']
const EMOJIS = ['🐟','🐠','🐡','🦐','🦞','🦀','🦪','🧀','🥛','🥚','🥩','🍖','🥓','🍗','🥦','🥕','🍅','🥖','🍞','🧃','🥤','📦']
const FORM_VACIO = { nombre: '', descripcion: '', categoria: 'otros', emoji: '📦', unidad: 'kg', precio_sugerido: '', foto_url: '', rubro: 'pescadería' }

export default function CatalogoMaster({ productos: inicial, pescaderias }) {
  const [productos, setProductos] = useState(inicial)
  const [form, setForm] = useState(FORM_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [importando, setImportando] = useState(null) // pescaderiaId seleccionada
  const [seleccionados, setSeleccionados] = useState([])
  const [filtroRubro, setFiltroRubro] = useState('todos')
  const fotoRef = useRef(null)

  function abrirNuevo() { setForm(FORM_VACIO); setEditandoId(null); setMostrarForm(true); setMensaje(null) }
  function abrirEditar(p) {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria || 'otros', emoji: p.emoji || '📦', unidad: p.unidad || 'kg', precio_sugerido: p.precio_sugerido || '', foto_url: p.foto_url || '', rubro: p.rubro || 'pescadería' })
    setEditandoId(p.id); setMostrarForm(true); setMensaje(null)
  }
  function cerrar() { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO) }

  async function subirFoto(archivo) {
    if (!archivo) return null
    setSubiendoFoto(true)
    try {
      const supabase = createClient()
      const ext = archivo.name.split('.').pop()
      const path = `master/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('Productos').upload(path, archivo, { upsert: true })
      if (error) { setMensaje({ tipo: 'error', texto: 'Error al subir: ' + error.message }); return null }
      return supabase.storage.from('Productos').getPublicUrl(path).data.publicUrl
    } finally { setSubiendoFoto(false) }
  }

  async function guardar() {
    setCargando(true); setMensaje(null)
    let fotoUrl = form.foto_url
    if (fotoRef.current?.files?.[0]) {
      fotoUrl = await subirFoto(fotoRef.current.files[0])
      if (!fotoUrl) { setCargando(false); return }
    }
    const datos = { ...form, foto_url: fotoUrl, pendiente_foto: !fotoUrl }
    const res = editandoId ? await editarProductoMaster(editandoId, datos) : await crearProductoMaster(datos)
    if (res.error) { setMensaje({ tipo: 'error', texto: res.error }) }
    else {
      setMensaje({ tipo: 'ok', texto: editandoId ? 'Producto actualizado ✓' : 'Producto agregado ✓' })
      cerrar()
      // Refrescar lista
      window.location.reload()
    }
    setCargando(false)
  }

  async function borrar(p) {
    if (!confirm(`¿Borrar "${p.nombre}" del catálogo master?`)) return
    const res = await borrarProductoMaster(p.id)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else setProductos((prev) => prev.filter((x) => x.id !== p.id))
  }

  async function importar() {
    if (!importando || !seleccionados.length) return
    setCargando(true); setMensaje(null)
    const res = await importarDesdemaster(importando, seleccionados)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else { setMensaje({ tipo: 'ok', texto: `${res.cantidad} productos importados ✓` }); setImportando(null); setSeleccionados([]) }
    setCargando(false)
  }

  // Rubros presentes en el catálogo (para los tabs)
  const rubrosPresentes = ['todos', ...new Set(productos.map(p => p.rubro).filter(Boolean))]
  const productosFiltrados = filtroRubro === 'todos'
    ? productos
    : productos.filter(p => p.rubro === filtroRubro)

  function toggleSeleccion(id) {
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">Catálogo master 📦</h2>
          <p className="text-xs text-white/40">{productosFiltrados.length} de {productos.length} productos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setImportando(importando ? null : ''); setSeleccionados([]) }}
            className="bg-[#2ecc71]/15 border border-[#2ecc71]/30 text-[#2ecc71] text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
            📤 Exportar
          </button>
          <button onClick={abrirNuevo}
            className="bg-[#4db8ff] text-[#03174a] font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-all">
            + Agregar
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${mensaje.tipo === 'error' ? 'bg-[#e74c3c]/15 border-[#e74c3c]/30 text-[#e74c3c]' : 'bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#2ecc71]'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Panel exportar */}
      {importando !== null && (
        <div className="bg-white/[0.06] border border-[#2ecc71]/30 rounded-2xl p-4 space-y-3" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
          <div className="text-sm font-bold text-white">¿A qué pescadería exportar?</div>
          <select value={importando} onChange={(e) => setImportando(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
            <option value="" className="bg-[#051e5c]">Seleccioná una pescadería...</option>
            {pescaderias.map((p) => <option key={p.id} value={p.id} className="bg-[#051e5c]">{p.nombre}</option>)}
          </select>
          <div className="text-xs text-white/50">Seleccioná los productos a exportar ({seleccionados.length} elegidos)</div>
          {importando && (
            <button onClick={importar} disabled={!seleccionados.length || cargando}
              className="w-full bg-[#2ecc71] text-[#03174a] font-bold py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-50">
              {cargando ? 'Exportando...' : `Exportar ${seleccionados.length} producto${seleccionados.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-white/[0.06] border border-white/12 rounded-2xl p-5 space-y-3.5" style={{ animation: 'bmFadeUp 0.3s ease both' }}>
          <div className="font-bold text-white">{editandoId ? 'Editar producto' : 'Nuevo producto master'}</div>

          {/* Selector de rubro */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Rubro</label>
            <div className="grid grid-cols-4 gap-1.5">
              {RUBROS.map((r) => (
                <button key={r.id} type="button"
                  onClick={() => setForm({ ...form, rubro: r.id })}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${form.rubro === r.id ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.06] text-white/60 border border-white/10'}`}>
                  {r.emoji} {r.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Merluza fresca"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Precio sugerido</label>
              <input type="number" value={form.precio_sugerido} onChange={(e) => setForm({ ...form, precio_sugerido: e.target.value })}
                placeholder="1800"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Unidad</label>
              <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
                {UNIDADES.map((u) => <option key={u} value={u} className="bg-[#051e5c]">{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id} className="bg-[#051e5c]">{c.emoji} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Foto (opcional)</label>
            <div className="flex items-center gap-3">
              {form.foto_url && <img src={form.foto_url} alt="foto" className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0" />}
              <label className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 border-dashed rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-white/8 transition-all">
                <span className="text-lg">📷</span>
                <span className="text-sm text-white/50">{subiendoFoto ? 'Subiendo...' : form.foto_url ? 'Cambiar foto' : 'Subir foto'}</span>
                <input ref={fotoRef} type="file" accept="image/*" className="hidden" disabled={subiendoFoto} />
              </label>
              {form.foto_url && (
                <button type="button" onClick={() => setForm({ ...form, foto_url: '' })}
                  className="text-[#e74c3c] text-xs px-2 py-1 rounded-lg bg-[#e74c3c]/10 border border-[#e74c3c]/20">✕</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Emoji</label>
            <div className="grid grid-cols-9 gap-1.5 bg-white/[0.03] border border-white/8 rounded-xl p-2.5">
              {EMOJIS.map((em) => (
                <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                  className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${form.emoji === em ? 'bg-[#4db8ff]/30 border border-[#4db8ff]' : 'bg-white/[0.04] border border-transparent'}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={cargando || subiendoFoto}
              className="flex-1 bg-[#4db8ff] text-[#03174a] font-bold py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-60">
              {cargando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Agregar al catálogo'}
            </button>
            <button onClick={cerrar} className="bg-white/8 text-white/60 px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Tabs de rubro ── */}
      <div className="flex gap-1.5 flex-wrap mb-1">
        {rubrosPresentes.map((r) => {
          const info = RUBROS.find(x => x.id === r)
          return (
            <button key={r} onClick={() => setFiltroRubro(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroRubro === r ? 'bg-[#4db8ff] text-[#03174a]' : 'bg-white/[0.06] text-white/55 border border-white/10 hover:border-[#4db8ff]/40'}`}>
              {r === 'todos' ? '🗂 Todos' : `${info?.emoji || '📦'} ${r.charAt(0).toUpperCase() + r.slice(1)}`}
            </button>
          )
        })}
      </div>

      {/* ── Pendientes de foto (propuestos por tiendas) ── */}
      {productosFiltrados.filter(p => p.pendiente_foto).length > 0 && (
        <div className="bg-[#f39c12]/[0.08] border border-[#f39c12]/30 rounded-2xl p-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📸</span>
            <span className="text-sm font-bold text-white">Pendientes de foto</span>
            <span className="text-[11px] bg-[#f39c12]/20 text-[#f39c12] font-bold px-2 py-0.5 rounded-full">
              {productosFiltrados.filter(p => p.pendiente_foto).length}
            </span>
          </div>
          <div className="space-y-2">
            {productosFiltrados.filter(p => p.pendiente_foto).map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-lg shrink-0">
                  {p.emoji || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{p.nombre}</div>
                  <div className="text-[11px] text-white/40">{p.rubro} · {p.categoria}</div>
                </div>
                <button onClick={() => abrirEditar(p)}
                  className="shrink-0 bg-[#f39c12]/20 border border-[#f39c12]/40 text-[#f39c12] text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                  Subir foto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.03] border border-white/8 rounded-2xl">
          <div className="text-4xl mb-3 opacity-40">📦</div>
          <p className="text-white/40 text-sm">El catálogo master está vacío.<br />Agregá productos para que las pescaderías puedan importarlos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {productosFiltrados.map((p) => (
            <div key={p.id} className={`bg-white/[0.06] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 ${importando !== null ? 'cursor-pointer' : ''} ${seleccionados.includes(p.id) ? 'border-[#2ecc71]/50 bg-[#2ecc71]/5' : ''}`}
              onClick={importando !== null ? () => toggleSeleccion(p.id) : undefined}>
              <div className="w-11 h-11 rounded-xl bg-[#4db8ff]/12 border border-[#4db8ff]/25 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                {p.foto_url ? <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" /> : (p.emoji || '📦')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{p.nombre}</div>
                <div className="text-xs text-white/40">{p.categoria} · {p.unidad}{p.precio_sugerido ? ` · $${Number(p.precio_sugerido).toLocaleString('es-AR')} sugerido` : ''}</div>
              </div>
              {importando !== null ? (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${seleccionados.includes(p.id) ? 'bg-[#2ecc71] border-[#2ecc71]' : 'border-white/30'}`}>
                  {seleccionados.includes(p.id) && <span className="text-[#03174a] text-xs font-bold">✓</span>}
                </div>
              ) : (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => abrirEditar(p)} className="bg-white/[0.07] border border-white/10 text-white text-xs px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
                  <button onClick={() => borrar(p)} className="bg-[#e74c3c]/15 border border-[#e74c3c]/25 text-[#e74c3c] text-xs px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
