import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Sadece bu yollar herkese açık
const isPublicRoute = createRouteMatcher(['/login(.*)', '/register(.*)', '/api/webhooks(.*)']);

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();
  const isPublic = isPublicRoute(req);

  // 1. Giriş yapmış kullanıcı tekrar login'e gitmeye çalışırsa dashboard'a zorla gönder
  if (userId && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Giriş yapmamış kullanıcı gizli sayfaya gitmeye çalışırsa korumaya al
  if (!userId && !isPublic) {
    return auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};