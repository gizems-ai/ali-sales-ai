import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

const isPublic = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/api/(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isPublic(req)) return

  const { userId } = await auth()
  if (!userId) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Preview / dev: ?tenant= query param'ı x-tenant-id header'ına ve cookie'ye ilet.
  // Üretim domainlerinde (sigorta.*, crm.*) bu header layout tarafından yoksayılır.
  const requestHeaders = new Headers(req.headers)
  const tenantQP     = req.nextUrl.searchParams.get('tenant')
  const cookieTenant = req.cookies.get('preview-tenant')?.value
  const effective    = tenantQP ?? cookieTenant ?? null

  if (!effective) return

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
