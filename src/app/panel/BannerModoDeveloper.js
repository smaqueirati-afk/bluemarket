'use client'

import { salirModoDeveloper } from '../(developer)/dashboard/actions'

export default function BannerModoDeveloper({ nombreTienda }) {
  return (
    <div className="sticky top-0 z-50 bg-[#4db8ff] text-[#03174a] shadow-lg">
      <div className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-between gap-3 text-sm font-bold">
        <span className="truncate">⚙️ Gestionando "{nombreTienda}" como developer</span>
        <button
          onClick={async () => { await salirModoDeveloper(); window.location.href = '/dashboard' }}
          className="bg-[#03174a] text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 active:scale-95 whitespace-nowrap">
          ← Volver al panel
        </button>
      </div>
    </div>
  )
}
