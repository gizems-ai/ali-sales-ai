// ════════════════════════════════════════════════════════════════════════════
//  GET /api/storeos/saglik — iskelet canlılık kontrolü.
//  Sır sızdırmaz: yalnız "tanımlı mı" bilgisi döner, değer dönmez.
//  NOT: middleware /api/* yolunu public bırakıyor (mevcut davranış, madde 1'de
//  değiştirmemem söylendi) → Store OS API'leri kendi kontrolünü kendi yapar.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { eksikDegiskenler, env } from '@/lib/storeos/env'
import { storeosHostuMu } from '@/lib/storeos/host-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, process.env.VERCEL_ENV === 'production')) {
    return Response.json({ hata: 'Not found' }, { status: 404 })
  }

  const { userId } = await auth()
  if (!userId) return Response.json({ hata: 'Forbidden' }, { status: 403 })

  const eksik = eksikDegiskenler()
  return Response.json({
    ok: eksik.length === 0,
    surum: 'gun-1-iskelet',
    host,
    kanal: env.kanal,
    eksikDegiskenler: eksik,
  })
}
