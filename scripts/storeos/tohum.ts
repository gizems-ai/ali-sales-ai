// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO AÇILIŞ TOHUMU (elle koşulan taze parti)
//
//    npx -y tsx scripts/storeos/tohum.ts              # KURU ÇALIŞMA (yazmaz)
//    npx -y tsx scripts/storeos/tohum.ts --yaz
//    npx -y tsx scripts/storeos/tohum.ts --yaz --etiket=prova2
//
//  NİYE VAR: `hazirlik.ts` tohumu süreç açılışında BİR KEZ atar ve olay
//  ID'leri sabittir — yani kalıcı depoda (Airtable) zaman damgaları donar.
//  Birkaç gün sonra o üç görev "gecikmiş" görünür ve sağlık skoru düşer.
//  Jüri/prova sabahı bu script TAZE bir parti yazar: aynı beş olay, o anın
//  saatine göre. Eski parti SİLİNMEZ (denetim defteri append-only); pano
//  zaten en yeni 20 alarmı gösterir.
//
//  SINIRLAR
//   · Kanal AÇIKÇA konsoldur — buradan tek bir WhatsApp mesajı çıkmaz.
//   · Yalnız Store OS'e ayrılmış base'e yazar (STOREOS_AIRTABLE_BASE_ID).
//   · Etiketsiz koşu, uygulamanın attığı tohumla AYNI ID'leri kullanır →
//     "yinelenen" döner, çoğaltmaz. Taze parti için --etiket ver.
// ════════════════════════════════════════════════════════════════════════════

import { panoyuTohumla } from '../../src/lib/storeos/demo-tohum'
import { depo } from '../../src/lib/storeos/depo'
import { panoTopla } from '../../src/lib/storeos/dashboard/toplayici'

const YAZ = process.argv.includes('--yaz')
const ETIKET = (process.argv.find(a => a.startsWith('--etiket=')) ?? '').split('=')[1]

async function main() {
  const d = depo()
  const magaza = process.env.STOREOS_MAGAZA_KODU ?? '0178'

  console.log(`depo    : ${d.ad}`)
  console.log(`mağaza  : ${magaza}`)
  console.log(`etiket  : ${ETIKET ?? '(yok — uygulama tohumuyla aynı ID\'ler)'}`)

  const once = await panoTopla({ depo: d, magazaKodu: magaza, katman: 'canli' })
  console.log(`önce    : ${once.alarmlar?.length ?? 0} alarm · ${once.gorevOzeti?.acik ?? 0} açık görev`)

  if (!YAZ) {
    console.log('\nKURU ÇALIŞMA — hiçbir şey yazılmadı. Yazmak için: --yaz')
    return
  }

  const sonuc = await panoyuTohumla(d, undefined, ETIKET)
  console.log(`\ntohum   : kabul=${sonuc.kabul} yinelenen=${sonuc.yinelenen} reddedilen=${sonuc.reddedilen}`)

  const sonra = await panoTopla({ depo: d, magazaKodu: magaza, katman: 'tam' })
  console.log(`sonra   : ${sonra.alarmlar?.length ?? 0} alarm · ${sonra.gorevOzeti?.acik ?? 0} açık görev`)
  console.log(`skor    : ${sonra.saglikSkoru?.deger} ${sonra.saglikSkoru?.sinif} — ${sonra.saglikSkoru?.gerekce}`)
}

main().catch(e => { console.error(e); process.exit(1) })
