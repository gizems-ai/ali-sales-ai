'use server'

// ════════════════════════════════════════════════════════════════════════════
//  Kampanya Motoru yayın aksiyonları (§6). Server action — store'u mutasyonlar +
//  Broker OS yolunu revalidate eder. next/cache YALNIZ burada (client-safe değil).
//  Kampanya Motoru kartından çağrılır; Broker OS bu dosyaya dokunmaz.
// ════════════════════════════════════════════════════════════════════════════

import { revalidatePath } from 'next/cache'
import { kampanyaUpsert, yayinla, yayindanKaldir, engineKaydiKur, type EngineYayinGirdi } from './kampanya-store'

// Motor kartını Broker OS'a yayınla → store'a düşür + brokerYayin=true (§6).
export async function yayinlaKampanyaAction(girdi: EngineYayinGirdi): Promise<{ id: string; brokerYayin: boolean }> {
  const kayit = kampanyaUpsert(engineKaydiKur(girdi))
  const guncel = yayinla(kayit.id, new Date().toISOString())
  revalidatePath('/broker')
  revalidatePath('/kampanya-motoru')
  return { id: kayit.id, brokerYayin: guncel?.brokerYayin ?? false }
}

// Broker OS'tan kaldır → brokerYayin=false (§6).
export async function kaldirKampanyaAction(id: string): Promise<{ id: string; brokerYayin: boolean }> {
  const guncel = yayindanKaldir(id)
  revalidatePath('/broker')
  revalidatePath('/kampanya-motoru')
  return { id, brokerYayin: guncel?.brokerYayin ?? false }
}
