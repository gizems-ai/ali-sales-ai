// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet retrieval spot-check — `npm run test:ali-chat` (npx tsx).
//  Kabul kriteri: 5 demo sorusunda paketteki HER rakam kaynak veride bulunur +
//  kapsam dışı soruda "bulundu=false" davranışı + niyet sınıflandırma doğruluğu.
// ════════════════════════════════════════════════════════════════════════════
import { retrieve } from './retrieval'
import { DEMO_SORULAR } from './demo'
import { getStokListesi, getKampanyalar } from '../kampanya-store'
import { CUSTOMERS } from '../ali-zeka'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const stok = getStokListesi()
const stokIds = new Set(stok.map(u => u.id))

console.log('\n[1] Niyet sınıflandırma — 5 demo sorusu')
const beklenen = ['stok', 'stok', 'kampanya', 'musteri', 'eslestirme']
DEMO_SORULAR.forEach((s, i) => {
  const p = retrieve(s)
  ok(`"${s.slice(0, 34)}…" → ${beklenen[i]}`, p.intent === beklenen[i], `geldi: ${p.intent}`)
})

console.log('\n[2] Stok paketi — Lagoon 2+1 satılabilir')
const p1 = retrieve(DEMO_SORULAR[0])
const lagoon21 = stok.filter(u => u.satilabilir && u.proje === 'Lagoon' && u.tip === '2+1')
ok('toplamEslesen kaynakla birebir', p1.stok!.toplamEslesen === lagoon21.length, `paket ${p1.stok!.toplamEslesen} vs kaynak ${lagoon21.length}`)
ok('gösterilen ≤ toplam', p1.stok!.gosterilen <= p1.stok!.toplamEslesen)
ok('her örnek birim gerçek 507 içinde', p1.stok!.birimler.every(b => stokIds.has(b.id)))
ok('her örnek fiyat kaynakla eşit', p1.stok!.birimler.every(b => stok.find(u => u.id === b.id)!.fiyatUSD === b.fiyatUSD))
ok('hepsi Lagoon + 2+1 + satılabilir', p1.stok!.birimler.every(b => b.proje === 'Lagoon' && b.tip === '2+1'))

console.log('\n[3] Stok paketi — Central D grubu')
const p2 = retrieve(DEMO_SORULAR[1])
const centralD = stok.filter(u => u.satilabilir && u.proje === 'Central' && u.grup === 'D')
ok('toplamEslesen kaynakla birebir', p2.stok!.toplamEslesen === centralD.length, `paket ${p2.stok!.toplamEslesen} vs kaynak ${centralD.length}`)
ok('hepsi D grubu', p2.stok!.birimler.every(b => b.grup === 'D'))

console.log('\n[4] Kampanya paketi — yayında olanlar')
const p3 = retrieve(DEMO_SORULAR[2])
const yayinda = getKampanyalar().filter(k => k.brokerYayin && k.status === 'published')
ok('yayindaSayisi kaynakla birebir', p3.kampanya!.yayindaSayisi === yayinda.length)
ok('bağlı birim sayıları > 0', p3.kampanya!.kampanyalar.every(k => k.bagliBirimSayisi > 0))
ok('örnek birim idleri gerçek 507 içinde', p3.kampanya!.kampanyalar.every(k => k.ornekBirimIds.every(id => stokIds.has(id))))

console.log('\n[5] Müşteri paketi — tüm liste (fixture)')
const p4 = retrieve(DEMO_SORULAR[3])
ok('toplam = 12 fixture müşteri', p4.musteri!.toplam === CUSTOMERS.length)
ok('kaynak ornek_fixture olarak işaretli', p4.musteri!.kaynak === 'ornek_fixture')

console.log('\n[6] Eşleştirme paketi — Karim (fixture motor)')
const p5 = retrieve(DEMO_SORULAR[4])
ok('müşteri Karim çözüldü', p5.eslestirme!.musteri.ad.includes('Karim'))
ok('eşleşmeler var + ham skor SIZMIYOR (etiket)', p5.eslestirme!.eslesmeler.length > 0 && p5.eslestirme!.eslesmeler.every(e => typeof e.skorEtiketi === 'string' && !/\d{2}/.test(e.skorEtiketi)))
ok('örnek veri notu var', p5.notlar.some(n => n.includes('örnek stok')))

console.log('\n[7] Kapsam dışı — tahmin yok')
const kd = retrieve('Bugün hava nasıl olacak?')
ok('intent kapsam_disi', kd.intent === 'kapsam_disi')
ok('bulundu=false', kd.bulundu === false)
ok('hiçbir veri paketi yok', !kd.stok && !kd.kampanya && !kd.musteri && !kd.eslestirme)

console.log('\n[8] İndirim/stok yaşı sızıntı kontrolü')
const yas = retrieve('Central\'da 200 günü geçmiş daireler')
ok('stok yaşı sorusunda dürüst not', yas.notlar.some(n => n.toLowerCase().includes('yaş')))

console.log(fail === 0 ? '\n✅ TÜM SPOT-CHECK GEÇTİ\n' : `\n❌ ${fail} KONTROL BAŞARISIZ\n`)
process.exit(fail === 0 ? 0 : 1)
