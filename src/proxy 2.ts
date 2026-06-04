import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublic = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/api/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return

  const { userId } = await auth()
  if (!userId) {
    const loginUrl = new URL('/login', req.url)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)).*)',
  ],
}
