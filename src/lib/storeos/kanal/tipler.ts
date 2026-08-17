// ════════════════════════════════════════════════════════════════════════════
//  Store OS — BİLDİRİM KANALI ARAYÜZÜ
//
//  İş mantığı 360Dialog'u, n8n'i, WhatsApp'ı TANIMAZ. `bildirim.ts` yalnız bu
//  arayüzü çağırır; hangi uygulamanın döndüğü `index.ts` + `STOREOS_KANAL`
//  kararıdır. Depo katmanıyla birebir aynı desen.
//
//  Neden bu ayrım demo için de önemli: jüri önünde WhatsApp hattı düşerse
//  `STOREOS_KANAL=konsol` ile zincir aynen çalışmaya devam eder ve panelde
//  bildirim kayıtları görünür. Kanal, zincirin kırılma noktası olmamalı.
//
//  SMS/e-posta/push eklenecekse: yeni dosya + `index.ts`'e bir satır. Ne
//  `bildirim.ts` ne de `olay-alim.ts` değişir.
// ════════════════════════════════════════════════════════════════════════════

import type { Kanal } from '../tipler'

// ─── Giden ───────────────────────────────────────────────────────────────────

/**
 * Butonun taşıdığı aksiyon. WhatsApp interaktif buton id'sine gömülür ve
 * yanıt geldiğinde geri çözülür (bkz. `buton.ts`).
 */
export const BUTON_AKSIYONLARI = ['kabul', 'devret', 'ertele'] as const
export type ButonAksiyonu = (typeof BUTON_AKSIYONLARI)[number]

export function butonAksiyonuMu(x: unknown): x is ButonAksiyonu {
  return typeof x === 'string' && (BUTON_AKSIYONLARI as readonly string[]).includes(x)
}

export interface GidenButon {
  /** Sağlayıcıya giden opak id. `buton.ts` üretir, elle yazılmaz. */
  id: string
  /** Kullanıcının gördüğü etiket. WhatsApp sınırı 20 karakter. */
  etiket: string
}

export interface GidenMesaj {
  /** Idempotency anahtarı = Bildirim ID. Kanal bunu sağlayıcıya taşıyabilir. */
  bildirimId: string
  aliciTelefon: string
  aliciAd: string
  govde: string
  butonlar: GidenButon[]
  /** Oturum penceresi dışındaysa template adı; içindeyse boş (serbest mesaj). */
  template?: string
  /** İzlenebilirlik — kanal loglarında görünsün diye. */
  gorevNo?: string
}

export type GonderimSonucu =
  | { basarili: true; saglayiciMesajId: string; not?: string }
  | { basarili: false; hata: string; tekrarDenenebilir: boolean }

// ─── Gelen ───────────────────────────────────────────────────────────────────

/**
 * Kanal-bağımsız gelen yanıt. WhatsApp'a özgü hiçbir alan YOKTUR: n8n'in
 * gönderdiği gövde `whatsapp.ts` içinde bu şekle çevrilir, ondan sonrası
 * kanaldan bağımsız akar.
 */
export interface GelenYanit {
  /** Sağlayıcının gelen mesaj id'si — inbound idempotency anahtarı. */
  saglayiciMesajId: string
  /** Butona gömülü id. Serbest metin yanıtında boş olur. */
  butonId: string | null
  /** Kullanıcı düz metin yazdıysa. */
  metin: string | null
  gonderenTelefon: string
  /** ISO. Verilmezse alım anı kullanılır. */
  zaman?: string
}

export interface KanalArayuzu {
  readonly ad: Kanal
  /**
   * Bu kanal mesajı SÜRECİN DIŞINA çıkarıyor mu?
   * konsol/panel = false (stdout, kimseye ulaşmaz) · whatsapp = true.
   *
   * Demo telefon kilidi bu bayrağa göre davranır: dışarı çıkan bir kanalda
   * hedef numara doğrulanamıyorsa gönderim REDDEDİLİR (fail-closed);
   * çıkmayan kanalda yalnız uyarı basılır. Yeni bir kanal eklendiğinde bu
   * alanı doldurmak zorunludur — unutulamaz, tip zorlar.
   */
  readonly disaCikar: boolean
  gonder(mesaj: GidenMesaj): Promise<GonderimSonucu>
  /**
   * Ham gelen gövdeyi kanal-bağımsız `GelenYanit`'e çevirir.
   * Çözemezse `null` döner — TAHMİN ETMEZ. Bilinmeyen şekli zorla yorumlamak,
   * yanlış görevi kapatmaktan daha ucuz görünür ama değildir.
   */
  gelenCoz(hamGovde: unknown): GelenYanit | null
}
