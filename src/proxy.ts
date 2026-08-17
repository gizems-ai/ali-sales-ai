import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { storeosAdanmisHostMu } from '@/lib/storeos/host-guard'

const isPublic = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/api/(.*)',
  '/broker/kayit(.*)', // QR onboarding — giriş yapmamış yeni broker erişir
  '/storeos/giris(.*)', // Store OS kendi giriş sayfası — root layout'un signInFallbackRedirectUrl="/" döngüsünü kırar
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // ── Store OS host'unda yön tayini (17 Ağu 2026) ─────────────────────────────
  // Store OS'e AYRILMIŞ host'ta panelin `/` ve `/login` kapıları çalışmaz: o
  // host'ta çözülecek emlak/sigorta tenant'ı yok. `(panel)/layout.tsx` tenant
  // bulamayınca `/login`e atar, `/login`deki <SignIn forceRedirectUrl="/">
  // oturumu olan kullanıcıyı tekrar `/`e yollar → ekran yanıp söner (canlıda
  // yaşandı). Kullanıcıyı kendi kapısına gönderiyoruz.
  //
  // KAPSAM: yalnız STOREOS_PROD_HOSTLARI'nda LİSTELİ host'lar. Emlak/sigorta
  // host'ları ve preview URL'leri listede olmadığı için bu blok onlarda hiç
  // çalışmaz — mevcut davranış birebir korunur.
  const storeosHost = storeosAdanmisHostMu(req.headers.get('host') ?? '')
  const yol = req.nextUrl.pathname
  if (storeosHost && (yol === '/' || yol.startsWith('/login') || yol.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/storeos', req.url))
  }

  if (isPublic(req)) return

  const { userId, sessionClaims } = await auth()
  if (!userId) {
    // Store OS alanında oturumsuz kullanıcı panelin /login'ine DEĞİL, Store OS'in
    // kendi giriş sayfasına gider. Yol tabanlı kural: emlak/sigorta'da /storeos
    // diye bir yol yok, dolayısıyla onlarda hiç tetiklenmez.
    if (yol === '/storeos' || yol.startsWith('/storeos/')) {
      return NextResponse.redirect(new URL('/storeos/giris', req.url))
    }
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // ── Broker OS izolasyonu ────────────────────────────────────────────────────
  // Broker (publicMetadata.rol === 'broker') SADECE /broker/* görür; kurumsal
  // panelin hiçbir route'una giremez. Ters yön (/broker erişimi) (broker)/layout
  // içinde sunucu tarafında yönetilir — emlak_demo admin'i metadata'sız olduğu
  // için burada rol'e göre gate edilemez.
  //
  // NOT: sessionClaims.metadata'nın dolması için Clerk Dashboard → Sessions →
  // "Customize session token" içine  { "metadata": "{{user.public_metadata}}" }
  // eklenmelidir. Bu adım yapılmadan bu blok pasif kalır; /broker tarafı yine de
  // layout guard ile korunur. (Kurumsal kullanıcılar rol!=='broker' olduğu için
  // bu bloktan hiç etkilenmez → regresyon yok.)
  const rol = (sessionClaims?.metadata as { rol?: string } | undefined)?.rol
  const path = req.nextUrl.pathname
  const brokerAlani = path === '/broker' || path.startsWith('/broker/')
  if (rol === 'broker' && !brokerAlani) {
    return NextResponse.redirect(new URL('/broker', req.url))
  }

  // Preview / dev: ?tenant= query param'ı x-tenant-id header'ına ve cookie'ye ilet.
  // GÜVENLİK: Bu override YALNIZCA production-DIŞI deployment'ta geçerli. Prod
  // deployment'ında (VERCEL_ENV==='production' — sigorta.alisales.ai VE onun ham
  // *.vercel.app URL'i dahil) client'ın gönderdiği x-tenant-id sökülür ve ?tenant/cookie
  // yoksayılır. Asıl chokepoint yetki.ts (getTenantConfigFromRequest); bu, sayfa
  // istekleri için ek savunmadır (/api/* zaten isPublic → middleware'i baypas eder).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete('x-tenant-id')  // client-forge edilmiş header'ı her authed istekte sök

  const previewDeploy = process.env.VERCEL_ENV !== 'production'
  const tenantQP     = previewDeploy ? req.nextUrl.searchParams.get('tenant') : null
  const cookieTenant = previewDeploy ? req.cookies.get('preview-tenant')?.value : null
  const effective    = tenantQP ?? cookieTenant ?? null

  if (!effective) return NextResponse.next({ request: { headers: requestHeaders } })

  requestHeaders.set('x-tenant-id', effective)
  const res = NextResponse.next({ request: { headers: requestHeaders } })

  if (tenantQP) {
    res.cookies.set('preview-tenant', tenantQP, { maxAge: 3600, path: '/', sameSite: 'lax' })
  }

  return res
})

export const config = {
  matcher: [
    // decks/ — public/decks altındaki statik HTML deck'ler auth middleware'ini baypas eder
    // (yoksa Clerk /decks/*.html'i /login'e 307'liyor → ContentViewer iframe boş kalıyor).
    '/((?!_next/static|_next/image|favicon\\.ico|decks/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)).*)',
  ],
}
