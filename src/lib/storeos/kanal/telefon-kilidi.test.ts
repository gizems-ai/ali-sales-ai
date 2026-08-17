// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO TELEFON KİLİDİ TESTİ
//
//     npx -y tsx src/lib/storeos/kanal/telefon-kilidi.test.ts
//
//  Kanıtlanan davranışlar:
//    1. Varsayılan AÇIK — hiçbir env verilmeden hedef eziliyor
//    2. Kapatma yalnız TAM sözle olur; 'false'/'0'/'kapali' kilidi açık bırakır
//    3. Hedef yoksa/E.164 değilse: dışarı çıkan kanalda gönderim REDDEDİLİR
//    4. Aynı durumda konsol kanalı akmaya devam eder (uyarı basar)
//    5. Ezme, gönderim sonucunun `not` alanında görünür (denetime düşsün diye)
//    6. Kilit kapalıyken numara aynen geçer
//
//  NOT: env okuması `env.ts` üzerinden yapılıyor ve getter'lar her çağrıda
//  process.env'e bakıyor — bu yüzden test içinde değişkeni değiştirip yeniden
//  çağırmak yeterli, modül yeniden yüklemeye gerek yok.
// ════════════════════════════════════════════════════════════════════════════

import { KILIT_KAPATMA_SOZU } from '../env'
import { KonsolKanali } from './konsol'
import { e164Mi, hedefiCoz, kilitDurumu, kilitUyarisiniSifirla, kilitle } from './telefon-kilidi'
import type { GidenMesaj, GonderimSonucu, KanalArayuzu } from './tipler'

let fail = 0
function ok(ad: string, kosul: boolean, ek = ''): void {
  if (kosul) { console.log(`  ✓ ${ad}`); return }
  fail++
  console.log(`  ✗ ${ad}${ek ? ` — ${ek}` : ''}`)
}

const DEMO = '+905303227450'
const GERCEK = '+905321112233'

function envAyarla(demo?: string, kilit?: string): void {
  if (demo === undefined) delete process.env.STOREOS_DEMO_TELEFON
  else process.env.STOREOS_DEMO_TELEFON = demo
  if (kilit === undefined) delete process.env.STOREOS_TELEFON_KILIDI
  else process.env.STOREOS_TELEFON_KILIDI = kilit
}

/** Ne aldığını kaydeden sahte kanal — `disaCikar` testte belirlenir. */
class KayitliKanal implements KanalArayuzu {
  readonly ad = 'whatsapp' as const
  gidenler: GidenMesaj[] = []
  constructor(readonly disaCikar: boolean) {}
  async gonder(m: GidenMesaj): Promise<GonderimSonucu> {
    this.gidenler.push(m)
    return { basarili: true, saglayiciMesajId: `sahte-${m.bildirimId}` }
  }
  gelenCoz(): null { return null }
}

const MESAJ = (telefon: string): GidenMesaj => ({
  bildirimId: 'b-G-000001-ilk',
  aliciTelefon: telefon,
  aliciAd: 'Test Alıcı',
  govde: 'gövde',
  butonlar: [],
  gorevNo: 'G-000001',
})

async function main(): Promise<void> {
  console.log('\n── Demo telefon kilidi ─────────────────────────────────────')

  // ── 1. Varsayılan açık ──
  console.log('\n[1] varsayılan davranış')
  envAyarla(DEMO)
  ok('kilit varsayılan AÇIK', kilitDurumu().acik)
  const c1 = hedefiCoz(GERCEK)
  ok('gerçek numara demo numarasıyla değiştirildi', c1.telefon === DEMO && c1.ezildi, `${c1.telefon}`)
  ok('engel yok', c1.engel === null)
  const c1b = hedefiCoz(DEMO)
  ok('zaten demo numarasıysa "ezildi" işaretlenmez', c1b.telefon === DEMO && !c1b.ezildi)

  // ── 2. Kapatma yalnız tam sözle ──
  console.log('\n[2] kapatma bilinçli bir hareket')
  for (const yanlis of ['false', '0', 'kapali', 'off', 'no', 'KAPALI-GERCEK-ALICILARA-GONDER']) {
    envAyarla(DEMO, yanlis)
    ok(`'${yanlis}' kilidi KAPATMAZ`, kilitDurumu().acik)
  }
  envAyarla(DEMO, KILIT_KAPATMA_SOZU)
  ok(`'${KILIT_KAPATMA_SOZU}' kilidi kapatır`, !kilitDurumu().acik)
  const c2 = hedefiCoz(GERCEK)
  ok('kilit kapalıyken numara aynen geçer', c2.telefon === GERCEK && !c2.ezildi)

  // ── 3. Hedef geçersiz → fail-closed (dışarı çıkan kanal) ──
  console.log('\n[3] hedef yok/geçersiz → dışarı çıkan kanal REDDEDER')
  envAyarla(undefined)
  ok('hedef yoksa engel bildirilir', hedefiCoz(GERCEK).engel !== null)
  const disa = new KayitliKanal(true)
  const s3 = await kilitle(disa).gonder(MESAJ(GERCEK))
  ok('gönderim reddedildi', !s3.basarili)
  ok('kanala hiç ulaşmadı', disa.gidenler.length === 0)
  ok('tekrar denenebilir değil (yapılandırma hatası)', !s3.basarili && !s3.tekrarDenenebilir)

  envAyarla('0530 322 74 50')   // E.164 değil
  ok('boşluklu numara E.164 sayılmaz', !e164Mi('0530 322 74 50'))
  const disa2 = new KayitliKanal(true)
  const s3b = await kilitle(disa2).gonder(MESAJ(GERCEK))
  ok('E.164 olmayan hedefte de reddedilir', !s3b.basarili && disa2.gidenler.length === 0)

  // ── 4. Aynı durumda konsol akmaya devam eder ──
  console.log('\n[4] konsol kanalı (dışarı çıkmaz) engellenmez')
  envAyarla(undefined)
  kilitUyarisiniSifirla()   // uyarı süreç başına bir kez basılıyor
  const gercekWarn = console.warn
  let uyariSayisi = 0
  console.warn = () => { uyariSayisi++ }
  const gercekLog = console.log
  console.log = () => {}
  const s4 = await kilitle(new KonsolKanali()).gonder(MESAJ(GERCEK))
  console.log = gercekLog
  console.warn = gercekWarn
  ok('konsol gönderimi sürdü', s4.basarili)
  ok('ama uyarı basıldı', uyariSayisi === 1, `uyarı=${uyariSayisi}`)

  // ── 5. Ezme sonuçta görünür ──
  console.log('\n[5] ezme görünür olmalı')
  envAyarla(DEMO)
  const disa3 = new KayitliKanal(true)
  console.warn = () => {}
  const s5 = await kilitle(disa3).gonder(MESAJ(GERCEK))
  console.warn = gercekWarn
  ok('kanala giden numara demo numarası', disa3.gidenler[0]?.aliciTelefon === DEMO)
  ok('sonuçtaki not ezmeyi söylüyor',
    s5.basarili === true && (s5.not ?? '').includes(GERCEK) && (s5.not ?? '').includes(DEMO),
    s5.basarili ? s5.not : '')
  ok('mesajın geri kalanı değişmedi',
    disa3.gidenler[0]?.govde === 'gövde' && disa3.gidenler[0]?.bildirimId === 'b-G-000001-ilk')

  // ── 6. Kilit kapalıyken gerçek numaraya gider ──
  console.log('\n[6] kilit kapalı → gerçek numara')
  envAyarla(DEMO, KILIT_KAPATMA_SOZU)
  const disa4 = new KayitliKanal(true)
  const s6 = await kilitle(disa4).gonder(MESAJ(GERCEK))
  ok('gönderim başarılı', s6.basarili)
  ok('gerçek numaraya gitti', disa4.gidenler[0]?.aliciTelefon === GERCEK)

  envAyarla(DEMO)   // sonraki testler için varsayılana dön
  console.log(fail === 0 ? '\n✓ tüm kilit kontrolleri geçti\n' : `\n✗ ${fail} kontrol düştü\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
