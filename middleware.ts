import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Sadece bu yollar korumasız (herkese açık) olacak
const isPublicRoute = createRouteMatcher(['/login(.*)', '/register(.*)']);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Statik dosyaları ve iç işleyişi koruma dışında tutan standart matcher
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};