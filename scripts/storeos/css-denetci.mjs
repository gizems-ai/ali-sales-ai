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
// ════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs'

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
