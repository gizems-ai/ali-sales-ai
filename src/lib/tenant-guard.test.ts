// ════════════════════════════════════════════════════════════════════════════
//  tenant-guard birim testi — `npm run test:guard` (npx tsx).
//  Ham-URL ?tenant enjeksiyon açığının kapandığını + meşru akışların bozulmadığını
//  kanıtlar. isProdDeploy parametresi = VERCEL_ENV==='production' mock'u.
// ════════════════════════════════════════════════════════════════════════════
import { tenantIdForRequest } from './tenant-guard'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

// Sigorta prod'unu besleyen (ve emlak-crm'in) ham deployment URL'i — PROD_HOST_MAP DIŞI.
const RAW = 'ali-sales-mkpecentp-gizem-burtecins-projects.vercel.app'

console.log('\n[1] AÇIK KAPANDI — PROD deployment, PROD_HOST_MAP dışı host + ?tenant enjeksiyonu')
ok('prod + ham *.vercel.app + x-tenant-id=emlak_demo → null (REDDEDİLİR)',
   tenantIdForRequest(RAW, 'emlak_demo', true) === null)
ok('prod + ham *.vercel.app + header yok → null',
   tenantIdForRequest(RAW, null, true) === null)
ok('prod + bilinmeyen özel domain + enjeksiyon → null',
   tenantIdForRequest('attacker.example.com', 'emlak_demo', true) === null)

console.log('\n[2] REGRESYON — meşru PROD istekleri host-mapped; x-tenant-id tenant DEĞİŞTİREMEZ')
ok('prod + sigorta.alisales.ai → sigortan_biz',
   tenantIdForRequest('sigorta.alisales.ai', null, true) === 'sigortan_biz')
ok('prod + sigorta.alisales.ai + x-tenant-id=emlak_demo → HÂLÂ sigortan_biz (enjeksiyon etkisiz)',
   tenantIdForRequest('sigorta.alisales.ai', 'emlak_demo', true) === 'sigortan_biz')
ok('prod + crm.alisales.ai → ali_genel',
   tenantIdForRequest('crm.alisales.ai', 'emlak_demo', true) === 'ali_genel')
ok('prod + emlak.alisales.ai → emlak_demo (meşru host-mapped)',
   tenantIdForRequest('emlak.alisales.ai', null, true) === 'emlak_demo')

console.log('\n[3] MEŞRU PREVIEW BOZULMADI — production-DIŞI deployment (VERCEL_ENV!==production)')
ok('preview + ?tenant=emlak_demo → emlak_demo (çalışmaya devam eder)',
   tenantIdForRequest('emlak-crm-git-xyz.vercel.app', 'emlak_demo', false) === 'emlak_demo')
ok('preview + host-mapped yine öncelikli',
   tenantIdForRequest('sigorta.alisales.ai', 'emlak_demo', false) === 'sigortan_biz')
ok('preview + header yok → null (localhost DEFAULT davranışı çağıranda ele alınır)',
   tenantIdForRequest('foo.vercel.app', null, false) === null)

if (fail) { console.log(`\n✗ ${fail} test BAŞARISIZ\n`); process.exit(1) }
console.log('\n✓ tüm tenant-guard güvenlik testleri geçti\n')
