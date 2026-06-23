'use client'

import { useState, useEffect, useRef } from 'react'
import { crearProducto, editarProducto, toggleDisponible, borrarProducto, importarDesdeCatalogo, getCatalogoMaster, proponerAlCatalogo, crearCategoria, borrarCategoria } from './actions'
import BarraUsuario from '../../../components/BarraUsuario'
import { createClient } from '../../../lib/supabase/client'

const UNIDADES = [
  { id: 'kg', label: 'Por kg' },
  { id: 'unidad', label: 'Por unidad' },
  { id: 'docena', label: 'Por docena' },
  { id: 'gramo', label: 'Por gramo' },
  { id: 'porcion', label: 'Por porción' },
]

const LOGO_BLUEMARKET = '/icons/bluemarket/icon-192.png'

const FORM_VACIO = { nombre: '', precio: '', categoria: '', unidad: 'kg', stock: '', descripcion: '', foto_url: '' }

// Placeholder de nombre por rubro (solo a modo de ejemplo en el input)
const PLACEHOLDER_RUBRO = {
  'pescadería': 'Merluza fresca',
  'quesería': 'Brie 250g',
  'carnicería': 'Asado de tira x kg',
  'verdulería': 'Tomate redondo x kg',
  'panadería': 'Medialunas x docena',
  'rotisería': 'Pollo entero',
  'almacén': 'Arroz largo fino x kg',
}
function placeholderNombre(rubro) {
  return PLACEHOLDER_RUBRO[rubro] || 'Nombre del producto'
}

export default function GestionProductos({ productos, categorias: categoriasIniciales, nombrePescaderia, rubroInicial }) {
  const [form, setForm] = useState(FORM_VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [accionando, setAccionando] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoRef = useRef(null)
  const fotoCamaraRef = useRef(null)
  const formRef = useRef(null)
  const [verCatalogo, setVerCatalogo] = useState(false)
  const [catalogo, setCatalogo] = useState([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [importando, setImportando] = useState(false)
  const [rubroTienda, setRubroTienda] = useState(() => rubroInicial || null)
  const [proponiendo, setProponiendo] = useState(null) // productoId que se está proponiendo
  const [msgPropuesta, setMsgPropuesta] = useState(null)
  const [categorias, setCategorias] = useState(categoriasIniciales || [])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [mostrarInputCategoria, setMostrarInputCategoria] = useState(false)

  function fmt(n) {
    return '$' + Number(n).toLocaleString('es-AR')
  }

  function abrirEditar(p) {
    setForm({
      nombre: p.nombre || '',
      precio: p.precio || '',
      categoria: p.categoria || '',
      unidad: p.unidad || 'kg',
      stock: p.stock ?? '',
      descripcion: p.descripcion || '',
      foto_url: p.foto_url || '',
    })
    setEditandoId(p.id)
    setMostrarForm(true)
    setMensaje(null)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
  }

  function abrirNuevo() {
    setForm({ ...FORM_VACIO, categoria: categorias[0]?.nombre || '' })
    setEditandoId(null)
    setMostrarForm(true)
    setMensaje(null)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    setCreandoCategoria(true)
    const res = await crearCategoria(nombre)
    setCreandoCategoria(false)
    if (res?.error) {
      setMensaje({ tipo: 'error', texto: res.error })
      return
    }
    if (res?.categoria && !categorias.some((c) => c.id === res.categoria.id)) {
      setCategorias((prev) => [...prev, res.categoria])
    }
    setForm((f) => ({ ...f, categoria: res.categoria?.nombre || nombre }))
    setNuevaCategoria('')
    setMostrarInputCategoria(false)
  }

  async function eliminarCategoria(cat) {
    if (!confirm(`¿Borrar la categoría "${cat.nombre}"? Los productos que la usaban quedan sin categoría.`)) return
    const res = await borrarCategoria(cat.id)
    if (res?.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
    setCategorias((prev) => prev.filter((c) => c.id !== cat.id))
    if (form.categoria === cat.nombre) setForm((f) => ({ ...f, categoria: '' }))
  }

  async function abrirCatalogo() {
    setVerCatalogo(true)
    setSeleccionados([])
    if (catalogo.length > 0) return
    setCargandoCatalogo(true)
    const res = await getCatalogoMaster()
    setCatalogo(res.productos || [])
    if (res.rubro) setRubroTienda(res.rubro)
    setCargandoCatalogo(false)
  }

  function toggleSel(id) {
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function confirmarImport() {
    if (!seleccionados.length) return
    setImportando(true); setMensaje(null)
    const res = await importarDesdeCatalogo(seleccionados)
    if (res.error) setMensaje({ tipo: 'error', texto: res.error })
    else { setMensaje({ tipo: 'ok', texto: `${res.cantidad} producto${res.cantidad > 1 ? 's' : ''} importado${res.cantidad > 1 ? 's' : ''} ✓` }); setVerCatalogo(false); window.location.reload() }
    setImportando(false)
  }

  // Lee ancho/alto de un JPEG o PNG leyendo solo el principio del archivo,
  // SIN decodificar toda la imagen (evita quedarse sin memoria).
  async function leerDimensiones(archivo) {
    try {
      const buf = new Uint8Array(await archivo.slice(0, 256 * 1024).arrayBuffer())
      // PNG
      if (buf[0] === 0x89 && buf[1] === 0x50) {
        const dv = new DataView(buf.buffer)
        return { w: dv.getUint32(16), h: dv.getUint32(20) }
      }
      // JPEG
      if (buf[0] === 0xFF && buf[1] === 0xD8) {
        let i = 2
        while (i < buf.length - 8) {
          if (buf[i] !== 0xFF) { i++; continue }
          const marker = buf[i + 1]
          // SOF (start of frame) → trae las dimensiones
          if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
            const h = (buf[i + 5] << 8) | buf[i + 6]
            const w = (buf[i + 7] << 8) | buf[i + 8]
            return { w, h }
          }
          const len = (buf[i + 2] << 8) | buf[i + 3]
          if (len <= 0) break
          i += 2 + len
        }
      }
    } catch (e) { /* sin dimensiones */ }
    return null
  }

  // Comprime la imagen en el cliente antes de subir a Storage.
  // Decodifica YA reducida (decode-scale) para no agotar la memoria con fotos
  // de cámara de muchos megapíxeles. Máx 1200px lado largo, JPEG 0.72.
  // Devuelve un Blob, o null si no se pudo comprimir (entonces se sube el original).
  async function comprimirImagen(archivo, dimPre) {
    const MAX = 1200
    const CALIDAD = 0.72

    // 1) Camino moderno: createImageBitmap con resize → el navegador decodifica
    //    directamente en tamaño chico (bajísimo consumo de memoria) y respeta EXIF.
    try {
      const dim = dimPre || await leerDimensiones(archivo)
      const opts = { imageOrientation: 'from-image', resizeQuality: 'high' }
      if (dim && dim.w && dim.h) {
        // Fijando solo un lado, el navegador mantiene la proporción.
        if (dim.w >= dim.h) { if (dim.w > MAX) opts.resizeWidth = MAX }
        else { if (dim.h > MAX) opts.resizeHeight = MAX }
      } else {
        // Sin dimensiones conocidas: acoto por las dudas (puede deformar un poco,
        // pero evita el crash por memoria en imágenes enormes).
        opts.resizeWidth = MAX
        opts.resizeHeight = MAX
      }
      const bitmap = await createImageBitmap(archivo, opts)
      let w = bitmap.width, h = bitmap.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
      if (bitmap.close) bitmap.close()
      const blob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', CALIDAD))
      canvas.width = 0; canvas.height = 0  // liberar memoria del canvas
      if (blob) return blob
    } catch (e) {
      // sigue al fallback
    }

    // 2) Fallback liviano: objectURL (no data URL gigante) + Image
    try {
      const blob = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo)
        const img = new Image()
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')) }
        img.onload = () => {
          let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX }
            else { w = Math.round(w * MAX / h); h = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(url)
          canvas.toBlob((b) => { canvas.width = 0; canvas.height = 0; resolve(b) }, 'image/jpeg', CALIDAD)
        }
        img.src = url
      })
      if (blob) return blob
    } catch (e) {
      // cae al último recurso
    }

    // 3) No se pudo comprimir: se sube el archivo original
    return null
  }

  async function subirFoto(archivo) {
    if (!archivo) return null
    setSubiendoFoto(true)
    try {
      const supabase = createClient()

      // Evitar el "Memoria insuficiente" del WebView de Android: solo
      // decodificamos/comprimimos cuando es seguro por tamaño. Si la foto es
      // muy grande, se sube TAL CUAL (sin reservar memoria para decodificarla),
      // así no crashea. Las fotos normales sí se comprimen.
      const dim = await leerDimensiones(archivo)
      const megapixeles = dim ? (dim.w * dim.h) : null
      const seguroComprimir =
        (megapixeles != null && megapixeles <= 10000000 && archivo.size <= 5 * 1024 * 1024) ||
        (megapixeles == null && archivo.size <= 2.5 * 1024 * 1024)

      let blob = seguroComprimir ? await comprimirImagen(archivo, dim) : null
      let contentType = 'image/jpeg'
      let ext = 'jpg'
      if (!blob) {
        blob = archivo
        contentType = archivo.type || 'image/jpeg'
        ext = (archivo.name?.split('.').pop() || 'jpg').toLowerCase()
      }
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error } = await supabase.storage.from('Productos').upload(path, blob, {
        upsert: true,
        contentType,
      })
      if (error) { setMensaje({ tipo: 'error', texto: 'Error al subir foto: ' + error.message }); return null }
      const { data } = supabase.storage.from('Productos').getPublicUrl(path)
      return data.publicUrl
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error al procesar la foto: ' + (e?.message || e) })
      return null
    } finally {
      setSubiendoFoto(false)
    }
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight">Mis productos</h1>
              <p className="text-xs text-white/40 mt-0.5">{nombrePescaderia}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={abrirCatalogo}
                className="bg-[#2ecc71]/15 border border-[#2ecc71]/30 text-[#2ecc71] font-bold text-sm px-3 py-2.5 rounded-xl active:scale-95 transition-all flex items-center gap-1.5">
                📦 <span>Catálogo</span>
              </button>
              <button onClick={abrirNuevo}
                className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all">
                + Agregar
              </button>
            </div>
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
          <div ref={formRef} className="bg-white/[0.06] border border-white/12 rounded-2xl p-5 mb-5 space-y-3.5 backdrop-blur-md"
               style={{ animation: 'bmFadeUp 0.3s ease both' }}>
            <div className="font-bold text-white">{editandoId ? 'Editar producto' : 'Nuevo producto'}</div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder={placeholderNombre(rubroTienda)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
            </div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Precio *</label>
              <input type="number" inputMode="numeric" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })}
                placeholder="1800"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]" />
            </div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Categoría</label>
              {categorias.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoria: c.nombre })}
                      className={`group relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.categoria === c.nombre
                          ? 'bg-[#4db8ff] text-[#03174a] border-[#4db8ff]'
                          : 'bg-white/5 text-white/70 border-white/10'
                      }`}
                    >
                      {c.nombre}
                      <span
                        onClick={(e) => { e.stopPropagation(); eliminarCategoria(c) }}
                        className={`ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ${form.categoria === c.nombre ? 'text-[#03174a]' : 'text-white'}`}
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {mostrarInputCategoria ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCategoria())}
                    placeholder="Ej: Frutas, Verduras..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#4db8ff]"
                  />
                  <button type="button" onClick={agregarCategoria} disabled={creandoCategoria}
                    className="bg-[#4db8ff] text-[#03174a] font-bold text-sm px-4 rounded-xl active:scale-95 disabled:opacity-60">
                    {creandoCategoria ? '...' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => { setMostrarInputCategoria(false); setNuevaCategoria('') }}
                    className="bg-white/8 text-white/60 px-3 rounded-xl text-sm">
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setMostrarInputCategoria(true)}
                  className="text-xs text-[#4db8ff] font-medium flex items-center gap-1">
                  + Nueva categoría
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Unidad</label>
              <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#4db8ff]">
                {UNIDADES.map((u) => <option key={u.id} value={u.id} className="bg-[#051e5c]">{u.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">Foto del producto (opcional)</label>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-xl border border-white/20 shrink-0 overflow-hidden bg-white/5 flex items-center justify-center">
                  <img src={form.foto_url || LOGO_BLUEMARKET} alt="foto" className={form.foto_url ? 'w-full h-full object-cover' : 'w-8 h-8 opacity-40'} />
                </div>
                {form.foto_url && (
                  <button type="button" onClick={() => setForm({ ...form, foto_url: '' })}
                    className="text-[#e74c3c] text-xs px-2 py-1 rounded-lg bg-[#e74c3c]/10 border border-[#e74c3c]/20">
                    Quitar foto
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 border-dashed rounded-xl px-3 py-3 cursor-pointer hover:bg-white/8 transition-all">
                <span className="text-lg">📷</span>
                <span className="text-sm text-white/50">{subiendoFoto ? 'Subiendo...' : 'Agregar foto (cámara o galería)'}</span>
                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={subiendoFoto}
                  onChange={async (e) => {
                    const archivo = e.target.files?.[0]
                    if (!archivo) return
                    const url = await subirFoto(archivo)
                    if (url) setForm((f) => ({ ...f, foto_url: url }))
                    e.target.value = ''
                  }}
                />
              </label>
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
            <div className="text-4xl mb-3 opacity-40">📦</div>
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
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                      : <img src={LOGO_BLUEMARKET} alt="" className="w-6 h-6 opacity-50" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{p.nombre}</span>
                      {!p.disponible && <span className="text-[9px] bg-[#e74c3c]/15 text-[#e74c3c] px-1.5 py-0.5 rounded uppercase shrink-0">Sin stock</span>}
                    </div>
                    <div className="text-xs text-white/45 mt-0.5">
                      {fmt(p.precio)} · {p.unidad}
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
                    {p.disponible ? '🚫 Sin stock' : '✅ Hay stock'}
                  </button>
                  <button onClick={() => eliminar(p)} disabled={accionando === p.id}
                    className="bg-[#e74c3c]/15 border border-[#e74c3c]/25 text-[#e74c3c] text-xs font-medium py-2 px-3 rounded-lg active:scale-95 transition-all disabled:opacity-50">
                    🗑
                  </button>
                </div>

                {/* Proponer al catálogo compartido */}
                {msgPropuesta?.id === p.id ? (
                  <div className={`mt-2 text-[11px] px-3 py-2 rounded-lg ${msgPropuesta.ok ? 'bg-[#2ecc71]/12 text-[#2ecc71]' : 'bg-[#e74c3c]/12 text-[#e74c3c]'}`}>
                    {msgPropuesta.texto}
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setProponiendo(p.id)
                      setMsgPropuesta(null)
                      const res = await proponerAlCatalogo({
                        nombre: p.nombre, descripcion: p.descripcion,
                        categoria: p.categoria,
                        precio: p.precio, unidad: p.unidad,
                      })
                      setProponiendo(null)
                      if (res?.error) {
                        setMsgPropuesta({ id: p.id, ok: false, texto: res.error })
                      } else if (res?.yaExiste) {
                        setMsgPropuesta({ id: p.id, ok: true, texto: res.mensaje })
                      } else {
                        setMsgPropuesta({ id: p.id, ok: true, texto: '✓ Propuesto al catálogo. El developer le va a subir la foto.' })
                      }
                    }}
                    disabled={proponiendo === p.id}
                    className="w-full mt-2 text-[11px] text-white/40 hover:text-[#4db8ff] py-1.5 transition-colors disabled:opacity-50 text-center">
                    {proponiendo === p.id ? 'Enviando...' : '📤 Proponer al catálogo compartido'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal catálogo master */}
      {verCatalogo && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVerCatalogo(false)} />
          <div className="relative mt-auto bg-[#051e5c] border-t border-white/12 rounded-t-[28px] max-h-[85%] flex flex-col"
               style={{ animation: 'bmSlideUp 0.35s ease both' }}>
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/8">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Catálogo master 📦</h2>
                  <p className="text-xs text-white/40 mt-0.5">{seleccionados.length > 0 ? `${seleccionados.length} seleccionados` : 'Elegí los productos a importar'}</p>
                </div>
                <button onClick={() => setVerCatalogo(false)} className="text-white/40 text-2xl leading-none px-1">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 bm-no-scrollbar">
              {cargandoCatalogo ? (
                <div className="text-center py-10 text-white/40 text-sm">Cargando catálogo...</div>
              ) : catalogo.length === 0 ? (
                <div className="text-center py-10">
                  <img src={LOGO_BLUEMARKET} alt="" className="w-12 h-12 mx-auto mb-3 opacity-40 rounded-lg" />
                  <p className="text-white/40 text-sm">El catálogo master está vacío.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {catalogo.map((p) => (
                    <div key={p.id}
                      onClick={() => toggleSel(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${seleccionados.includes(p.id) ? 'bg-[#2ecc71]/10 border-[#2ecc71]/40' : 'bg-white/[0.04] border-white/10'}`}>
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.foto_url
                          ? <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                          : <img src={LOGO_BLUEMARKET} alt="" className="w-6 h-6 opacity-50" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{p.nombre}</div>
                        <div className="text-xs text-white/40">{p.categoria} · {p.unidad}{p.precio_sugerido ? ` · $${Number(p.precio_sugerido).toLocaleString('es-AR')} sugerido` : ''}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${seleccionados.includes(p.id) ? 'bg-[#2ecc71] border-[#2ecc71]' : 'border-white/30'}`}>
                        {seleccionados.includes(p.id) && <span className="text-[#03174a] text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {seleccionados.length > 0 && (
              <div className="shrink-0 px-5 py-4 border-t border-white/8">
                <button onClick={confirmarImport} disabled={importando}
                  className="w-full bg-[#2ecc71] text-[#03174a] font-bold py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-60">
                  {importando ? 'Importando...' : `Importar ${seleccionados.length} producto${seleccionados.length > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bmFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bmSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
