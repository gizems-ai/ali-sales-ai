#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÜNLÜK KONTROL KOŞUSU (tek komut)
//
//    node scripts/storeos/kontroller.mjs
//
//  Sırayla: TypeScript · import kuralı · CSS kapsamı · sözleşme doğrulama · imza ·
//  idempotency · durum makinesi · adapter · pano · liste · demo telefon kilidi ·
//  zincir birimleri · zincir uçtan uca. Herhangi biri düşerse çıkış kodu 1.
//
//  SON ADIM UÇTAN UCA KOŞAR: olay → kural → görev → bildirim → kanal → buton
//  yanıtı → durum değişimi → denetim → panel. Yani bu komut yeşilse zincirin
//  tamamı yeşildir; ayrıca elle bakmak gerekmez.
//
//  NEDEN package.json'a script eklenmedi: package.json onaylı istisna listesinde
//  değil. Bu dosya scripts/storeos/ içinde, izole ağacın içinde kalıyor.
//  Test framework KURULMADI — alt script'ler repodaki tsx+ok() konvansiyonunda.
// ════════════════════════════════════════════════════════════════════════════

import { spawnSync } from 'node:child_process'

const ADIMLAR = [
  ['TypeScript (storeos namespace)', 'npx', ['tsc', '-p', 'tsconfig.storeos.json']],
  ['Import kuralı',                  'node', ['scripts/storeos/import-denetci.mjs']],
  ['CSS kapsam kuralı',              'node', ['scripts/storeos/css-denetci.mjs']],
  ['Sözleşme doğrulama (negatif)',   'npx', ['-y', 'tsx', 'src/lib/storeos/olay-sozlesmesi.test.ts']],
  ['İmza doğrulama',                 'npx', ['-y', 'tsx', 'src/lib/storeos/imza.test.ts']],
  ['Idempotency / alım zinciri',     'npx', ['-y', 'tsx', 'src/lib/storeos/olay-alim.test.ts']],
  ['Görev durum makinesi',           'npx', ['-y', 'tsx', 'src/lib/storeos/gorev.test.ts']],
  ['Adapter dönüşümü',               'npx', ['-y', 'tsx', 'src/lib/storeos/adapters/adapter.test.ts']],
  ['Pano toplayıcı',                 'npx', ['-y', 'tsx', 'src/lib/storeos/dashboard/pano.test.ts']],
  ['Liste toplayıcı (3 ekran)',      'npx', ['-y', 'tsx', 'src/lib/storeos/liste/liste.test.ts']],
  // Pano ÇİZİMİ: tsc "derlenir" der, bu "çalışır" der. Gün 7 düzeninin
  // vaatlerini (5 kart + delta + trend + skor + tek bant) veriye karşı ölçer.
  ['Pano çizimi (14 kutu)',          'npx', ['-y', 'tsx', 'src/components/storeos/pano-cizim.test.tsx']],
  // Modül ÇİZİMİ: on bir kapsam ekranı tek şablondan doğuyor; şablon patlarsa
  // on biri birden patlar. Dürüstlük işaretleri (örnek-veri bandı, salt-okunur
  // dipnotu) da burada kilitli — bir sayfa onları kapatamaz.
  ['Modül ekranı çizimi (11 ekran)', 'npx', ['-y', 'tsx', 'src/components/storeos/modul-cizim.test.tsx']],
  ['Demo telefon kilidi',            'npx', ['-y', 'tsx', 'src/lib/storeos/kanal/telefon-kilidi.test.ts']],
  // --airtable BİLEREK VERİLMİYOR: kontroller çevrimdışı koşabilmeli ve canlı
  // base'e yazmamalı. Airtable tarafını doğrulamak için elle:
  //   set -a; . ./.env.local; set +a
  //   npx -y tsx src/lib/storeos/depo/uygunluk.test.ts --airtable
  ['Depo uygunluk (ortak sözleşme)', 'npx', ['-y', 'tsx', 'src/lib/storeos/depo/uygunluk.test.ts']],
  ['Zincir (kanal/bildirim/yetki)',  'npx', ['-y', 'tsx', 'src/lib/storeos/zincir.test.ts']],
  ['Zincir uçtan uca (12 halka)',    'npx', ['-y', 'tsx', 'scripts/storeos/zincir-demo.ts', '--sessiz']],
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
