import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { cerrarCiclo } from '../../../../lib/fidelizacion'

// Cron diario: cierra los ciclos de fidelización cuyo mes ya terminó.
// Los clientes que sí compran en el mes nuevo se cierran solos (cierre perezoso);
// esto barre los que quedaron activos sin compras nuevas.
export async function GET(request) {
  // Seguridad: solo se ejecuta con el secret (Vercel Cron lo manda en este header).
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  const { data: vencidos, error } = await admin
    .from('fidelizacion_ciclos')
    .select('id')
    .eq('estado', 'activo')
    .lte('fecha_cierre', ahora)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let cerrados = 0
  for (const c of vencidos || []) {
    try {
      await cerrarCiclo(admin, c.id)
      cerrados++
    } catch (e) {
      // seguir con los demás aunque uno falle
    }
  }

  return NextResponse.json({ ok: true, cerrados, total: (vencidos || []).length })
}
