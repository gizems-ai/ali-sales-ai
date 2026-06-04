// duzelt-bozuk-adlar.mjs
// 10 yüksek güven kaydını düzeltir.
// Çalıştırmadan önce yedek log yazar — geri alınabilir.
// Çalıştır: node scripts/duzelt-bozuk-adlar.mjs

import { writeFileSync, appendFileSync } from 'fs'

const TOKEN = process.env.AIRTABLE_TOKEN
const BASE_URL = 'https://api.airtable.com/v0/appjULACncjRV48pf/tblHy9njVwfkmNSMP'

if (!TOKEN) { console.error('AIRTABLE_TOKEN eksik'); process.exit(1) }

// Onaylanan 10 düzeltme — ID, eski ad, yeni ad
const DUZELTMELER = [
  {
    id: 'rec0kGI7w5Q6VhCdg',
    eski: 'SUBSEA 7 DEEP SEA LIMITED MERK EZİ BİRLEŞİK KRALLIK İSTANBUL MERKEZ ŞUB',
    yeni: 'SUBSEA 7 DEEP SEA LIMITED MERKEZİ BİRLEŞİK KRALLIK İSTANBUL MERKEZ ŞUB',
  },
  {
    id: 'rec3eBBX7h3K9Lj7c',
    eski: 'İNTER POİNT İSTİF MAKİNALARI S ANAYİ VE TİCARET LİM',
    yeni: 'İNTER POİNT İSTİF MAKİNALARI SANAYİ VE TİCARET LİM',
  },
  {
    id: 'rec4fwisp0z93tvtX',
    eski: 'KELEŞ TAHMİL TAHLİYE TAAHHÜT S ANAYİ VE TİCARET LİM',
    yeni: 'KELEŞ TAHMİL TAHLİYE TAAHHÜT SANAYİ VE TİCARET LİM',
  },
  {
    id: 'rec7QSQbf27qmuhse',
    eski: 'POLYTEKNO KİMYA VE TEKNOLOJİ S ANAYİ VE TİCARET L',
    yeni: 'POLYTEKNO KİMYA VE TEKNOLOJİ SANAYİ VE TİCARET L',
  },
  {
    id: 'recEgglG7s45vSjWw',
    eski: 'MRM ÇATI VE OLUK SİSTEMLERİ SA NAYİ VE TİCARET LİMİ',
    yeni: 'MRM ÇATI VE OLUK SİSTEMLERİ SANAYİ VE TİCARET LİMİ',
  },
  {
    id: 'recHuIKYDlCJKCe1l',
    eski: 'LOGİTECH TURKEY BİLGİSAYAR PAZ ARLAMA HİZMETLERİ Lİ',
    yeni: 'LOGİTECH TURKEY BİLGİSAYAR PAZARLAMA HİZMETLERİ Lİ',
  },
  {
    id: 'recVF7Ir2jIlQ59rg',
    eski: 'PARKTURK OTOPARK YATIRIMLARI A NONİM ŞİRKETİ',
    yeni: 'PARKTURK OTOPARK YATIRIMLARI ANONİM ŞİRKETİ',
  },
  {
    id: 'recgU7iPZSVQUhfJu',
    eski: 'FG WİLSON ENERJİ ÇÖZÜMLERİ SAN AYİ VE TİCARET ANO',
    yeni: 'FG WİLSON ENERJİ ÇÖZÜMLERİ SANAYİ VE TİCARET ANO',
  },
  {
    id: 'recl5fUeMXYumUI9i',
    eski: 'TANSEL ENERJİ SİSTEMLERİ SANAY İ VE TİCARET LİMİT',
    yeni: 'TANSEL ENERJİ SİSTEMLERİ SANAYİ VE TİCARET LİMİT',
  },
  {
    id: 'recyvQxEy7IurviOc',
    eski: 'PORTACE LİMAN EKİPMANLARI SANA Yİ TİCARET LİMİTED Ş',
    yeni: 'PORTACE LİMAN EKİPMANLARI SANAYİ TİCARET LİMİTED Ş',
  },
]

// Yedek log
const LOG_PATH = './scripts/yedek-duzeltme-log.csv'
const ts = new Date().toISOString()

function yazYedek() {
  const header = 'Tarih,Kayıt ID,Eski Ad,Yeni Ad\n'
  writeFileSync(LOG_PATH, header, 'utf8')
  for (const d of DUZELTMELER) {
    const safe = (s) => `"${s.replace(/"/g, '""')}"`
    appendFileSync(LOG_PATH, `${ts},${d.id},${safe(d.eski)},${safe(d.yeni)}\n`, 'utf8')
  }
  console.log(`Yedek log yazıldı: ${LOG_PATH}`)
}

// Airtable tek kayıt PATCH
async function patchRecord(id, firmaAdi) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { 'Firma Adı': firmaAdi } }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`PATCH ${id} → ${res.status}: ${t}`)
  }
  return res.json()
}

// Teyit: kayıttan oku
async function getAd(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) throw new Error(`GET ${id} → ${res.status}`)
  const data = await res.json()
  return data.fields?.['Firma Adı'] ?? '(boş)'
}

async function main() {
  console.log('='.repeat(70))
  console.log('Bozuk Ad Düzeltmesi — 10 Kayıt')
  console.log('='.repeat(70))

  // 1. Yedek
  yazYedek()
  console.log()

  // 2. Uygula + teyit
  let basarili = 0
  let hatali = 0

  for (const d of DUZELTMELER) {
    process.stdout.write(`PATCH ${d.id.slice(0, 10)}… `)
    try {
      await patchRecord(d.id, d.yeni)
      // 300ms bekle (rate limit)
      await new Promise(r => setTimeout(r, 300))

      // Teyit: okunan ad beklenenle eşleşiyor mu?
      const teyit = await getAd(d.id)
      await new Promise(r => setTimeout(r, 300))

      if (teyit === d.yeni) {
        console.log(`✓  ${teyit}`)
        basarili++
      } else {
        console.log(`⚠  UYUŞMUYOR! Beklenen: "${d.yeni}" | Okunan: "${teyit}"`)
        hatali++
      }
    } catch (e) {
      console.log(`✗  HATA: ${e.message}`)
      hatali++
    }
  }

  console.log()
  console.log('='.repeat(70))
  console.log(`Sonuç: ${basarili} başarılı, ${hatali} hatalı`)
  if (hatali > 0) console.log('Geri almak için yedek-duzeltme-log.csv kullanılabilir.')
  console.log('='.repeat(70))
}

main().catch(e => { console.error(e); process.exit(1) })
