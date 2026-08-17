// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO TELEFON KİLİDİ (güvenlik kapısı)
//
//  Bu bir kolaylık ayarı DEĞİL. Amacı tek cümleyle: `Kullanicilar` tablosuna
//  gerçek numaralar girildiği gün, prova/demo sırasında hiçbir mesajın
//  yanlışlıkla gerçek bir Gratis çalışanına gitmemesi.
//
//  ── DAVRANIŞ ──────────────────────────────────────────────────────────────
//  Kilit AÇIKKEN (varsayılan): dışarı çıkan her mesajın hedef numarası
//  STOREOS_DEMO_TELEFON ile DEĞİŞTİRİLİR ve ezme işlemi hem gönderim logunda
//  hem denetim kaydında görünür. Sessiz ezme yoktur — ezildiğini görmediğin
//  bir kilit, olmayan bir kilittir.
//
//  ── FAIL-CLOSED ───────────────────────────────────────────────────────────
//  Kilit açık ama STOREOS_DEMO_TELEFON boş/geçersizse: dışarı çıkan kanallarda
//  gönderim REDDEDİLİR. "Hedef yok, o zaman gerçek numaraya gönderelim"
//  davranışı kapının tamamını anlamsız kılardı. Kapının açık kalması hata
//  vermekten daha pahalıdır.
//  Dışarı çıkmayan kanallarda (konsol) reddetmeyiz: hiçbir yere mesaj gitmiyor,
//  yalnız uyarı basılır — böylece testler ve zincir demosu koşmaya devam eder.
//
//  ── KİLİDİ KAPATMAK ───────────────────────────────────────────────────────
//  STOREOS_TELEFON_KILIDI = 'kapali-gercek-alicilara-gonder'  (TAM eşleşme)
//  'false' / '0' / 'kapali' / 'off' KABUL EDİLMEZ. Kilidi kapatmak bilinçli
//  bir karar olmalı; bir yazım hatası ya da kopyala-yapıştır kazası değil.
//
//  ── İKİ KATMAN (bilerek) ──────────────────────────────────────────────────
//  1. `bildirim.ts` gönderim öncesi `hedefiCoz`'u çağırır, etkin numarayı
//     kayda yazar (Gonderilen Telefon) — böylece gelen yanıtın numarası
//     doğru numarayla eşleşir ve denetim gerçeği söyler.
//  2. `kilitle()` sarmalayıcısı kanalın ta kendisini sarar — `bildirim.ts`'i
//     baypas eden gelecekteki bir çağıran da kapıdan geçmek zorunda kalır.
//  Tek katman yeterli görünüyor; ikincisi "birileri ileride unutursa" içindir.
// ════════════════════════════════════════════════════════════════════════════

import { env } from '../env'
import type { GelenYanit, GidenMesaj, GonderimSonucu, KanalArayuzu } from './tipler'

/** E.164: '+' + ülke kodu + numara, 8–15 hane. Boşluk/parantez kabul edilmez. */
const E164 = /^\+[1-9]\d{7,14}$/

export function e164Mi(t: string): boolean {
  return E164.test(t.trim())
}

export interface KilitDurumu {
  acik: boolean
  /** Kilit açıkken tüm mesajların gideceği numara. Geçersizse boş. */
  hedef: string
  /** Kilit açık ama hedef kullanılamıyorsa sebebi; yoksa null. */
  engel: string | null
}

export function kilitDurumu(): KilitDurumu {
  const acik = env.telefonKilidiAcik
  const hedef = env.demoTelefon
  if (!acik) return { acik: false, hedef, engel: null }
  if (!hedef) {
    return { acik: true, hedef: '', engel: 'STOREOS_DEMO_TELEFON tanımlı değil.' }
  }
  if (!e164Mi(hedef)) {
    return { acik: true, hedef: '', engel: `STOREOS_DEMO_TELEFON E.164 değil: ${hedef}` }
  }
  return { acik: true, hedef, engel: null }
}

export interface CozumSonucu {
  /** Mesajın gerçekten gideceği numara. `engel` doluysa anlamsızdır. */
  telefon: string
  /** Hedef ezildi mi? Log ve denetim bunu gösterir. */
  ezildi: boolean
  /** Gönderim yapılamaz — sebebi burada. Dışarı çıkan kanallarda reddet. */
  engel: string | null
}

/**
 * Saf fonksiyon: istenen numara → gerçekte kullanılacak numara.
 * `bildirim.ts` ve sarmalayıcı aynı bunu çağırır; iki yol asla ayrışmaz.
 */
export function hedefiCoz(istenen: string): CozumSonucu {
  const k = kilitDurumu()
  if (!k.acik) return { telefon: istenen, ezildi: false, engel: null }
  if (k.engel) return { telefon: '', ezildi: false, engel: k.engel }
  return {
    telefon: k.hedef,
    ezildi: istenen.trim() !== k.hedef,
    engel: null,
  }
}

/** Gönderim logunda ve denetimde görünen tek biçimli satır. */
export function ezmeNotu(istenen: string, etkin: string): string {
  return `demo telefon kilidi: hedef ezildi ${istenen} → ${etkin}`
}

// ─── Sarmalayıcı ─────────────────────────────────────────────────────────────

/** Engel uyarısı süreç başına bir kez basılsın diye (bkz. `gonder`). */
let engelUyarisiVerildi = false

/** Yalnız testler için: uyarı sayacını sıfırlar. */
export function kilitUyarisiniSifirla(): void {
  engelUyarisiVerildi = false
}

class KilitliKanal implements KanalArayuzu {
  constructor(private readonly ic: KanalArayuzu) {}

  get ad() { return this.ic.ad }
  get disaCikar() { return this.ic.disaCikar }

  async gonder(m: GidenMesaj): Promise<GonderimSonucu> {
    const c = hedefiCoz(m.aliciTelefon)

    if (c.engel) {
      if (this.ic.disaCikar) {
        // FAIL-CLOSED. Bu hata bildirim kaydında 'hata' olarak görünür.
        return {
          basarili: false,
          hata: `Demo telefon kilidi açık ama hedef kullanılamıyor — ${c.engel} `
              + `Gönderim yapılmadı (gerçek alıcıya gitmesin diye).`,
          tekrarDenenebilir: false,
        }
      }
      // Konsol: hiçbir yere mesaj gitmiyor, zinciri durdurmanın anlamı yok.
      // Uyarı süreç başına BİR kez: her mesajda tekrarlarsa test çıktısını
      // boğar ve okunmaz hale gelir — okunmayan uyarı uyarı değildir.
      if (!engelUyarisiVerildi) {
        engelUyarisiVerildi = true
        console.warn(`[storeos:kilit] UYARI — ${c.engel} Kanal dışarı çıkmıyor, gönderim sürüyor.`)
      }
      return this.ic.gonder(m)
    }

    if (!c.ezildi) return this.ic.gonder(m)

    const not = ezmeNotu(m.aliciTelefon, c.telefon)
    console.warn(`[storeos:kilit] ${not}  (bildirim ${m.bildirimId})`)
    const sonuc = await this.ic.gonder({ ...m, aliciTelefon: c.telefon })
    // Notu sonuca iliştiriyoruz: bildirim.ts bunu denetim kaydına yazıyor.
    return sonuc.basarili
      ? { ...sonuc, not: sonuc.not ? `${sonuc.not} | ${not}` : not }
      : sonuc
  }

  gelenCoz(ham: unknown): GelenYanit | null {
    return this.ic.gelenCoz(ham)
  }
}

/** Kanalı kilidin arkasına al. `index.ts` her kanalı bundan geçirir. */
export function kilitle(ic: KanalArayuzu): KanalArayuzu {
  return new KilitliKanal(ic)
}
