import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import GestionProductos from './GestionProductos'

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, pescaderia_id, nombre')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  let pescaderiaId = perfil?.pescaderia_id

  if (perfil?.rol === 'developer') {
    const ck = (await cookies()).get('bm_dev_tienda')?.value
    if (!ck) redirect('/dashboard')
    pescaderiaId = ck
  } else if (!perfil || perfil.rol !== 'cliente' || !perfil.pescaderia_id) {
    redirect('/inicio')
  }

  const { data: pescaderia } = await admin
    .from('pescaderias')
    .select('nombre, rubro, emoji_rubro')
    .eq('id', pescaderiaId)
    .single()

  const { data: productos } = await admin
    .from('productos')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .order('created_at', { ascending: false })

  const { data: categorias } = await admin
    .from('categorias_producto')
    .select('*')
    .eq('pescaderia_id', pescaderiaId)
    .order('orden', { ascending: true })

  return (
    <GestionProductos
      productos={productos || []}
      categorias={categorias || []}
      nombrePescaderia={pescaderia?.nombre || 'Mi tienda'}
      rubroInicial={pescaderia?.rubro || null}
    />
  )
}
