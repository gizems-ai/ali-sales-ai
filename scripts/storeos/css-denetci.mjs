#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Store OS — CSS KAPSAM DENETÇİSİ
//
//    node scripts/storeos/css-denetci.mjs
//
//  `src/app/globals.css` madde 1'de onaylanan istisnadır: Store OS yalnız
//  `.storeos-root` KAPSAMLI bir blok ekleyebilir. Bu script o sözü kodla
//  bağlar — bloktaki her seçici `.storeos-root` ile başlamalı, aksi halde
//  mevcut panel (emlak/sigorta) stillerini etkileme riski doğar.
//
//  Ayrıca marker'dan ÖNCEKİ bölümde `.storeos-` geçmediğini doğrular:
//  Store OS stilinin dosyanın gövdesine sızmadığının kanıtı.
//
//  ── 17 Ağu 2026: DENETÇİ AÇIĞI KAPATILDI ──────────────────────────────────
//  Bu script yalnız globals.css'e bakıyordu. Tema brief'ten sapınca ortaya
//  çıktı ki asıl risk başka yerde: renk bir bileşene ya da tema.ts'e gömülürse
//  paleti tek dosyadan değiştirmek imkânsızlaşır ve denetçi bunu GÖRMEZ.
//  Artık 2. ve 3. denetimler var:
//    2) Store OS'in TSX/TS dosyalarında gömülü renk aranır (beyaz liste hariç).
//    3) tema.ts'teki MARKA_RGB ile globals.css'teki --so-marka aynı mı?
// ════════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DOSYA = 'src/app/globals.css'
const MARKER = 'Store OS teması'

const metin = readFileSync(DOSYA, 'utf8')
const yer = metin.indexOf(MARKER)

if (yer === -1) {
  console.error(`✗ ${DOSYA} içinde Store OS bloğu bulunamadı ("${MARKER}").`)
  process.exit(1)
}

const oncesi = metin.slice(0, yer)
const blok = metin.slice(yer)
const hatalar = []

if (oncesi.includes('storeos')) {
  hatalar.push('Store OS bloğundan ÖNCE `storeos` geçiyor — stil dosyanın gövdesine sızmış.')
}

// Yorumları at, sonra seçici satırlarını topla.
const temiz = blok.replace(/\/\*[\s\S]*?\*\//g, '')

let satirNo = 0
for (const ham of temiz.split('\n')) {
  satirNo++
  const satir = ham.trim()
  if (!satir || satir.startsWith('}')) continue
  // @media / @keyframes gibi at-rule'lar ve keyframe adımları (from/to/%) muaf.
  if (satir.startsWith('@')) continue
  if (/^(from|to|\d+%)\b/.test(satir)) continue

  const m = satir.match(/^([^{}]+)\{/)
  if (!m) continue

  for (const secici of m[1].split(',')) {
    const s = secici.trim()
    if (!s) continue
    if (!s.startsWith('.storeos-root')) {
      hatalar.push(`kapsamsız seçici: "${s}"  (blok satır ~${satirNo})`)
    }
  }
}

if (hatalar.length) {
  console.error(`✗ ${DOSYA} — ${hatalar.length} ihlal:\n`)
  for (const h of hatalar) console.error('   ' + h)
  console.error('\nKural: Store OS bloğundaki HER seçici `.storeos-root` ile başlar.\n')
  process.exit(1)
}

console.log(`✓ ${DOSYA} — Store OS bloğundaki tüm seçiciler .storeos-root kapsamında`)

// ════════════════════════════════════════════════════════════════════════════
//  2) GÖMÜLÜ RENK DENETİMİ — kod tarafı
// ════════════════════════════════════════════════════════════════════════════

const KOD_KLASORLERI = [
  'src/components/storeos',
  'src/app/storeos',
  'src/lib/storeos',
]

/**
 * Beyaz liste — gerekçesiz af yok, her satırın nedeni burada yazılı.
 *
 * `giris/page.tsx`: bu sayfa host guard'dan ÖNCE, `.storeos-root` sarmalayıcısı
 *   OLMADAN render olur (oturumsuz kullanıcı görebilsin diye). --so-* değişkenleri
 *   orada tanımlı değildir, dolayısıyla renkler satır içi yazılmak zorunda.
 * `tema.ts`: ısı haritası hücresinin opaklığı hücre başına hesaplanır; CSS
 *   değişkeni ile yapılamaz. Tek bir sabit (MARKA_RGB) var ve 3. denetim onu
 *   globals.css'teki --so-marka ile karşılaştırıyor.
 */
const BEYAZ_LISTE = new Map([
  ['src/app/storeos/giris/page.tsx', '.storeos-root dışında render olur, değişken yok'],
  ['src/lib/storeos/tema.ts', 'ısı haritası opaklığı — MARKA_RGB, 3. denetimle bağlı'],
])

// #abc / #aabbcc / rgb( / rgba( / hsl( — yorum satırları hariç tutulur.
const RENK = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\()/

function dosyalar(kok) {
  const cikti = []
  let girdiler
  try { girdiler = readdirSync(kok) } catch { return cikti }
  for (const ad of girdiler) {
    const yol = join(kok, ad)
    if (statSync(yol).isDirectory()) { cikti.push(...dosyalar(yol)); continue }
    if (/\.(tsx?|jsx?)$/.test(ad)) cikti.push(yol)
  }
  return cikti
}

const renkIhlalleri = []
let taranan = 0

for (const kok of KOD_KLASORLERI) {
  for (const yol of dosyalar(kok)) {
    if (BEYAZ_LISTE.has(yol)) continue
    taranan++
    const satirlar = readFileSync(yol, 'utf8').split('\n')
    let yorumIcinde = false
    satirlar.forEach((ham, i) => {
      const satir = ham.trim()
      if (yorumIcinde) { if (satir.includes('*/')) yorumIcinde = false; return }
      if (satir.startsWith('/*')) { if (!satir.includes('*/')) yorumIcinde = true; return }
      if (satir.startsWith('//') || satir.startsWith('*')) return
      const m = satir.match(RENK)
      if (m) renkIhlalleri.push(`${yol}:${i + 1}  →  ${m[1]}   ${satir.slice(0, 70)}`)
    })
  }
}

if (renkIhlalleri.length) {
  console.error(`\n✗ Gömülü renk — ${renkIhlalleri.length} ihlal:\n`)
  for (const h of renkIhlalleri) console.error('   ' + h)
  console.error(
    '\nKural: renkler `.storeos-root` bloğundaki --so-* değişkenlerinde yaşar.\n' +
    'Bileşen `var(--so-...)` veya `so-*` sınıfı kullanır. Gerçek bir istisna\n' +
    'varsa BEYAZ_LISTE\'ye GEREKÇESİYLE eklenir.\n')
  process.exit(1)
}

console.log(`✓ gömülü renk yok — ${taranan} dosya tarandı (${BEYAZ_LISTE.size} gerekçeli istisna)`)

// ════════════════════════════════════════════════════════════════════════════
//  3) MARKA_RGB ↔ --so-marka tutarlılığı
// ════════════════════════════════════════════════════════════════════════════

const temaMetni = readFileSync('src/lib/storeos/tema.ts', 'utf8')
const mRgb = temaMetni.match(/MARKA_RGB\s*=\s*'([^']+)'/)
const mMarka = blok.match(/--so-marka:\s*#([0-9a-fA-F]{6})/)

if (!mRgb || !mMarka) {
  console.error('✗ MARKA_RGB veya --so-marka okunamadı — denetim yapılamıyor.')
  process.exit(1)
}

const bek = mMarka[1].match(/../g).map(h => parseInt(h, 16)).join(', ')
const bulunan = mRgb[1].split(',').map(s => s.trim()).join(', ')

if (bek !== bulunan) {
  console.error(
    `✗ tema.ts MARKA_RGB (${bulunan}) ile globals.css --so-marka (#${mMarka[1]} = ${bek}) uyuşmuyor.\n` +
    '  Isı haritası marka renginden sapmış demektir; ikisini eşitle.\n')
  process.exit(1)
}

console.log(`✓ MARKA_RGB (${bulunan}) = --so-marka (#${mMarka[1]})`)
