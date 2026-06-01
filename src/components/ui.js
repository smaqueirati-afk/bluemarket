'use client'

/* ═══════════════════════════════════════════════════════════════
   BLUEMARKET · COMPONENTES UI REUTILIZABLES
   Ubicación sugerida: src/components/ui.js
   Importar donde haga falta:  import { Button, Card, Input } from '@/components/ui'
   (o ruta relativa si no usás alias: '../../components/ui')
   ═══════════════════════════════════════════════════════════════ */

/* ── BOTÓN ──
   variant: 'primary' | 'ghost' | 'danger' | 'success'
   size:    'sm' | 'md' | 'lg' */
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-none'
  const variants = {
    primary: 'bg-[#4db8ff] text-[#03174a] hover:shadow-[0_0_16px_rgba(77,184,255,0.4)]',
    ghost:   'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10',
    danger:  'bg-[#e74c3c]/15 text-[#e74c3c] border border-[#e74c3c]/30 hover:bg-[#e74c3c]/25',
    success: 'bg-[#2ecc71] text-[#03174a] hover:shadow-[0_0_16px_rgba(46,204,113,0.4)]',
  }
  const sizes = {
    sm: 'text-xs px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-[15px] px-5 py-3.5 w-full',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

/* ── CARD (superficie glassmorphism) ── */
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white/[0.06] border border-white/10 rounded-2xl backdrop-blur-sm ${
        hover ? 'transition-colors hover:border-[#4db8ff] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── INPUT con label ── */
export function Input({ label, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#4db8ff] ${className}`}
        {...props}
      />
    </div>
  )
}

/* ── BADGE (estado) ──
   tone: 'blue' | 'success' | 'warning' | 'danger' | 'neutral' */
export function Badge({ children, tone = 'blue', className = '' }) {
  const tones = {
    blue:    'bg-[#4db8ff]/15 text-[#4db8ff]',
    success: 'bg-[#2ecc71]/15 text-[#2ecc71]',
    warning: 'bg-[#f39c12]/15 text-[#f39c12]',
    danger:  'bg-[#e74c3c]/15 text-[#e74c3c]',
    neutral: 'bg-white/10 text-white/40',
  }
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

/* ── METRIC (tarjeta de métrica) ── */
export function Metric({ label, value, sub, tone = 'default', onClick }) {
  const tones = {
    default: 'text-white',
    success: 'text-[#2ecc71]',
    warning: 'text-[#f39c12]',
    danger:  'text-[#e74c3c]',
    blue:    'text-[#4db8ff]',
  }
  return (
    <Card hover={!!onClick} onClick={onClick} className="p-4">
      <div className="text-[11px] text-white/40 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 leading-none ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/30 mt-1.5">{sub}</div>}
    </Card>
  )
}

/* ── SPINNER ── */
export function Spinner({ size = 36 }) {
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: size, height: size,
        border: '3px solid rgba(77,184,255,0.2)',
        borderTopColor: '#4db8ff',
      }}
    />
  )
}

/* ── PHONE FRAME (marco responsive móvil-en-desktop) ──
   Envuelve pantallas pensadas para móvil; en desktop las centra como teléfono */
export function PhoneFrame({ children, className = '' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className={`relative w-full h-full max-w-[420px] sm:max-h-[900px] sm:rounded-[40px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden bg-[#03174a] flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  )
}

/* ── TOAST (notificación flotante) ── */
export function Toast({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-[#1e3264]/95 border-white/18 text-white',
    success: 'bg-[#2ecc71]/15 border-[#2ecc71]/40 text-[#2ecc71]',
    danger:  'bg-[#e74c3c]/15 border-[#e74c3c]/40 text-[#e74c3c]',
  }
  return (
    <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${tones[tone]}`}>
      {children}
    </div>
  )
}
