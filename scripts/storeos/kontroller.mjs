#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÜNLÜK KONTROL KOŞUSU (tek komut)
//
//    node scripts/storeos/kontroller.mjs
//
//  Sırayla: TypeScript · import kuralı · sözleşme doğrulama · imza ·
//  idempotency · durum makinesi · adapter. Herhangi biri düşerse çıkış kodu 1.
//
//  NEDEN package.json'a script eklenmedi: package.json onaylı istisna listesinde
//  değil. Bu dosya scripts/storeos/ içinde, izole ağacın içinde kalıyor.
//  Test framework KURULMADI — alt script'ler repodaki tsx+ok() konvansiyonunda.
// ════════════════════════════════════════════════════════════════════════════

import { spawnSync } from 'node:child_process'

const ADIMLAR = [
  ['TypeScript (storeos namespace)', 'npx', ['tsc', '-p', 'tsconfig.storeos.json']],
  ['Import kuralı',                  'node', ['scripts/storeos/import-denetci.mjs']],
  ['Sözleşme doğrulama (negatif)',   'npx', ['-y', 'tsx', 'src/lib/storeos/olay-sozlesmesi.test.ts']],
  ['İmza doğrulama',                 'npx', ['-y', 'tsx', 'src/lib/storeos/imza.test.ts']],
  ['Idempotency / alım zinciri',     'npx', ['-y', 'tsx', 'src/lib/storeos/olay-alim.test.ts']],
  ['Görev durum makinesi',           'npx', ['-y', 'tsx', 'src/lib/storeos/gorev.test.ts']],
  ['Adapter dönüşümü',               'npx', ['-y', 'tsx', 'src/lib/storeos/adapters/adapter.test.ts']],
]

const dusen = []

for (const [ad, komut, argv] of ADIMLAR) {
  console.log(`\n${'═'.repeat(70)}\n▸ ${ad}\n${'═'.repeat(70)}`)
  const r = spawnSync(komut, argv, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) dusen.push(ad)
}

console.log(`\n${'═'.repeat(70)}`)
if (dusen.length) {
  console.log(`✗ ${dusen.length}/${ADIMLAR.length} adım BAŞARISIZ: ${dusen.join(' · ')}\n`)
  process.exit(1)
}
console.log(`✓ ${ADIMLAR.length}/${ADIMLAR.length} kontrol adımı geçti\n`)
