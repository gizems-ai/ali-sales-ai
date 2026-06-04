// tarama-bozuk-adlar.mjs
// Airtable'dan tüm firma adlarını çek, bozuk pattern'leri tespit et, öneri üret
// Çalıştır: node scripts/tarama-bozuk-adlar.mjs

import { writeFileSync } from 'fs'

const TOKEN = process.env.AIRTABLE_TOKEN
const BASE_URL = 'https://api.airtable.com/v0/appjULACncjRV48pf/tblHy9njVwfkmNSMP'

if (!TOKEN) { console.error('AIRTABLE_TOKEN eksik'); process.exit(1) }

// --- Tespit mantığı ---

// Türkçe büyük harfler dahil
const TR_UPPER = /^[A-ZÇĞİÖŞÜ]$/

// Bilinen Türkçe şirket kelime kökü fragmanları — tek başına anlamsız token'lar
// Bunlar bir önceki/sonraki token ile birleşince anlam kazanıyor
const SPLIT_STARTERS = new Set([
  'A','B','C','D','E','F','G','H','I','İ','J','K','L','M','N','O','Ö',
  'P','R','S','Ş','T','U','Ü','V','Y','Z'
])

// Truncated (eksik) suffix fragmanları — tek başına son token olarak bozuktur
const TRUNCATED_ENDINGS = new Set([
  'Tİ', 'SA', 'SAN', 'PA', 'PAZ', 'MÜ', 'İN', 'Tİ', 'GE', 'NA',
  'Tİ.', 'SA.', 'PA.',
  'VE', // "SAN.VE" gibi ortada kalırsa da yakalanır
])

// Bölünmüş kelime fragmanları — birleşince valid iş kelimesi oluşturabilecekler
// NOT: Buradaki kelimeler YALNIZCA fragment olarak anlamlı; tam kelime olarak
// bağımsız kullanılanlar (tarım, lojistik vb.) buraya GİRMEMELİ
const BUSINESS_ROOTS = [
  'merkez', 'sanayi', 'ticaret', 'nakliyat',
  'pazarlama', 'ithalat', 'ihracat',
  'limited', 'anonim',
]

// Bağımsız anlam taşıyan, fragment OLMAMALARI gereken kelimeler
// (algoritma bunları token olarak görünce birleştirme önerisinde BULUNMAZ)
const STANDALONE_WORDS = new Set([
  'TARIM', 'tarım', 'LOJİSTİK', 'lojistik', 'BİLİŞİM', 'bilişim',
  'YAZILIM', 'yazılım', 'DANIŞMANLIK', 'danışmanlık', 'MÜHENDİSLİK',
  'mühendislik', 'İNŞAAT', 'inşaat', 'TEKSTİL', 'tekstil',
  'OTOMOTİV', 'otomotiv', 'HOLDİNG', 'holding', 'YATIRIM', 'yatırım',
  'GÜVENLİK', 'güvenlik', 'TEMİZLİK', 'temizlik', 'TAŞIMACILIK', 'taşımacılık',
  'İLETİŞİM', 'iletişim', 'ENERJİ', 'enerji', 'GIDA', 'gida',
  'SAĞLIK', 'sağlık', 'EĞİTİM', 'eğitim', 'TURİZM', 'turizm',
  'İNŞAAT', 'inşaat', 'METAL', 'metal', 'KİMYA', 'kimya',
])

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u')
    .replace(/İ/gi,'i').replace(/Ç/gi,'c').replace(/Ğ/gi,'g')
    .replace(/Ö/gi,'o').replace(/Ş/gi,'s').replace(/Ü/gi,'u')
}

function detectBroken(name) {
  if (!name || typeof name !== 'string') return null
  const trimmed = name.trim()
  const tokens = trimmed.split(/\s+/)
  if (tokens.length < 2) return null // tek kelime zaten düzgün

  const issues = []

  // Pattern 1: Tek büyük harf token → muhtemelen kelime başı ayrılmış
  // "S ANAYİ", "A.Ş" değil, sadece bare harfler
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i]
    if (t.length === 1 && TR_UPPER.test(t)) {
      const merged = t + tokens[i + 1]
      const normMerged = normalize(merged)
      const isKnownRoot = BUSINESS_ROOTS.some(r => normMerged.startsWith(normalize(r).slice(0,4)))
      issues.push({
        type: 'tek-harf-prefix',
        pos: i,
        token: t,
        next: tokens[i+1],
        merged,
        confidence: isKnownRoot ? 'yüksek' : 'orta',
      })
    }
  }

  // Pattern 2: Kısa (2-3 harf) final token — truncated suffix
  const last = tokens[tokens.length - 1].replace(/\.$/, '') // nokta varsa çıkar
  if (tokens.length >= 2 && TRUNCATED_ENDINGS.has(last) && last.length <= 3) {
    issues.push({
      type: 'kesik-sonek',
      pos: tokens.length - 1,
      token: tokens[tokens.length - 1],
      confidence: 'orta',
    })
  }

  // Pattern 3: 2-5 harfli NON-suffix token ortada — muhtemelen bölünmüş kelime
  // "MERK EZİ" → MERK (4 harf) + EZİ → MERKEZİ
  // "SA NAYİ" → SA + NAYİ → SANAYİ
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    // Bağımsız anlam taşıyan kelimeleri atla (TARIM VE GIDA gibi yanlış eşleşme olmasın)
    if (STANDALONE_WORDS.has(t)) continue
    // Standard kısaltmalar, bağlaçlar değil; 2-5 harfli
    if (
      t.length >= 2 && t.length <= 5 &&
      !t.includes('.') && !t.includes('&') &&
      !/^(VE|İLE|OR|OF|AND|THE|DE|DA|DAN|DEN)$/.test(t)
    ) {
      const merged = t + next
      const normMerged = normalize(merged)
      const match = BUSINESS_ROOTS.find(r => {
        const normR = normalize(r)
        // Birleşince tam olarak o kelime olmalı (prefix yetmez — yanlış pozitif önler)
        return normMerged === normR || (normMerged.startsWith(normR) && normMerged.length <= normR.length + 4)
      })
      if (match) {
        issues.push({
          type: 'bölünmüş-kelime',
          pos: i,
          token: t,
          next,
          merged,
          root: match,
          confidence: 'yüksek',
        })
      }
    }
  }

  if (issues.length === 0) return null

  // En güvenilir issue'dan öneri üret
  const best = issues.sort((a,b) =>
    (b.confidence === 'yüksek' ? 2 : b.confidence === 'orta' ? 1 : 0) -
    (a.confidence === 'yüksek' ? 2 : a.confidence === 'orta' ? 1 : 0)
  )[0]

  let suggested = null
  if (best.type === 'tek-harf-prefix' || best.type === 'bölünmüş-kelime') {
    const t = [...tokens]
    t.splice(best.pos, 2, best.merged)
    suggested = t.join(' ')
  }
  // kesik-sonek için öneri üretemeyiz, elle yapılacak

  return {
    issues,
    primaryType: best.type,
    confidence: best.confidence,
    suggested,
  }
}

// --- Airtable paginatör ---

async function fetchAll() {
  let records = []
  let offset
  let page = 0
  do {
    page++
    const qs = new URLSearchParams()
    qs.append('fields[]', 'Firma Adı')
    qs.append('fields[]', 'Mükerrer Şüphesi')
    qs.set('pageSize', '100')
    if (offset) qs.set('offset', offset)

    const res = await fetch(`${BASE_URL}?${qs}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (!res.ok) { const t = await res.text(); throw new Error(`Airtable ${res.status}: ${t}`) }
    const data = await res.json()
    records.push(...(data.records ?? []))
    offset = data.offset
    process.stdout.write(`\r  Sayfa ${page} — ${records.length} kayıt okundu...`)
  } while (offset)
  console.log()
  return records
}

// --- Ana ---

async function main() {
  console.log('SB_Firmalar — Bozuk Ad Taraması\n')
  const records = await fetchAll()
  console.log(`Toplam kayıt: ${records.length}\n`)

  const findings = []
  for (const r of records) {
    const name = r.fields?.['Firma Adı']
    const mukerer = r.fields?.['Mükerrer Şüphesi']
    const result = detectBroken(name)
    if (result) {
      findings.push({
        id: r.id,
        original: name,
        mukerer: mukerer ?? '-',
        ...result,
      })
    }
  }

  console.log(`Bozuk şüpheli: ${findings.length} kayıt\n`)

  // Güven seviyelerine göre ayır
  const yuksek = findings.filter(f => f.confidence === 'yüksek')
  const orta   = findings.filter(f => f.confidence === 'orta')

  console.log(`  Yüksek güven (oto-düzeltilebilir): ${yuksek.length}`)
  console.log(`  Orta güven (elle incelenecek):      ${orta.length}`)
  console.log()

  // Ekrana önizle (ilk 30)
  console.log('='.repeat(80))
  console.log('YÜKSEK GÜVEN — ÖNİZLEME (ilk 20):')
  console.log('='.repeat(80))
  yuksek.slice(0, 20).forEach((f, i) => {
    console.log(`${String(i+1).padStart(3)}. ${f.original}`)
    console.log(`     → ${f.suggested ?? '(elle incelenecek)'}`)
    console.log(`     [${f.primaryType}]`)
  })

  if (orta.length > 0) {
    console.log()
    console.log('='.repeat(80))
    console.log('ORTA GÜVEN — ELLE İNCELENECEK (ilk 20):')
    console.log('='.repeat(80))
    orta.slice(0, 20).forEach((f, i) => {
      console.log(`${String(i+1).padStart(3)}. ${f.original}`)
      console.log(`     → ${f.suggested ?? '(öneri yok — elle düzelt)'}`)
      console.log(`     [${f.primaryType}]`)
    })
  }

  // CSV kaydet
  const rows = ['ID,Orijinal,Öneri,Tür,Güven,Mükerrer']
  for (const f of findings) {
    const safe = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
    rows.push([
      f.id,
      safe(f.original),
      safe(f.suggested ?? ''),
      f.primaryType,
      f.confidence,
      safe(f.mukerer),
    ].join(','))
  }
  const csvPath = './scripts/bozuk-adlar-rapor.csv'
  writeFileSync(csvPath, rows.join('\n'), 'utf8')
  console.log(`\nCSV kaydedildi: ${csvPath}`)
  console.log('\nDevam etmek için: node scripts/duzelt-bozuk-adlar.mjs')
}

main().catch(e => { console.error(e); process.exit(1) })
