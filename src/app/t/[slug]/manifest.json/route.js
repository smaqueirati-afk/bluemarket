import { createAdminClient } from '../../../../lib/supabase/admin'

// GET /t/[slug]/manifest.json
// Sirve un manifest dinámico con íconos según el rubro de la tienda.
export async function GET(request, { params }) {
  const { slug } = await params

  const admin = createAdminClient()
  const { data: tienda } = await admin
    .from('pescaderias')
    .select('nombre, rubro, emoji_rubro')
    .eq('slug', slug)
    .maybeSingle()

  const rubro = tienda?.rubro || 'pescadería'
  const nombre = tienda?.nombre || 'BlueMarket'

  // Mapeo rubro → carpeta de íconos
  const carpeta = rubro === 'quesería' ? 'queseria' : 'pescaderia'

  const manifest = {
    name: nombre,
    short_name: nombre,
    description: `${nombre} en BlueMarket`,
    start_url: `/t/${slug}`,
    display: 'standalone',
    background_color: '#03174a',
    theme_color: '#03174a',
    orientation: 'portrait',
    icons: [
      {
        src: `/icons/${carpeta}/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `/icons/${carpeta}/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `/icons/${carpeta}/apple-touch-icon.png`,
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
