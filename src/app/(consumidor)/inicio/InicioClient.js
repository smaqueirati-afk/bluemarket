'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InicioClient() {
  const router = useRouter()

  useEffect(() => {
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
      <div className="mb-6">
        <span className="text-4xl font-extrabold tracking-tight">
          <span className="text-[#4db8ff]">Blue</span><span className="text-white">Market</span>
        </span>
      </div>
      <h1 className="text-xl font-extrabold text-white mb-2">Todavía no estás vinculado a una tienda Blue</h1>
      <p className="text-white/55 text-sm leading-relaxed max-w-xs">
        Para comprar, abrí el link que te compartió tu tienda.
      </p>
    </div>
  )
}
