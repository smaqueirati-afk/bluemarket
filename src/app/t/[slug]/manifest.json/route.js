import { createAdminClient } from '../../../../lib/supabase/admin'

// GET /t/[slug]/manifest.json
// Sirve un manifest dinámico con íconos según el rubro de la tienda.
export async function GET(request, { params }) {
  const { slug } = await params

  const admin = createAdminClient()
  const { data: tienda } = await admin
    .from('pescaderias')
    .select('nombre, nombre_corto, rubro, emoji_rubro')
    .eq('slug', slug)
    .maybeSingle()

  const rubro = tienda?.rubro || 'Comercio'
  const nombre = tienda?.nombre || 'BlueMarket'
  // Etiqueta corta del ícono en el celu del cliente (cae al nombre completo si no hay)
  const nombreCorto = tienda?.nombre_corto || nombre

  // Mapeo rubro → carpeta de íconos (normalizado: sin tildes, sin importar mayúsculas)
  const r = rubro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const esPescaderia = r.includes('pescaderia') || r.includes('pescado')
  const esQueseria = r.includes('queseria') || r.includes('queso')
  const carpeta = esQueseria ? 'queseria' : esPescaderia ? 'pescaderia' : 'bluemarket'

  // Los archivos de la carpeta pescadería tienen sufijo propio en el nombre
  const sufijo = carpeta === 'pescaderia' ? '-pescaderia' : ''

  const manifest = {
    name: nombre,
    short_name: nombreCorto,
    description: `${nombre} en BlueMarket`,
    id: `/t/${slug}`,
    start_url: `/t/${slug}`,
    scope: `/t/${slug}`,
    display: 'standalone',
    background_color: '#03174a',
    theme_color: '#03174a',
    orientation: 'portrait',
    icons: [
      {
        src: `/icons/${carpeta}/icon-192${sufijo}.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `/icons/${carpeta}/icon-512${sufijo}.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `/icons/${carpeta}/apple-touch-icon${sufijo}.png`,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
