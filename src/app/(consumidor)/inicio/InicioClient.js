'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InicioClient() {
  const router = useRouter()

  useEffect(() => {
    // Intentar recuperar slug guardado antes del login OAuth
    try {
      const slug = localStorage.getItem('bm_slug_pendiente')
      if (slug) {
        localStorage.removeItem('bm_slug_pendiente')
        router.replace(`/t/${slug}`)
        return
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-[linear-gradient(180deg,#051e5c_0%,#03174a_100%)]">
      <div className="text-5xl mb-4">🐟</div>
      <h1 className="text-xl font-extrabold text-white mb-2">Todavía no estás vinculado a una pescadería</h1>
      <p className="text-white/55 text-sm leading-relaxed max-w-xs">
        Para comprar, abrí el link que te compartió tu pescadería.
      </p>
    </div>
  )
}
