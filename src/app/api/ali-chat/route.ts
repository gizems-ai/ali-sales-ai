// ════════════════════════════════════════════════════════════════════════════
//  POST /api/ali-chat — Ali Sohbet server rotası
//  Akış: soru → deterministik retrieval → birleşik payload → n8n webhook (15sn)
//  n8n LLM yalnız CÜMLE kurar; veri paketi dışında sayı üretemez.
//  N8N_ALI_WEBHOOK_URL tanımsız/erişilemez → kibar fallback, panel kırılmaz.
// ════════════════════════════════════════════════════════════════════════════

import { type NextRequest } from 'next/server'
import { retrieve } from '@/lib/ali-chat/retrieval'
import { buildSystemPrompt } from '@/lib/ali-persona'
import type { AliChatResponse, N8nAliPayload, VeriPaketi } from '@/lib/ali-chat/types'

export const runtime = 'nodejs'

const TIMEOUT_MS = 15_000
const VERTICAL = 'emlak' as const

// Kibar fallback mesajı (panel asla kırık görünmez)
const FALLBACK_CEVAP = 'Şu an cevap veremiyorum — birazdan tekrar dener misin?'

// Aktif persona: eşleştirme/müşteri sorusu bir müşteriyi hedeflerse onun personası.
function personaBelirle(veri: VeriPaketi): string {
  if (veri.eslestirme) return veri.eslestirme.musteri.persona
  if (veri.musteri && veri.musteri.musteriler.length === 1) return veri.musteri.musteriler[0].persona
  return 'genel'
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: { soru?: unknown }
  try { body = await req.json() }
  catch { return json({ ok: false, hata: 'Geçersiz JSON' }, 400) }

  const soru = typeof body.soru === 'string' ? body.soru.trim() : ''
  if (!soru) return json({ ok: false, hata: 'Soru boş' }, 400)
  if (soru.length > 600) return json({ ok: false, hata: 'Soru çok uzun' }, 400)

  // 1) Deterministik retrieval — rakamların tek kaynağı
  const veriPaketi = retrieve(soru)

  // 2) Kapsam dışı → n8n'e gitmeden dürüst cevap (tahmin yok)
  if (veriPaketi.intent === 'kapsam_disi') {
    return json({
      ok: true, intent: 'kapsam_disi', bulundu: false,
      cevap: 'Bu veriyi henüz göremiyorum. Stok, kampanya, müşteri veya eşleştirme hakkında sorarsan yardımcı olabilirim.',
    })
  }

  // 3) Birleşik payload
  const payload: N8nAliPayload = {
    soru,
    vertical: VERTICAL,
    persona: personaBelirle(veriPaketi),
    sistemPrompt: buildSystemPrompt(VERTICAL),
    veriPaketi,
  }

  // 4) n8n webhook — yoksa/hata → fallback (panel kırılmaz)
  const url = process.env.N8N_ALI_WEBHOOK_URL
  if (!url) {
    return json({ ok: true, fallback: true, intent: veriPaketi.intent, bulundu: veriPaketi.bulundu, cevap: FALLBACK_CEVAP })
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`n8n ${r.status}`)
    const data = await r.json().catch(() => ({}))
    const cevap = extractCevap(data)
    if (!cevap) throw new Error('n8n boş cevap')
    return json({ ok: true, intent: veriPaketi.intent, bulundu: veriPaketi.bulundu, cevap })
  } catch {
    return json({ ok: true, fallback: true, intent: veriPaketi.intent, bulundu: veriPaketi.bulundu, cevap: FALLBACK_CEVAP })
  } finally {
    clearTimeout(timer)
  }
}

// n8n cevabı farklı anahtarlarla dönebilir — toleranslı çöz
function extractCevap(data: unknown): string | null {
  if (typeof data === 'string') return data.trim() || null
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const k of ['cevap', 'answer', 'text', 'output', 'message', 'reply']) {
      if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim()
    }
  }
  return null
}

function json(payload: AliChatResponse, status = 200): Response {
  return Response.json(payload, { status })
}
