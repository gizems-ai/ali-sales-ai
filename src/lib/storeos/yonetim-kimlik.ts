// ════════════════════════════════════════════════════════════════════════════
//  Store OS — YÖNETİM KİMLİĞİ (demo kontrol paneli + ölçüm uçları)
//
//  Bu uçlar "veriyi göster" değil "sistemi oynat" uçlarıdır: senaryo tetikler,
//  demoyu sıfırlar, WhatsApp yanıtı taklit eder. Görev ekranından farklı bir
//  eşik ister — jüri odasındaki bir izleyicinin oturumu açık olsa bile demoyu
//  sıfırlayamamalı.
//
//  ── İKİ KİMLİK (escalation/kontrol ile aynı desen) ─────────────────────────
//   · Makine  → Authorization: Bearer <STOREOS_CRON_TOKEN>
//     Token TANIMSIZSA bu yol kapalıdır; sessizce açık bırakmıyoruz.
//   · Panel   → Clerk oturumu + Store OS kullanıcısı + YÖNETİCİ olması
//
//  ── "YÖNETİCİ" KİM ─────────────────────────────────────────────────────────
//  Birincil kaynak `STOREOS_ADMIN_CLERK_IDS`. Liste BOŞSA uç kilitlenmez ama
//  açılmaz da: `Kullanicilar.Rol = 'merkez'` olan kullanıcı yönetici sayılır.
//  Gerekçe: merkez zaten eskalasyonun son durağı ve rol tablosu Store OS'in
//  kendi kaydıdır — yani "kimse tanımlı değilse herkese aç" DEĞİL, "rol
//  tablosundaki en üst role aç". Prod'da liste doldurulur ve rol yolu devre
//  dışı kalır (liste doluysa YALNIZ liste geçerlidir).
//
//  Dönen değer bilinçli olarak Response|null: çağıran `if (red) return red`
//  yazar, kimlik mantığı tek dosyada kalır.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import type { Depo } from './depo/tipler'
import { env } from './env'
import { storeosHostuMu } from './host-guard'
import { clerkKullanicisi } from './yetki'

export interface KimlikSonucu {
  /** Reddedildiyse doğrudan döndürülecek yanıt; izinliyse null. */
  red: Response | null
  /** Denetim kaydına yazılacak aktör. */
  aktor: string
}

function bearer(istek: Request): string {
  const b = istek.headers.get('authorization') ?? ''
  return b.startsWith('Bearer ') ? b.slice(7).trim() : ''
}

export async function yoneticiMi(istek: Request, d: Depo): Promise<KimlikSonucu> {
  const token = bearer(istek)

  // ── Makine yolu ──
  if (token) {
    if (!env.cronToken || token !== env.cronToken) {
      return { red: Response.json({ hata: 'Yetkisiz.' }, { status: 401 }), aktor: '' }
    }
    return { red: null, aktor: 'cron' }
  }

  // ── Panel yolu ──
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, env.prodMu)) {
    return { red: Response.json({ hata: 'Not found' }, { status: 404 }), aktor: '' }
  }

  const { userId } = await auth()
  if (!userId) {
    return { red: Response.json({ hata: 'Oturum gerekli' }, { status: 403 }), aktor: '' }
  }

  const kullanici = await clerkKullanicisi(d, userId)
  if (!kullanici) {
    return {
      red: Response.json(
        { hata: 'Bu hesap Store OS kullanıcı listesinde tanımlı değil.' },
        { status: 403 },
      ),
      aktor: '',
    }
  }

  const liste = env.adminClerkIds
  const izinli = liste.length > 0 ? liste.includes(userId) : kullanici['Rol'] === 'merkez'
  if (!izinli) {
    return {
      red: Response.json(
        {
          hata: 'Demo kontrol paneli yalnız yöneticilere açıktır.',
          kod: 'yonetici_degil',
        },
        { status: 403 },
      ),
      aktor: '',
    }
  }

  return { red: null, aktor: kullanici['Kullanici ID'] }
}

/** Sayfa tarafı (RSC) için aynı karar — API'siz, yalnız evet/hayır. */
export async function yoneticiOturumuMu(d: Depo, clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false
  const kullanici = await clerkKullanicisi(d, clerkUserId)
  if (!kullanici) return false
  const liste = env.adminClerkIds
  return liste.length > 0 ? liste.includes(clerkUserId) : kullanici['Rol'] === 'merkez'
}
