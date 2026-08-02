// ════════════════════════════════════════════════════════════════════════════
//  Store OS — imza doğrulama kontrolü.  `npx -y tsx src/lib/storeos/imza.test.ts`
//  Kabul kriteri: imzasız/yanlış imzalı istek reddedilir, replay penceresi çalışır.
//  (Repo konvansiyonu: test framework yok, ok() + process.exit(1).)
// ════════════════════════════════════════════════════════════════════════════

import { createHmac } from 'node:crypto'
import { imzaUret, imzaDogrula, VARSAYILAN_TOLERANS_SN } from './imza'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const SIR = 'test-sirri-123'
const GOVDE = JSON.stringify({ id: 'evt_1', storeCode: '0178' })
const SIMDI = 1_800_000_000

console.log('\n[1] ZAMAN DAMGALI BİÇİM (t=<unix>,v1=<hex>) — tercih edilen')
const zd = imzaUret(GOVDE, SIR, SIMDI)
ok('üretilen imza t=,v1= biçiminde', /^t=\d+,v1=[0-9a-f]{64}$/.test(zd), zd)
ok('doğru sır + zamanında → geçerli',
   imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('biçim "zaman-damgali" olarak raporlanır',
   imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: SIMDI }).bicim === 'zaman-damgali')

console.log('\n[2] REDDEDİLEN DURUMLAR')
ok('yanlış sır → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: 'baska-sir', simdiSn: SIMDI }).gecerli)
ok('gövde tek karakter değişse → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE + ' ', baslik: zd, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('başlık eksik → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: null, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('başlık boş string → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: '   ', sir: SIR, simdiSn: SIMDI }).gecerli)
ok('sunucuda sır yok → reddedilir (yapılandırma hatası)',
   !imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: '', simdiSn: SIMDI }).gecerli)
ok('tanınmayan biçim (kısa hex) → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: 'abc123', sir: SIR, simdiSn: SIMDI }).gecerli)
ok('her ret bir sebep metni taşır',
   !!imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: 'baska-sir', simdiSn: SIMDI }).sebep)

console.log('\n[3] REPLAY PENCERESİ')
const disarida = SIMDI + VARSAYILAN_TOLERANS_SN + 1
ok(`tolerans (${VARSAYILAN_TOLERANS_SN} sn) dışında → reddedilir`,
   !imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: disarida }).gecerli)
ok('tolerans sınırında → hâlâ geçerli',
   imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: SIMDI + VARSAYILAN_TOLERANS_SN }).gecerli)
ok('geçmişe doğru da simetrik reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: SIMDI - VARSAYILAN_TOLERANS_SN - 1 }).gecerli)
ok('tolerans parametresi geçersiz kılınabilir',
   imzaDogrula({ hamGovde: GOVDE, baslik: zd, sir: SIR, simdiSn: disarida, toleransSn: 9999 }).gecerli)
ok('zaman damgası imzaya dahil — t değiştirilirse imza tutmaz',
   !imzaDogrula({ hamGovde: GOVDE, baslik: zd.replace(/^t=\d+/, `t=${SIMDI + 1}`), sir: SIR, simdiSn: SIMDI }).gecerli)

console.log('\n[4] DÜZ HEX BİÇİMİ KALDIRILDI — replay bypass kapandı (Gün 3)')
// Gün 2'de kabul edilen biçim. Bir saldırgan `t=` kısmını atıp buraya düşerek
// replay penceresini kalıcı bypass edebiliyordu. Artık düşemez.
const duzHex = createHmac('sha256', SIR).update(GOVDE, 'utf8').digest('hex')
ok('düz 64-hex REDDEDİLİR',
   !imzaDogrula({ hamGovde: GOVDE, baslik: duzHex, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('sha256= önekli hex REDDEDİLİR',
   !imzaDogrula({ hamGovde: GOVDE, baslik: `sha256=${duzHex}`, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('ret sebebi doğru biçimi söyler',
   (imzaDogrula({ hamGovde: GOVDE, baslik: duzHex, sir: SIR, simdiSn: SIMDI }).sebep ?? '')
     .includes('t=<unix_saniye>,v1=<hex>'))
ok('imzaUret zaman damgası verilmese de HER ZAMAN t=,v1= üretir',
   /^t=\d+,v1=[0-9a-f]{64}$/.test(imzaUret(GOVDE, SIR)))
ok('v1 hex değilse reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: `t=${SIMDI},v1=merhaba`, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('v1 BÜYÜK harf hex kabul edilir (hex büyük/küçük fark etmez)',
   imzaDogrula({ hamGovde: GOVDE, baslik: zd.toUpperCase().replace('T=', 't=').replace('V1=', 'v1='),
                 sir: SIR, simdiSn: SIMDI }).gecerli)
ok('t eksik → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: `v1=${duzHex}`, sir: SIR, simdiSn: SIMDI }).gecerli)
ok('v1 eksik → reddedilir',
   !imzaDogrula({ hamGovde: GOVDE, baslik: `t=${SIMDI}`, sir: SIR, simdiSn: SIMDI }).gecerli)

if (fail) { console.log(`\n✗ ${fail} kontrol BAŞARISIZ\n`); process.exit(1) }
console.log('\n✓ tüm imza kontrolleri geçti\n')
