import type { Lang } from './config'

// ── Çeviri sözlüğü ─────────────────────────────────────────────────
// Düz nokta-anahtarlar. Yeni bölüm eklerken hem `tr` hem `en` altına yaz.
// Anahtar bulunamazsa: en → tr → anahtarın kendisi (translate() aşağıda).

type Dict = Record<string, string>

export const messages: Record<Lang, Dict> = {
  tr: {
    // Genel
    'common.user': 'Kullanıcı',

    // Topbar — selamlama / arama / eylemler
    'topbar.greeting.morning': 'Günaydın',
    'topbar.greeting.afternoon': 'İyi günler',
    'topbar.greeting.evening': 'İyi akşamlar',
    'topbar.welcome': 'hoş geldin',
    'topbar.searchPlaceholder': 'Müşteri, portföy veya fırsat ara…',
    'topbar.notifications': 'Bildirimler',
    'topbar.profile': 'Profil',
    'search.placeholder': 'müşteri ara…',
    'search.noResults': 'Sonuç bulunamadı',
    'search.customerBadge': 'Müşteri',

    // Dil değiştirici
    'lang.toggleAria': 'Dili değiştir',
    'lang.tr': 'TR',
    'lang.en': 'EN',

    // Sidebar — marka altyazıları
    'sidebar.crmPanel': 'CRM Paneli',
    'sidebar.salesIntelPanel': 'Satış Zekâsı Paneli',

    // Sidebar — grup başlıkları
    'group.ali': 'ALİ',
    'group.eduCommunity': 'Eğitim & Topluluk',
    'group.gelisim': 'GELİŞİM',

    // Ana navigasyon
    'nav.dashboard': 'Ana Akış',
    'nav.ajanda': 'Ajanda',
    'nav.firsatlar': 'Satış Fırsatları',
    'nav.musteriler': 'Müşteriler',
    'nav.satisSureci': 'Satış Süreci',
    'nav.stok': 'Stok / Envanter',
    'nav.temsilciler': 'Temsilciler',
    'nav.yenilemeler': 'Yenilemeler',
    'nav.portfoy': 'Portföy',
    'nav.komisyon': 'Komisyon',
    'nav.operasyonMerkezi': 'Operasyon Merkezi',
    'nav.raporlar': 'Raporlar',
    'nav.aliOnerileri': 'Ali Önerileri',
    'nav.aliUyarilari': 'Ali Uyarıları',
    'nav.aliSohbet': 'Ali ile Sohbet',
    'nav.brokerYonetimi': 'Broker Yönetimi',
    'nav.egitimIpuclari': 'Eğitim & İpuçları',
    'nav.topluluk': 'Topluluk',

    // Emlak — segment anahtarı
    'segment.kurumsal': 'Kurumsal',
    'segment.bireysel': 'Bireysel',

    // Emlak — GELİŞİM / Satış Kütüphanesi navigasyonu
    'nav.satisKutuphanesi': 'Satış Kütüphanesi',
    'nav.aiKocum': 'AI Koçum',
    'nav.gunlukChallenge': 'Günlük Challenge',
    'nav.rolYap': 'Rol Yap (AI Simülasyon)',
    'nav.oyunKitabi': 'Oyun Kitabı',
    'nav.hikayeKutuphanesi': 'Hikâye Kütüphanesi',
    'nav.personaKutuphanesi': 'Persona Kütüphanesi',
    'nav.projeAkademisi': 'Proje Akademisi',
    'nav.itirazMerkezi': 'İtiraz Merkezi',
    'nav.whatsappKutuphanesi': 'WhatsApp Kütüphanesi',
    'nav.aliSatisZekasi': 'Ali Satış Zekâsı',
    'nav.kampanyaMotoru': 'Kampanya Motoru',

    // Rol etiketleri
    'role.admin': 'Admin',
    'role.yonetici': 'Yönetici',
    'role.satisTemsilcisi': 'Satış Temsilcisi',
    'role.operasyonTemsilcisi': 'Operasyon Tem.',

    // Mobil alt navigasyon
    'mnav.home': 'Ana Sayfa',
    'mnav.musteriler': 'Müşteriler',
    'mnav.ajanda': 'Ajanda',
    'mnav.ali': 'Ali',
    'mnav.raporlar': 'Raporlar',
  },

  en: {
    // General
    'common.user': 'User',

    // Topbar — greeting / search / actions
    'topbar.greeting.morning': 'Good morning',
    'topbar.greeting.afternoon': 'Good afternoon',
    'topbar.greeting.evening': 'Good evening',
    'topbar.welcome': 'welcome',
    'topbar.searchPlaceholder': 'Search customers, portfolio or opportunities…',
    'topbar.notifications': 'Notifications',
    'topbar.profile': 'Profile',
    'search.placeholder': 'search customers…',
    'search.noResults': 'No results found',
    'search.customerBadge': 'Customer',

    // Language switcher
    'lang.toggleAria': 'Change language',
    'lang.tr': 'TR',
    'lang.en': 'EN',

    // Sidebar — brand sub-labels
    'sidebar.crmPanel': 'CRM Panel',
    'sidebar.salesIntelPanel': 'Sales Intelligence Panel',

    // Sidebar — group headers
    'group.ali': 'ALI',
    'group.eduCommunity': 'Education & Community',
    'group.gelisim': 'GROWTH',

    // Main navigation
    'nav.dashboard': 'Home Feed',
    'nav.ajanda': 'Agenda',
    'nav.firsatlar': 'Sales Opportunities',
    'nav.musteriler': 'Customers',
    'nav.satisSureci': 'Sales Pipeline',
    'nav.stok': 'Stock / Inventory',
    'nav.temsilciler': 'Representatives',
    'nav.yenilemeler': 'Renewals',
    'nav.portfoy': 'Portfolio',
    'nav.komisyon': 'Commission',
    'nav.operasyonMerkezi': 'Operations Center',
    'nav.raporlar': 'Reports',
    'nav.aliOnerileri': 'Ali Suggestions',
    'nav.aliUyarilari': 'Ali Alerts',
    'nav.aliSohbet': 'Chat with Ali',
    'nav.brokerYonetimi': 'Broker Management',
    'nav.egitimIpuclari': 'Training & Tips',
    'nav.topluluk': 'Community',

    // Emlak — segment switch
    'segment.kurumsal': 'Corporate',
    'segment.bireysel': 'Individual',

    // Emlak — Growth / Sales Library navigation
    'nav.satisKutuphanesi': 'Sales Library',
    'nav.aiKocum': 'My AI Coach',
    'nav.gunlukChallenge': 'Daily Challenge',
    'nav.rolYap': 'Role Play (AI Simulation)',
    'nav.oyunKitabi': 'Playbook',
    'nav.hikayeKutuphanesi': 'Story Library',
    'nav.personaKutuphanesi': 'Persona Library',
    'nav.projeAkademisi': 'Project Academy',
    'nav.itirazMerkezi': 'Objection Center',
    'nav.whatsappKutuphanesi': 'WhatsApp Library',
    'nav.aliSatisZekasi': 'Ali Sales Intelligence',
    'nav.kampanyaMotoru': 'Campaign Engine',

    // Role labels
    'role.admin': 'Admin',
    'role.yonetici': 'Manager',
    'role.satisTemsilcisi': 'Sales Rep',
    'role.operasyonTemsilcisi': 'Ops Rep',

    // Mobile bottom navigation
    'mnav.home': 'Home',
    'mnav.musteriler': 'Customers',
    'mnav.ajanda': 'Agenda',
    'mnav.ali': 'Ali',
    'mnav.raporlar': 'Reports',
  },
}

export function translate(lang: Lang, key: string): string {
  return messages[lang]?.[key] ?? messages.tr[key] ?? key
}
