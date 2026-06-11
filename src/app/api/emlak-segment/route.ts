import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  let body: { segment?: string }
  try { body = await req.json() }
  catch { return Response.json({ error: 'Geçersiz JSON' }, { status: 400 }) }

  const segment = body.segment === 'bireysel' ? 'bireysel' : 'kurumsal'
  const jar = await cookies()
  jar.set('emlak_segment', segment, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 gün
    httpOnly: false,            // client-side switch için erişilebilir olmalı
    sameSite: 'lax',
  })
  return Response.json({ ok: true, segment })
}
