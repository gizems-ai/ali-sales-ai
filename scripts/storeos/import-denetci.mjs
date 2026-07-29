#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  STORE OS İMPORT DENETÇİSİ
//  Store OS ağacındaki her import'un izin verilen yollarda kaldığını doğrular.
//  Kural (src/lib/storeos/README.md): kopyala, import etme.
//
//    node scripts/storeos/import-denetci.mjs          # rapor + exit kodu
//    node scripts/storeos/import-denetci.mjs --sessiz  # yalnız ihlaller
//
//  Çıkış: 0 = temiz · 1 = ihlal var · 2 = denetçi hatası
// ════════════════════════════════════════════════════════════════════════════

import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Denetlenen ağaçlar. */
const STOREOS_KOKLERI = [
  'src/app/storeos',
  'src/app/api/storeos',
  'src/lib/storeos',
  'src/components/storeos',
  'scripts/storeos',
]

/** `@/...` alias'ı ile izin verilen tek önekler (tsconfig: @/* → ./src/*). */
const IZINLI_ALIAS_ONEKLERI = [
  '@/lib/storeos/',
  '@/components/storeos/',
  '@/app/storeos/',
  '@/app/api/storeos/',
]

const UZANTILAR = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs'])
const sessiz = process.argv.includes('--sessiz')

// ─── Dosya toplama ───────────────────────────────────────────────────────────

async function dosyalariTopla(dizin, biriktir = []) {
  let girisler
  try {
    girisler = await readdir(dizin, { withFileTypes: true })
  } catch {
    return biriktir // kök henüz yoksa sessizce geç
  }
  for (const g of girisler) {
    const tamYol = join(dizin, g.name)
    if (g.isDirectory()) {
      if (g.name === 'node_modules' || g.name.startsWith('.')) continue
      await dosyalariTopla(tamYol, biriktir)
    } else if (UZANTILAR.has(g.name.slice(g.name.lastIndexOf('.')))) {
      biriktir.push(tamYol)
    }
  }
  return biriktir
}

// ─── Import çıkarımı ─────────────────────────────────────────────────────────
// Yorum satırlarını ve şablon literallerini basitçe eleyip specifier avlarız.
// Amaç eksiksiz bir parser değil; kaçak import'u yakalamak.

const DESENLER = [
  // import ... from 'x'  /  import 'x'  /  export ... from 'x'
  /(?:^|\n)\s*(?:import|export)\s[^;\n]*?from\s*['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  // import('x') · require('x')
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

function yorumlariSil(kaynak) {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function importlariCikar(kaynak) {
  const temiz = yorumlariSil(kaynak)
  const bulunan = new Set()
  for (const desen of DESENLER) {
    desen.lastIndex = 0
    let m
    while ((m = desen.exec(temiz)) !== null) bulunan.add(m[1])
  }
  return [...bulunan]
}

// ─── Sınıflandırma ───────────────────────────────────────────────────────────

function storeosIcinde(mutlakYol) {
  const goreli = relative(KOK, mutlakYol).split('\\').join('/')
  return STOREOS_KOKLERI.some(k => goreli === k || goreli.startsWith(k + '/'))
}

/** @returns {{ok: true} | {ok: false, sebep: string}} */
function degerlendir(specifier, dosyaYolu) {
  // 1) Bare specifier → node_modules. '@scope/paket' dahil, '@/' hariç.
  const bare = !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/')
  if (bare) return { ok: true }

  // 2) @/ alias'ı — yalnız storeos altları
  if (specifier.startsWith('@/')) {
    if (IZINLI_ALIAS_ONEKLERI.some(p => specifier.startsWith(p))) return { ok: true }
    return { ok: false, sebep: `panel alias'ı — '${specifier}' Store OS dışında` }
  }

  // 3) Mutlak yol — kullanma
  if (specifier.startsWith('/')) {
    return { ok: false, sebep: `mutlak yol import'u yasak — '${specifier}'` }
  }

  // 4) Göreli — storeos kökleri içinde kalmalı
  const hedef = resolve(dirname(dosyaYolu), specifier)
  if (storeosIcinde(hedef)) return { ok: true }
  return { ok: false, sebep: `göreli yol Store OS ağacından çıkıyor — '${specifier}'` }
}

// ─── Çalıştır ────────────────────────────────────────────────────────────────

async function main() {
  const ihlaller = []
  let dosyaSayisi = 0
  let importSayisi = 0
  const mevcutKokler = []

  for (const kok of STOREOS_KOKLERI) {
    const mutlak = join(KOK, kok)
    if (!existsSync(mutlak)) continue
    mevcutKokler.push(kok)
    const dosyalar = await dosyalariTopla(mutlak)
    for (const dosya of dosyalar) {
      dosyaSayisi++
      const kaynak = await readFile(dosya, 'utf8')
      for (const spec of importlariCikar(kaynak)) {
        importSayisi++
        const sonuc = degerlendir(spec, dosya)
        if (!sonuc.ok) {
          ihlaller.push({
            dosya: relative(KOK, dosya).split('\\').join('/'),
            specifier: spec,
            sebep: sonuc.sebep,
          })
        }
      }
    }
  }

  if (!sessiz) {
    console.log('── Store OS import denetimi ──────────────────────────────────')
    console.log(`Taranan kök   : ${mevcutKokler.length}/${STOREOS_KOKLERI.length}` +
                (mevcutKokler.length ? `  (${mevcutKokler.join(', ')})` : ''))
    console.log(`Taranan dosya : ${dosyaSayisi}`)
    console.log(`Görülen import: ${importSayisi}`)
  }

  if (ihlaller.length === 0) {
    if (!sessiz) console.log('Sonuc         : TEMIZ — izin verilen yollar disinda import yok.')
    return 0
  }

  console.error(`\nIHLAL: ${ihlaller.length} adet\n`)
  for (const i of ihlaller) {
    console.error(`  ${i.dosya}`)
    console.error(`    → ${i.sebep}`)
  }
  console.error('\nDüzeltme: ihtiyacın olan parçayı src/lib/storeos/ altına KOPYALA.')
  return 1
}

main().then(
  kod => process.exit(kod),
  err => { console.error('Denetçi hatası:', err); process.exit(2) },
)
