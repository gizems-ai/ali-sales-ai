import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Giriş ve kayıt yollarını herkese açık (public) olarak tanımlıyoruz
const isPublicRoute = createRouteMatcher(['/login(.*)', '/register(.*)', '/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware((auth, request) => {
  // Eğer rota public değilse, kullanıcıyı korumaya al (login'e yönlendir)
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Next.js statik dosyalarını ve iç işlemleri hariç tutan standart matcher
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};