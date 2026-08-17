// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÖREV YETKİSİ
//
//  Panelin `src/lib/yetki.ts` dosyası BURAYA GİRMEZ (izolasyon kuralı) ve
//  kopyalanmadı da: oradaki model tenant/rol/Clerk claim üzerine kurulu,
//  buradaki soru tek cümle — "bu kişi bu görevi değiştirebilir mi?".
//
//  MODEL (bilinçli olarak küçük):
//   · Görevin atandığı kişi kendi görevini yönetir.
//   · Mağaza müdürü kendi mağazasındaki her görevi yönetir.
//   · Bölge müdürü ve merkez her görevi yönetir (eskalasyon hattı onlar).
//   · Personel/güvenlik yalnız KENDİ görevini yönetir.
//   · Farklı mağazanın görevine kimse dokunamaz (mağaza müdürü dahil).
//
//  DEMO SINIRI — açıkça: yetki kontrolü rol tablosundan okunur, Clerk
//  organizasyon rolünden değil. Bir kullanıcının Store OS'teki rolü
//  `Kullanicilar.Rol` alanıdır; Clerk yalnız KİMLİK sağlar. Çok kiracılı
//  üründe bu ikisi bağlanacak (backlog).
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from './depo'
import type { Gorev, Kullanici, Rol } from './tipler'

/** Her mağazadaki her göreve yetkili roller — eskalasyon hattı. */
const HER_GOREVE_YETKILI: readonly Rol[] = ['bolge_muduru', 'merkez']

/** Kendi mağazasındaki her göreve yetkili roller. */
const MAGAZA_GENELI_YETKILI: readonly Rol[] = ['magaza_muduru']

export type YetkiSonucu =
  | { izinli: true; kullanici: Kullanici }
  | { izinli: false; sebep: string; kod: 'kullanici_yok' | 'baska_magaza' | 'baskasinin_gorevi' }

/**
 * Clerk kullanıcı id'sinden Store OS kullanıcısını bulur.
 * Eşleşme `Kullanicilar.Clerk User ID` alanındandır — Clerk'te oturum açmış
 * ama Store OS'e tanıtılmamış biri YETKİSİZDİR (varsayılan reddet).
 */
export async function clerkKullanicisi(d: Depo, clerkUserId: string): Promise<Kullanici | null> {
  if (!clerkUserId) return null
  const hepsi = await d.referans.kullanicilar()
  return hepsi.find(k => k['Clerk User ID'] === clerkUserId && k['Aktif']) ?? null
}

export function gorevYetkisi(kullanici: Kullanici | null, gorev: Gorev): YetkiSonucu {
  if (!kullanici) {
    return {
      izinli: false, kod: 'kullanici_yok',
      sebep: 'Bu hesap Store OS kullanıcı listesinde tanımlı değil.',
    }
  }

  const rol = kullanici['Rol']

  if (HER_GOREVE_YETKILI.includes(rol)) return { izinli: true, kullanici }

  if (kullanici['Magaza Kodu'] !== gorev['Magaza Kodu']) {
    return {
      izinli: false, kod: 'baska_magaza',
      sebep: `Görev ${gorev['Magaza Kodu']} mağazasına ait, kullanıcı ${kullanici['Magaza Kodu']} mağazasında.`,
    }
  }

  if (MAGAZA_GENELI_YETKILI.includes(rol)) return { izinli: true, kullanici }

  if (gorev['Atanan Kullanici ID'] === kullanici['Kullanici ID']) return { izinli: true, kullanici }

  return {
    izinli: false, kod: 'baskasinin_gorevi',
    sebep: `'${rol}' rolü yalnız kendisine atanmış görevleri değiştirebilir.`,
  }
}

/**
 * WhatsApp yanıtında Clerk yoktur; kimlik GÖNDEREN NUMARADIR.
 * Numara eşleşmesi zayıf bir kimliktir (numara taşınabilir, klonlanabilir) —
 * bu yüzden inbound yolu ayrıca bearer token'la korunur ve yanıt yalnız
 * KENDİSİNE GÖNDERİLMİŞ bildirime uygulanır (bkz. inbound.ts).
 */
export function telefonEslesmesi(
  bildirimAliciTelefon: string,
  gonderenTelefon: string,
): boolean {
  return normalizeTelefon(bildirimAliciTelefon) === normalizeTelefon(gonderenTelefon)
}

/** '+90 555 111 22 33' · '90555...' · '0555...' → yalnız rakamlar, son 10 hane. */
export function normalizeTelefon(t: string): string {
  const rakam = (t ?? '').replace(/\D/g, '')
  return rakam.slice(-10)
}
