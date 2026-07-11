// ════════════════════════════════════════════════════════════════════════════
//  Ali Persona — core + dikey + YAPMA listesi birleştirici
//  n8n'e giden payload'da sistem promptu TEK metin olarak birleşik gönderilir.
//  Dosyalar ayrı durur (okunabilirlik + Sigortan'a kopyalanabilirlik).
// ════════════════════════════════════════════════════════════════════════════

import { ALI_CORE } from './core'
import { ALI_EMLAK } from './emlak'

export type Vertical = 'emlak' | 'sigorta'

// Tüm dikeylerde geçerli YAPMA listesi (guardrail — prompt'un sonunda vurgulanır)
const YAPMA = `# YAPMA (kesin sınırlar)
- Veri paketinde olmayan rakam, skor, oran, tahmin, alternatif senaryo ÜRETME.
- İndirim/fiyat düşüşü kendiliğinden ÖNERME (yukarıdaki indirim yasağına uy).
- Ham sayısal skoru kullanıcıya gösterme; editöryel ifade kullan.
- Emin değilsen uydurma: "bu veriyi henüz göremiyorum" de.
- İngilizce jargon kullanma.
- Cevabı kısa tut; satışçıyı bir sonraki somut aksiyona yönlendirerek bitir.`

const VERTICAL_METIN: Record<Vertical, string> = {
  emlak: ALI_EMLAK,
  sigorta: '', // Bu projede kullanılmaz — şablon yapısı hazır (sigorta.ts eklenir).
}

// Birleşik sistem promptu: core + dikey + YAPMA
export function buildSystemPrompt(vertical: Vertical): string {
  return [ALI_CORE, VERTICAL_METIN[vertical], YAPMA].filter(Boolean).join('\n\n')
}
