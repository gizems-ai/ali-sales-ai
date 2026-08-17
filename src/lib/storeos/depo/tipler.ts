// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEPO ARAYÜZLERİ
//
//  İş mantığı Airtable'ı ASLA doğrudan tanımaz. `kanal/` ile aynı desen:
//  arayüz burada, `bellek.ts` bugün çalışır, `airtable.ts` kimlik bilgileri
//  gelince devreye girer. Depo değiştirmek tek env değişkeni (STOREOS_DEPO).
//
//  Postgres'e geçişte değişecek tek şey bu arayüzün yeni bir uygulamasıdır.
// ════════════════════════════════════════════════════════════════════════════

import type {
  Bildirim, DenetimSatiri, Gorev, Kamera, Kullanici,
  Kural, Magaza, Metrik, OlayKaydi,
} from '../tipler'

// ─── Olaylar ─────────────────────────────────────────────────────────────────

export interface OlayDeposu {
  /** IDEMPOTENCY — bu id daha önce kabul edildi mi? */
  varMi(olayId: string): Promise<boolean>
  /**
   * Yazar. Aynı id ikinci kez gelirse yazmaz ve `false` döner.
   * Yarış durumunu tek noktada tutmak için varMi+yaz ayrı değil, ATOMİK
   * niyetli tek çağrıdır: dönüş `true` = ilk kez yazıldı.
   */
  yazIlkKez(kayit: OlayKaydi): Promise<boolean>
  getir(olayId: string): Promise<OlayKaydi | null>
  listele(filtre?: { magazaKodu?: string; limit?: number }): Promise<OlayKaydi[]>
  /** Kural sonucu işaretleme (Islendi / Eslesen Kural). */
  isaretle(olayId: string, alanlar: Partial<OlayKaydi>): Promise<void>
}

// ─── Kurallar ────────────────────────────────────────────────────────────────

export interface KuralDeposu {
  /** Yalnız Aktif=true kurallar, Sira'ya göre artan. */
  aktifKurallar(olayTipi?: string): Promise<Kural[]>
  hepsi(): Promise<Kural[]>
}

// ─── Görevler ────────────────────────────────────────────────────────────────

export interface GorevDeposu {
  olustur(gorev: Gorev): Promise<Gorev>
  getir(gorevNo: string): Promise<Gorev | null>
  guncelle(gorevNo: string, alanlar: Partial<Gorev>): Promise<Gorev>
  listele(filtre?: { magazaKodu?: string; durum?: string; limit?: number }): Promise<Gorev[]>
  /** 'G-000042' üretmek için sıradaki numara. */
  sonrakiNumara(): Promise<string>
  /** Aynı olaydan iki görev üretilmesini engeller (idempotency ikinci hat). */
  olayVeKuraldanVarMi(olayId: string, kuralAdi: string): Promise<boolean>
}

// ─── Bildirimler ─────────────────────────────────────────────────────────────

export interface BildirimDeposu {
  olustur(bildirim: Bildirim): Promise<Bildirim>
  /**
   * IDEMPOTENT YAZIM — `OlayDeposu.yazIlkKez` ile aynı gerekçe.
   * Bildirim ID deterministiktir (`b-<GorevNo>-<kademe>`), yani "bu görev için
   * bu bildirim gitti mi?" sorusu okuma yapmadan cevaplanabilir. Kural iki kez
   * tetiklenirse kullanıcı iki mesaj almaz.
   * Dönüş `ilkKez=false` ise `bildirim` MEVCUT kayıttır, yeni yazılan değil.
   */
  olusturIlkKez(bildirim: Bildirim): Promise<{ ilkKez: boolean; bildirim: Bildirim }>
  getir(bildirimId: string): Promise<Bildirim | null>
  /** 360Dialog inbound eşleşmesi — sağlayıcı mesaj id'sinden bul. */
  saglayiciMesajIdIle(mesajId: string): Promise<Bildirim | null>
  guncelle(bildirimId: string, alanlar: Partial<Bildirim>): Promise<Bildirim>
  listele(filtre?: { gorevNo?: string; limit?: number }): Promise<Bildirim[]>
}

// ─── Denetim — APPEND ONLY ───────────────────────────────────────────────────

/**
 * DİKKAT: Bu arayüzde güncelleme/silme metodu YOKTUR ve EKLENMEYECEKTİR.
 * Kabul kriteri 5: "kayıtlar silinemez". Airtable şema seviyesinde bunu
 * zorlayamıyor; garanti kodun bu arayüzü aşamamasıdır.
 */
export interface DenetimDeposu {
  yaz(satir: DenetimSatiri): Promise<void>
  listele(filtre?: { entityId?: string; limit?: number }): Promise<DenetimSatiri[]>
}

// ─── Referans veri ───────────────────────────────────────────────────────────

export interface ReferansDeposu {
  magaza(kod: string): Promise<Magaza | null>
  magazalar(): Promise<Magaza[]>
  kameralar(magazaKodu?: string): Promise<Kamera[]>
  kullanicilar(magazaKodu?: string): Promise<Kullanici[]>
  /** Bir role atanacak ilk aktif kullanıcı — görev ataması bunu kullanır. */
  rolIcinKullanici(magazaKodu: string, rol: string): Promise<Kullanici | null>
  metrikler(magazaKodu?: string): Promise<Metrik[]>
}

// ─── Bileşik ─────────────────────────────────────────────────────────────────

export interface Depo {
  readonly ad: 'bellek' | 'airtable'
  olaylar: OlayDeposu
  kurallar: KuralDeposu
  gorevler: GorevDeposu
  bildirimler: BildirimDeposu
  denetim: DenetimDeposu
  referans: ReferansDeposu
  /** Demo kontrol paneli "başa dön" düğmesi. Airtable uygulamasında yalnız
   *  Veri Tipi='demo' kayıtlarına dokunur. */
  sifirla(): Promise<void>
}
