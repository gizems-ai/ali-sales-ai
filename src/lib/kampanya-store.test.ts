// ════════════════════════════════════════════════════════════════════════════
//  kampanya-store birim testi (§9) — `npm run test:store` (npx tsx).
//  Store logic + kampanya→gerçek stok bağı + yayınla/kaldır + Broker OS okuma.
// ════════════════════════════════════════════════════════════════════════════
import {
  getKampanyalar, getBrokerKampanyalari, getBrokerStoklari, kampanyaStoklari,
  getKampanya, kampanyaUpsert, yayinla, yayindanKaldir, engineKaydiKur, engineCardId,
  getStokListesi, PROJE_ILCE,
} from './kampanya-store'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const tumStok = getStokListesi()

console.log('\n[1] Seed + Broker OS okuma (§5, §7)')
ok('Store 2 seed kampanya', getKampanyalar().length === 2)
ok('getBrokerKampanyalari 2 (broker+both, yayında)', getBrokerKampanyalari().length === 2)
ok('Hepsi brokerYayin=true', getBrokerKampanyalari().every(k => k.brokerYayin))

console.log('\n[2] Kampanya → GERÇEK stok bağı (§4)')
const k1 = getKampanya('seed-2gun-komisyon')!
const s1 = kampanyaStoklari(k1)
ok('2 Günde Komisyon → Lagoon C+D daireleri', s1.length > 0 && s1.every(u => u.proje === 'Lagoon' && (u.grup === 'C' || u.grup === 'D')))
ok('Hedef stoklar satılabilir', s1.every(u => u.satilabilir))
ok('Hedef stoklar gerçek 507 içinde', s1.every(u => tumStok.some(x => x.id === u.id)))

const brokerStok = getBrokerStoklari()
ok('getBrokerStoklari boş değil + 507 alt-kümesi', brokerStok.length > 0 && brokerStok.length <= 507)
ok('getBrokerStoklari gerçek dairelere bağlı', brokerStok.every(u => tumStok.some(x => x.id === u.id)))

console.log('\n[3] Yayınla / kaldır — brokerYayin değişiyor (§6, §9.2)')
const girdi = { proje: 'Lagoon' as const, grup: 'C' as const, segment: 'yurtdisi_broker' as const,
  baslik: 'Test Broker Kampanyası', kaldirac: ['komisyon' as const], teklifOzeti: 'test', mesaj: 'test' }
const id = engineCardId('Lagoon', 'C', 'yurtdisi_broker')
kampanyaUpsert(engineKaydiKur(girdi))
ok('Yeni kayıt eklendi (brokerYayin=false)', getKampanya(id)?.brokerYayin === false)
ok('Yayınlanmamışken Broker OS görmez', !getBrokerKampanyalari().some(k => k.id === id))

yayinla(id, '2026-07-04T10:00:00.000Z')
ok('yayinla → brokerYayin=true', getKampanya(id)?.brokerYayin === true)
ok('yayinla → status=published', getKampanya(id)?.status === 'published')
ok('Yayınlanınca Broker OS görür', getBrokerKampanyalari().some(k => k.id === id))

yayindanKaldir(id)
ok('kaldir → brokerYayin=false', getKampanya(id)?.brokerYayin === false)
ok('Kaldırınca Broker OS görmez', !getBrokerKampanyalari().some(k => k.id === id))

console.log('\n[4] Proje → İlçe tek map (§8)')
ok('Central=Beylikdüzü', PROJE_ILCE.Central === 'Beylikdüzü')
ok('Lagoon=5. Levent', PROJE_ILCE.Lagoon === '5. Levent')
ok('Port Royal=Sefaköy', PROJE_ILCE['Port Royal'] === 'Sefaköy')
ok('Premium=Esenyurt', PROJE_ILCE.Premium === 'Esenyurt')

console.log(`\n${fail === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${fail} TEST BAŞARISIZ`}`)
if (fail > 0) process.exit(1)
