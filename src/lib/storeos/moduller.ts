// ════════════════════════════════════════════════════════════════════════════
//  Store OS — MODÜL HARİTASI (tek kaynak)
//
//  Neden var: menüde on beş madde duruyor, dördü çalışan ekran. Gün 4'te
//  konulan kural "var olmayan ekrana link koyma" idi ve on bir madde gri
//  bırakılmıştı. Gri madde dürüst ama jüriye "ürün %27 bitmiş" diye okunuyor —
//  oysa on birinin çoğu için olay sözleşmesi, kural motoru ve veri hattı
//  ZATEN çalışıyor; eksik olan yalnız ekran.
//
//  Çözüm: on bir madde artık tek bir özet ekranına (/storeos/moduller) bağlanır
//  ve orada her modülün NE OLDUĞU, BUGÜN HANGİ PARÇASININ HAZIR OLDUĞU ve
//  DURUMU yazılır. Yalan yok — durum tabloda açıkça duruyor; sadece menüde
//  değil, doğru yerde duruyor.
//
//  Bu dosya TEK KAYNAKTIR: menü de (`yan-menu.tsx`) özet ekranı da
//  (`/storeos/moduller`) buradan okur; slug kayması imkânsız.
// ════════════════════════════════════════════════════════════════════════════

export type ModulDurumu = 'canli' | 'ekran-demo' | 'hat-hazir' | 'sozlesme' | 'plan'

export interface Modul {
  /** URL çapası. `/storeos/moduller#<slug>` menüden buraya iner. */
  slug: string
  ad: string
  ikon: string
  bolum: 'Operasyon' | 'Yönetim'
  /** Modül ne yapar — jüri cümlesi, tek satır. */
  ozet: string
  /** BUGÜN gerçekten çalışan parça. Abartısız; doğrulanabilir olmalı. */
  hazir: string
  durum: ModulDurumu
  /**
   * Ekranın yolu. `canli` VE `ekran-demo` modüllerde dolu; kalanlarda boş
   * (menü onları `/storeos/moduller#<slug>` satırına indirir).
   */
  yol?: string
}

export const DURUM_ETIKETI: Record<ModulDurumu, string> = {
  canli: 'ekran canlı',
  'ekran-demo': 'ekran hazır · örnek veri',
  'hat-hazir': 'veri hattı hazır',
  sozlesme: 'sözleşme hazır',
  plan: 'kapsamda',
}

export const DURUM_ACIKLAMASI: Record<ModulDurumu, string> = {
  canli: 'Ekran yazıldı, gerçek zincirden (olay → kural → görev → denetim) canlı veri okuyor.',
  'ekran-demo': 'Ekran yazıldı ve gezilebilir, ama SALT OKUNUR ve örnek (seed) veriyle beslenir. Arkasındaki olay/kural hattı ayrı satırda anlatıldığı gibi çalışır; ekranın kendisi henüz o hatta bağlanmadı.',
  'hat-hazir': 'Olay tipi sözleşmede, kural motorunda aktif kuralı var ve panoda karşılığı görünüyor; kendi ekranı yazılmadı.',
  sozlesme: 'Olay tipi sözleşmede tanımlı ve alım hattından geçiyor; kuralı ve ekranı Faz 2.',
  plan: 'Kapsamda tanımlı, veri modeli hazır; olay/kural/ekran Faz 2.',
}

/**
 * On beş madde — menüdeki sıra ve gruplama birebir aynı.
 * `hazir` alanına yazılan her cümle koddan doğrulanabilir olmalıdır:
 * olay tipleri `olay-sozlesmesi.ts`, kurallar `depo/bellek.ts` demo kural
 * tablosundan, ekran alanları `dashboard/toplayici.ts`'ten gelir.
 */
export const MODULLER: Modul[] = [
  {
    slug: 'magaza-ozeti', ad: 'Mağaza Özeti', ikon: '◧', bolum: 'Operasyon',
    ozet: 'Sağlık skoru, beş KPI, kamera, kuyruk/raf/satış grafikleri ve Ali\'nin günlük brifingi tek ekranda.',
    hazir: 'Ekranın tamamı. Tek uç noktadan iki kademeli anket (canlı 4 sn · yavaş 30 sn).',
    durum: 'canli', yol: '/storeos',
  },
  {
    slug: 'canli-izleme', ad: 'Canlı İzleme', ikon: '◉', bolum: 'Operasyon',
    ozet: 'Kamera ızgarası, bölge bazlı anonim doluluk ve kamera sağlık durumu.',
    hazir: 'store.occupancy.updated · store.zone.person_count · store.camera.offline · store.camera.degraded olay tipleri sözleşmede; üçünün aktif kuralı var. Panoda kamera şeridi ve doluluk KPI\'ı bu hattan geliyor. Kendi ekranı (6 kamera ızgarası, sağlık listesi, olay akışı) yazıldı ve gezilebilir — ama örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/canli-izleme',
  },
  {
    slug: 'magaza-analizleri', ad: 'Mağaza Analizleri', ikon: '◔', bolum: 'Operasyon',
    ozet: 'Gün/hafta karşılaştırması, saat bazlı ziyaretçi–dönüşüm eğrisi, ısı haritası arşivi.',
    hazir: 'store.heatmap.snapshot sözleşmede; yoğunluk ızgarası ve zaman serileri panoda üretiliyor. Eksik olan geçmişe dönük saklama ve karşılaştırma ekranı. Kendi ekranı (bugün/dün ve bugün/geçen hafta eğrisi, dönüşüm hunisi, bölge kalış süresi, büyük ısı haritası) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/magaza-analizleri',
  },
  {
    slug: 'operasyon', ad: 'Operasyon', ikon: '◈', bolum: 'Operasyon',
    ozet: 'Vardiya planı, açılış/kapanış kontrol listeleri, mağazaya özel görev şablonları.',
    hazir: 'Görev modeli, SLA süresi, atama ve eskalasyon zinciri çalışıyor — şablon katmanı Faz 2. Kendi ekranı (günlük kontrol listesi, standart denetim skoru kırılımı, açık aksiyonlar) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/operasyon',
  },
  {
    slug: 'kasa-kuyruk', ad: 'Kasa & Kuyruk', ikon: '◫', bolum: 'Operasyon',
    ozet: 'Kasa başına bekleme süresi, eşik ayarı, kasa açma önerisi ve kuyruk geçmişi.',
    hazir: 'store.queue.length_changed ve store.queue.threshold_exceeded olayları alınıyor, üç aktif kural görev üretiyor; kuyruk serisi ve bekleme KPI\'ı panoda canlı. Kendi ekranı (kasa başına bekleme tablosu, eşik çizgili saatlik kuyruk grafiği, kasa açma önerisi) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/kasa-kuyruk',
  },
  {
    slug: 'raf-stok', ad: 'Raf & Stok', ikon: '▤', bolum: 'Operasyon',
    ozet: 'Raf doluluk oranı, eksik yüz sayısı, planogram uyumsuzlukları ve dolum görevleri.',
    hazir: 'store.shelf.stock_low ve store.planogram.non_compliant sözleşmede ve alım hattından geçiyor; raf doluluk kartı panoda. Kuralları bilerek yazılmadı — panoda "kural yok" rozetiyle görünüyorlar. Kendi ekranı (reyon bulunurluk tablosu, doluluk dağılımı, planogram uyum listesi) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/raf-stok',
  },
  {
    slug: 'gorevler', ad: 'Görevler', ikon: '◇', bolum: 'Operasyon',
    ozet: 'Kural eşleşmesinden doğan işler; filtre, SLA sayacı ve olay–görev–bildirim bağlantısı.',
    hazir: 'Ekranın tamamı (salt okunur): filtre, SLA sayacı ve olay–görev–bildirim bağı. Durum yazma yolu Gün 8.',
    durum: 'canli', yol: '/storeos/gorevler',
  },
  {
    slug: 'alarmlar', ad: 'Alarmlar', ikon: '△', bolum: 'Operasyon',
    ozet: 'Gelen olayların önem sırasına göre listesi, ham metadata ve kural gerekçesi.',
    hazir: 'Ekranın tamamı: filtre, derin bağlantı ve her alarmın ham metadata\'sı ile kural gerekçesi.',
    durum: 'canli', yol: '/storeos/alarmlar',
  },
  {
    slug: 'personel', ad: 'Personel', ikon: '▦', bolum: 'Yönetim',
    ozet: 'Kadro, vardiya, bölge ataması ve kişi başına görev yükü.',
    hazir: 'Kullanıcı/rol modeli ve rol bazlı yetki kontrolü çalışıyor; personel dağılımı panoda görünüyor. Vardiya takvimi Faz 2. Kendi ekranı (vardiya kadrosu, kişi başına görev yükü, bölge dağılımı, kadro önerisi) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/personel',
  },
  {
    slug: 'kampanyalar', ad: 'Kampanyalar', ikon: '◍', bolum: 'Yönetim',
    ozet: 'Mağaza içi kampanya takibi, teşhir uygunluğu ve kampanya sonrası satış etkisi.',
    hazir: 'Kapsamda; satış serisi altyapısı var. Olay tipi ve ekran Faz 2. Kendi ekranı (aktif kampanyalar, uygulama kontrol listesi, kampanya alanı trafiği, mağaza karşılaştırması) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/kampanyalar',
  },
  {
    slug: 'bakim-ariza', ad: 'Bakım & Arıza', ikon: '◐', bolum: 'Yönetim',
    ozet: 'Kamera ve cihaz arıza kayıtları, bakım talebi açma ve çözüm süresi takibi.',
    hazir: 'store.camera.offline ve store.camera.degraded olayları aktif kurallarla görev üretiyor — arıza akışı bugün de çalışıyor, ayrı ekranı yok. Kendi ekranı (varlık envanteri, SLA sayaçlı arıza kayıtları, önleyici bakım takvimi) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/bakim-ariza',
  },
  {
    slug: 'isg-guvenlik', ad: 'İSG & Güvenlik', ikon: '⬡', bolum: 'Yönetim',
    ozet: 'İş güvenliği ve güvenlik olayları, olay dosyası ve bildirim zinciri.',
    hazir: 'store.safety.event_detected ve store.security.event_detected sözleşmede; alım hattından geçiyor. Kural ve ekran Faz 2. Kendi ekranı (olay kayıtları, seviye dağılımı, anonim şemalı olay dosyası) yazıldı ve gezilebilir — örnek veriyle.',
    durum: 'ekran-demo', yol: '/storeos/isg-guvenlik',
  },
  {
    slug: 'denetim-kaydi', ad: 'Denetim Kaydı', ikon: '▣', bolum: 'Yönetim',
    ozet: 'Zincirin her adımının değiştirilemez kaydı — silme/güncelleme yolu yok.',
    hazir: 'Ekranın tamamı. Depo arayüzünde sil/güncelle metodu yok — kaydı silmek için önce sözleşmeyi değiştirmek gerekir.',
    durum: 'canli', yol: '/storeos/denetim',
  },
  {
    slug: 'raporlar', ad: 'Raporlar', ikon: '◑', bolum: 'Yönetim',
    ozet: 'Günlük/haftalık mağaza karnesi, bölge kırılımı, PDF ve e-posta dağıtımı.',
    hazir: 'Kapsamda; skor ve KPI hesapları hazır. Zamanlanmış üretim ve dağıtım Faz 2. Kendi ekranı (günlük karne önizlemesi, haftalık karşılaştırma, zamanlanmış rapor listesi) yazıldı ve gezilebilir — örnek veriyle; PDF/Excel/e-posta düğmeleri bilerek devre dışı.',
    durum: 'ekran-demo', yol: '/storeos/raporlar',
  },
  {
    slug: 'ayarlar', ad: 'Ayarlar', ikon: '⚙', bolum: 'Yönetim',
    ozet: 'Kural eşikleri, SLA süreleri, bildirim kanalı ve kullanıcı rolleri.',
    hazir: 'Eşikler ve SLA\'lar kural tablosundan, kanal seçimi ortam değişkeninden okunuyor; ikisi de canlı. Eksik olan yalnız yönetim ekranı. Kendi ekranı (rol tablosu, bildirim kuralları, entegrasyon durumu, kural eşikleri) yazıldı ve gezilebilir — salt okunur, hiçbir alan bu ekrandan değiştirilemez.',
    durum: 'ekran-demo', yol: '/storeos/ayarlar',
  },
]

/** Menüdeki bir maddenin gideceği yer: çalışan ekran ya da özet tablodaki satırı. */
export function modulYolu(m: Modul): string {
  return m.yol ?? `/storeos/moduller#${m.slug}`
}

export function durumSayimi(): Record<ModulDurumu, number> {
  const s: Record<ModulDurumu, number> = {
    canli: 0, 'ekran-demo': 0, 'hat-hazir': 0, sozlesme: 0, plan: 0,
  }
  for (const m of MODULLER) s[m.durum] += 1
  return s
}
