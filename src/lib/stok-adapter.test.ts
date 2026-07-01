// ════════════════════════════════════════════════════════════════════════════
//  stok-adapter birim testi (§9.2) — runner gerektirmez: `npm run test:adapter`
//  (npx tsx). Referans JSON (_grup/_defects/_emsal) bu ortamda yoktu; beklenen
//  değerler §4 kurallarından türetilip GERÇEK 507 daire dağılımıyla doğrulandı.
// ════════════════════════════════════════════════════════════════════════════
import { adaptStok, katParse, type AdaptedUnit } from './stok-adapter'
import { BABACAN_STOK } from '../data/babacan-stok'

let fail = 0
function eq(ad: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp)
  const ok = g === e
  if (!ok) fail++
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${ad}${ok ? '' : `  →  got=${g} exp=${e}`}`)
}

const adapted = adaptStok(BABACAN_STOK)
const by = (id: string) => adapted.find(u => u.id === id) as AdaptedUnit

console.log('\n[1] Kat parse')
eq('"14.Kat" → 14', katParse('14.Kat'), 14)
eq('"15.KAT" → 15', katParse('15.KAT'), 15)
eq('"ZEMİN KAT" → -1', katParse('ZEMİN KAT'), -1)
eq('"2.BODRUM KAT" → -1', katParse('2.BODRUM KAT'), -1)
eq('20 (number) → 20', katParse(20), 20)

console.log('\n[2] 4 kritik daire (§9.2)')
const a2 = by('A-2')        // 3.BODRUM KAT + ≥180 m² → D
eq('A-2 grup D', a2.grup, 'D')
eq('A-2 defects [zemin,buyuk_m2]', a2.defects, ['zemin', 'buyuk_m2'])
eq('A-2 emsal altinda', a2.emsal, 'altinda')

const a93 = by('A-93')      // ≥180 m² → D
eq('A-93 grup D', a93.grup, 'D')
eq('A-93 defects [buyuk_m2]', a93.defects, ['buyuk_m2'])

const b235 = by('B-235')    // küçük tip, kat≥1, defektsiz → A
eq('B-235 grup A', b235.grup, 'A')
eq('B-235 defects []', b235.defects, [])

const a108 = by('A-108')    // 3+1 aile, 90≤m²<180 → B
eq('A-108 grup B', a108.grup, 'B')
eq('A-108 defects []', a108.defects, [])

console.log('\n[3] Toplam dağılım (beklenen: A26·B188·C181·D112)')
const cnt = (f: (u: AdaptedUnit) => boolean) => adapted.filter(f).length
eq('grup A = 26', cnt(u => u.grup === 'A'), 26)
eq('grup B = 188', cnt(u => u.grup === 'B'), 188)
eq('grup C = 181', cnt(u => u.grup === 'C'), 181)
eq('grup D = 112', cnt(u => u.grup === 'D'), 112)
eq('defect zemin = 93', cnt(u => u.defects.includes('zemin')), 93)
eq('defect buyuk_m2 = 28', cnt(u => u.defects.includes('buyuk_m2')), 28)
eq('defect pahali = 5', cnt(u => u.defects.includes('pahali')), 5)
eq('defect kuzey = 0 (üretilemez)', cnt(u => u.defects.includes('kuzey')), 0)
eq('emsal altinda = 179', cnt(u => u.emsal === 'altinda'), 179)
eq('emsal emsalde = 190', cnt(u => u.emsal === 'emsalde'), 190)
eq('emsal ustunde = 138', cnt(u => u.emsal === 'ustunde'), 138)
eq('toplam = 507', adapted.length, 507)
eq('stokYasiGun null (Faz 2)', adapted.every(u => u.stokYasiGun === null), true)

console.log(`\n${fail === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${fail} TEST BAŞARISIZ`}`)
if (fail > 0) process.exit(1)
