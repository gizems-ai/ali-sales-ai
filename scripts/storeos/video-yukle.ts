// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GERÇEK MAĞAZA GÖRÜNTÜSÜNÜ VERCEL BLOB'A YÜKLER (tek seferlik)
//
//    npx -y tsx scripts/storeos/video-yukle.ts <video.mp4> <poster.jpg>
//
//  ── NEDEN REPOYA KOYMUYORUZ ────────────────────────────────────────────────
//  Video `public/` altına girseydi git deposu şişer, her deploy o baytları
//  yeniden taşırdı. Blob CDN'den servis edilir; repo 8 MB büyümez.
//
//  ── BAĞIMLILIK BİLEREK KAYDEDİLMİYOR ───────────────────────────────────────
//  `@vercel/blob` bu depoda `package.json`'a EKLENMEZ. Depo Ali paneliyle
//  ortak; tek seferlik bir yükleme scripti için Ali'nin üretim derlemesinin
//  bağımlılık listesini değiştirmiyoruz. Çalıştırmadan önce geçici kur:
//
//    npm install --no-save --no-package-lock @vercel/blob
//
//  ── TOKEN ──────────────────────────────────────────────────────────────────
//  `BLOB_READ_WRITE_TOKEN` ortam değişkeninden okunur. store-os projesine
//  bağlı `storeos-medya` deposunun token'ı:
//
//    npx vercel env pull /tmp/.env.storeos --environment=production
//
//  ── ÇIKTI ──────────────────────────────────────────────────────────────────
//  Dönen genel URL'ler ekrana basılır. Video URL'i koda YAZILMAZ; ortam
//  değişkenine konur:
//
//    npx vercel env add STOREOS_KAMERA_VIDEO_URL production
//    npx vercel env add STOREOS_KAMERA_POSTER_URL production
// ════════════════════════════════════════════════════════════════════════════

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { put } from '@vercel/blob'

/** Blob içinde sabit yol — rastgele son ek YOK ki yeniden yüklerken URL değişmesin. */
const KLASOR = 'storeos'

async function yukle(dosya: string, tip: string): Promise<string> {
  const govde = await readFile(dosya)
  const { url } = await put(`${KLASOR}/${basename(dosya)}`, govde, {
    access: 'public',
    contentType: tip,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  console.log(`  ✓ ${basename(dosya)}  (${(govde.length / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`    ${url}`)
  return url
}

async function main(): Promise<void> {
  const [video, poster] = process.argv.slice(2)
  if (!video || !poster) {
    console.error('Kullanım: npx -y tsx scripts/storeos/video-yukle.ts <video.mp4> <poster.jpg>')
    process.exit(1)
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN yok. `npx vercel env pull` ile çekip dışa aktarın.')
    process.exit(1)
  }

  console.log('\n── Vercel Blob yüklemesi ─────────────────────────────────────')
  const videoUrl = await yukle(video, 'video/mp4')
  const posterUrl = await yukle(poster, 'image/jpeg')

  console.log('\nOrtam değişkenleri:')
  console.log(`  STOREOS_KAMERA_VIDEO_URL=${videoUrl}`)
  console.log(`  STOREOS_KAMERA_POSTER_URL=${posterUrl}\n`)
}

main().catch(e => {
  console.error('Yükleme başarısız:', (e as Error).message)
  process.exit(1)
})
