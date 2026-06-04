// Mükerrer Şüphesi alanının mevcut dağılımını ve örnek grupları gösterir
const TOKEN = process.env.AIRTABLE_TOKEN
const BASE_URL = 'https://api.airtable.com/v0/appjULACncjRV48pf/tblHy9njVwfkmNSMP'

if (!TOKEN) { console.error('AIRTABLE_TOKEN eksik'); process.exit(1) }

async function fetchAll() {
  const records = []
  let offset
  do {
    const qs = new URLSearchParams()
    qs.append('fields[]', 'Firma Adı')
    qs.append('fields[]', 'Mükerrer Şüphesi')
    qs.append('fields[]', 'Genel Telefon')
    qs.append('fields[]', 'Genel Mail')
    qs.set('pageSize', '100')
    if (offset) qs.set('offset', offset)
    const res = await fetch(`${BASE_URL}?${qs}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data.error))
    records.push(...(data.records ?? []))
    offset = data.offset
    process.stdout.write(`\r  ${records.length} kayıt…`)
  } while (offset)
  console.log()
  return records
}

async function main() {
  console.log('Mükerrer Şüphesi — Mevcut Durum\n')
  const records = await fetchAll()

  const counts = {}
  const gruplar = { isim: {}, tel: {}, mail: {} }

  for (const r of records) {
    const f = r.fields ?? {}
    const v = f['Mükerrer Şüphesi'] ?? '(boş)'
    counts[v] = (counts[v] ?? 0) + 1

    // Grupları yeniden oluştur (örnek için)
    const ad = f['Firma Adı'] ?? ''
    const tel = (f['Genel Telefon'] ?? '').replace(/\D/g, '').slice(-10)
    const mail = (f['Genel Mail'] ?? '').toLowerCase().trim()

    if (ad) {
      gruplar.isim[ad] = gruplar.isim[ad] ?? []
      gruplar.isim[ad].push({ id: r.id, ad, tel, mail, v })
    }
    if (tel.length >= 9) {
      gruplar.tel[tel] = gruplar.tel[tel] ?? []
      gruplar.tel[tel].push({ id: r.id, ad, tel, mail, v })
    }
    if (mail.includes('@')) {
      gruplar.mail[mail] = gruplar.mail[mail] ?? []
      gruplar.mail[mail].push({ id: r.id, ad, tel, mail, v })
    }
  }

  console.log('='.repeat(60))
  console.log('ALAN DAĞILIMI:')
  console.log('='.repeat(60))
  for (const [k, v] of Object.entries(counts).sort((a,b) => b[1]-a[1]))
    console.log(`  ${String(v).padStart(5)}  ${k}`)

  const isimGruplar = Object.values(gruplar.isim).filter(g => g.length > 1 && g.some(r => r.v && r.v !== '(boş)'))
  const telGruplar  = Object.values(gruplar.tel).filter(g => g.length > 1 && g.some(r => r.v && r.v !== '(boş)'))
  const mailGruplar = Object.values(gruplar.mail).filter(g => g.length > 1 && g.some(r => r.v && r.v !== '(boş)'))

  console.log()
  console.log('='.repeat(60))
  console.log(`BİREBİR İSİM grupları (işaretli): ${isimGruplar.length}`)
  console.log('='.repeat(60))
  isimGruplar.slice(0, 4).forEach(g => {
    console.log()
    g.forEach(r => console.log(`  [${r.v}]  ${r.ad}  (${r.id})`))
  })

  console.log()
  console.log('='.repeat(60))
  console.log(`TELEFON grupları (işaretli): ${telGruplar.length}`)
  console.log('='.repeat(60))
  telGruplar.slice(0, 4).forEach(g => {
    console.log()
    g.forEach(r => console.log(`  [${r.v}]  ${r.ad}`))
  })

  console.log()
  console.log('='.repeat(60))
  console.log(`MAİL grupları (işaretli): ${mailGruplar.length}`)
  console.log('='.repeat(60))
  mailGruplar.slice(0, 4).forEach(g => {
    console.log()
    g.forEach(r => console.log(`  [${r.v}]  ${r.ad}  (${r.mail})`))
  })
}

main().catch(e => { console.error(e); process.exit(1) })
