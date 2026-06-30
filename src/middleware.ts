import { NextResponse, type NextRequest } from 'next/server'

// ════════════════════════════════════════════════════════════════════════════
//  Preview-only tenant override
//  AMAÇ: Vercel preview host'larında (emlak-crm-git-…vercel.app) ?tenant=emlak_demo
//        ile tenant'ı açabilmek. Production davranışı DEĞİŞMEZ.
//
//  GÜVENLİK SINIRI (iki bağımsız kat):
//   1) Bu middleware: host PROD_HOSTS'taysa hiçbir şey yapmaz — ?tenant= yok sayılır,
//      cookie yazılmaz, x-tenant-id set EDİLMEZ. (aşağıdaki erken return)
//   2) Asıl/yetkili kat yetki.ts'te: getTenantConfigFromRequest ve getKullanicıProfili
//      ÖNCE PROD_HOST_MAP[host]'a bakar; prod host'ta x-tenant-id hiç okunmaz.
//   Yani prod'da bu parametreyle tenant ATLANAMAZ — middleware drift etse bile
//   yetki.ts katmanı tek başına bunu garanti eder.
//
//  Clerk: bu middleware clerkMiddleware DEĞİL — auth davranışını ne ekler ne kaldırır;
//  yalnız non-prod host'ta query→header enjekte eder, gerisi NextResponse.next().
// ════════════════════════════════════════════════════════════════════════════

// yetki.ts'teki PROD_HOST_MAP anahtarlarıyla SENKRON kalmalı.
// (yetki.ts edge-safe olmadığı için import edilmiyor; senkron bu yorumla zorunlu.)
const PROD_HOSTS = new Set<string>([
  'sigorta.alisales.ai',
  'crm.alisales.ai',
  'panel.alisales.ai',
  'emlak.alisales.ai',
])

const COOKIE = 'x_tenant_preview'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''

  // ── GÜVENLİK SINIRI #1: production host → override tamamen devre dışı ──
  if (PROD_HOSTS.has(host)) return NextResponse.next()

  // Yalnız non-prod/preview/localhost: ?tenant= ya da daha önce set edilmiş cookie.
  const qpTenant = req.nextUrl.searchParams.get('tenant')
  const tenant = qpTenant ?? req.cookies.get(COOKIE)?.value
  if (!tenant) return NextResponse.next()

  // yetki.ts'in zaten okuduğu x-tenant-id header'ını besle.
  const headers = new Headers(req.headers)
  headers.set('x-tenant-id', tenant)

  const res = NextResponse.next({ request: { headers } })
  // Query ile gelindiyse, sonraki gezinmelerde tenant düşmesin diye cookie'le.
  if (qpTenant) res.cookies.set(COOKIE, qpTenant, { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}

export const config = {
  // Statik dosyalar ve _next dışındaki tüm istekler.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js)$).*)'],
}
