// ════════════════════════════════════════════════════════════════════════════
//  stok-sinyal birim testi (§8.2/8.3/8.4) — `npm run test:sinyal` (npx tsx).
//  Determinizm + çelişki-yok invariant + Portföy Sağlığı dağılım hedefi.
//  Referans JSON (babacan_stok_507_sinyalli.json) bu ortamda TCC nedeniyle
//  okunamadı; beklenen değerler §4/§5 kurallarından türetilip GERÇEK 507 daire
//  üzerinde doğrulandı (adapter testiyle aynı repo konvansiyonu).
// ════════════════════════════════════════════════════════════════════════════
import { adaptStok } from './stok-adapter'
import { tureSinyal, seed, pick } from './stok-sinyal'
import { BABACAN_STOK } from '../data/babacan-stok'

let fail = 0
function eq(ad: string, got: unknown, exp: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(exp)
  const ok = g === e
  if (!ok) fail++
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${ad}${ok ? '' : `  →  got=${g} exp=${e}`}`)
}

const adapted = adaptStok(BABACAN_STOK)
const sinyaller = adapted.map(u => ({ u, s: tureSinyal({ id: u.id, grup: u.grup, emsal: u.emsal, durum: u.durum }) }))

console.log('\n[1] Determinizm (aynı girdi → aynı çıktı; Math.random yok)')
eq('seed sabit', seed('A-93'), seed('A-93'))
eq('pick sabit', pick('A-93', 5, 38, 'x'), pick('A-93', 5, 38, 'x'))
const s1 = tureSinyal({ id: 'C-204', grup: 'C', emsal: 'emsalde', durum: 'BOŞ' })
const s2 = tureSinyal({ id: 'C-204', grup: 'C', emsal: 'emsalde', durum: 'BOŞ' })
eq('tureSinyal iki çağrı eşit', s1, s2)
eq('pick aralık içinde', pick('X-1', 5, 38, 'x') >= 5 && pick('X-1', 5, 38, 'x') <= 38, true)

console.log('\n[2] Çelişki yok (§4 invariant) — A hiç Yavaş değil, D hiç Hızlı değil')
const aYavas = sinyaller.filter(x => x.u.grup === 'A' && x.s.isi === 'Yavaş/Risk').length
const dHizli = sinyaller.filter(x => x.u.grup === 'D' && x.s.isi === 'Hızlı').length
eq('A grubu Yavaş = 0', aYavas, 0)
eq('D grubu Hızlı = 0', dHizli, 0)
eq('riskli yalnız D', sinyaller.every(x => !x.s.riskli || x.u.grup === 'D'), true)

console.log('\n[3] Portföy Sağlığı dağılımı (§5 hedef: Hızlı 64 · Orta 254 · Yavaş 189 · Riskli 90)')
const isi = (t: string) => sinyaller.filter(x => x.s.isi === t).length
console.log(`     [ölçüm] Hızlı=${isi('Hızlı')} · Orta=${isi('Ortalama')} · Yavaş=${isi('Yavaş/Risk')} · Riskli=${sinyaller.filter(x => x.s.riskli).length}`)
eq('Hızlı = 64', isi('Hızlı'), 64)
eq('Ortalama = 254', isi('Ortalama'), 254)
eq('Yavaş/Risk = 189', isi('Yavaş/Risk'), 189)
eq('Riskli = 90', sinyaller.filter(x => x.s.riskli).length, 90)
eq('Müsait = 507', sinyaller.filter(x => x.s.uiDurum === 'Müsait').length, 507)
eq('toplam ısı = 507', isi('Hızlı') + isi('Ortalama') + isi('Yavaş/Risk'), 507)

console.log(`\n${fail === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${fail} TEST BAŞARISIZ`}`)
if (fail > 0) process.exit(1)
