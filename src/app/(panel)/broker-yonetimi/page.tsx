import { redirect } from 'next/navigation'
import { getKullanicıProfili } from '@/lib/yetki'
import {
  listHighlights,
  listBrokers,
  getHighlight,
  listCampaigns,
  getCampaign,
  listCommissions,
  COMMISSION_FLOW,
  rsvpBrokers,
  INVITE_CODE,
} from '@/lib/broker/store'
import { getUnit, formatUSD, formatTRY } from '@/lib/broker/stok'
import { EVENTS } from '@/lib/broker/fixtures'
import {
  TIER_LABEL,
  type StockFilter,
  type CommissionStatus,
} from '@/lib/broker/types'
import {
  saveHighlightAction,
  deleteHighlightAction,
  saveCampaignAction,
  deleteCampaignAction,
  updateCommissionAction,
} from './actions'

const STATUS_LABEL: Record<CommissionStatus, string> = {
  sale: 'Satış',
  deposit_received: 'Kapora geldi',
  earned: 'Komisyon hak edildi',
  in_finance: 'Finansta',
  payment_scheduled: 'Ödeme planlandı',
  paid: 'Ödendi',
}

const FILTER_LABEL: Record<StockFilter, string> = {
  vatandaslik: 'Vatandaşlık',
  yatirim: 'Yatırım',
  aile: 'Aile',
  premium: 'Premium',
  ofis: 'Ofis',
  otel: 'Otel',
}
const ALL_FILTERS = Object.keys(FILTER_LABEL) as StockFilter[]

export default async function BrokerYonetimi({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; editCampaign?: string }>
}) {
  const profil = await getKullanicıProfili()
  if (!profil || (profil.rol !== 'admin' && profil.rol !== 'yönetici')) {
    redirect('/')
  }

  const sp = await searchParams
  const editing = sp.edit ? getHighlight(sp.edit) : undefined
  const editingCampaign = sp.editCampaign ? getCampaign(sp.editCampaign) : undefined
  const highlights = listHighlights()
  const brokers = listBrokers()
  const campaigns = listCampaigns()
  const commissions = listCommissions()
  const brokerAd = (id: string) =>
    brokers.find((b) => b.id === id)?.name ?? id

  const inp =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-slate-400'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          Broker Yönetimi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Avantajlı stok kartlarını yönet, broker listesini gör. Değişiklikler
          broker platformuna anında yansır. Davet kodu:{' '}
          <span className="font-mono font-semibold text-slate-700">{INVITE_CODE}</span>
        </p>
      </div>

      {/* ── StockHighlight formu ── */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">
          {editing ? 'Öne çıkan stoğu düzenle' : 'Yeni öne çıkan stok'}
        </h2>
        <form action={saveHighlightAction} className="space-y-4">
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={lbl}>Ünite referansı (ör. B-20)</label>
              <input
                name="unitRef"
                defaultValue={editing?.unitRef ?? ''}
                placeholder="B-20"
                className={inp}
                required
              />
            </div>
            <div>
              <label className={lbl}>Rozet</label>
              <select name="badge" defaultValue={editing?.badge ?? ''} className={inp}>
                <option value="">— yok —</option>
                <option value="hot">🔥 Sıcak (hot)</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Kademe görünürlüğü</label>
              <select
                name="tierVisibility"
                defaultValue={editing?.tierVisibility ?? 'all'}
                className={inp}
              >
                <option value="all">Tümü</option>
                <option value="gold">Gold ve üstü</option>
                <option value="platinum">Yalnız Platinum</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>
              Neden avantajlı (satır başına 1 madde, en fazla 3)
            </label>
            <textarea
              name="whyAdvantaged"
              defaultValue={editing?.whyAdvantaged.join('\n') ?? ''}
              rows={3}
              placeholder={'Vatandaşlık eşiğine uygun\n48 saatte komisyon\n%10 peşinatla başlıyor'}
              className={inp}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>
                Neden bugün (opsiyonel — boşsa kartta gösterilmez)
              </label>
              <input
                name="whyToday"
                defaultValue={editing?.whyToday ?? ''}
                placeholder="Bu koşulla son 3 ünite"
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Kime uygun</label>
              <input
                name="fitAudience"
                defaultValue={editing?.fitAudience ?? ''}
                placeholder="Kime uygun: vatandaşlık hedefli müşteri"
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Filtreler</label>
            <div className="flex flex-wrap gap-3">
              {ALL_FILTERS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name={`f_${f}`}
                    defaultChecked={editing?.filters.includes(f) ?? false}
                  />
                  {FILTER_LABEL[f]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Aktif başlangıç</label>
              <input
                type="date"
                name="activeFrom"
                defaultValue={editing?.activeFrom ?? ''}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Aktif bitiş</label>
              <input
                type="date"
                name="activeTo"
                defaultValue={editing?.activeTo ?? ''}
                className={inp}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
            >
              {editing ? 'Güncelle' : 'Ekle'}
            </button>
            {editing && (
              <a href="/broker-yonetimi" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                İptal
              </a>
            )}
          </div>
        </form>
      </section>

      {/* ── Mevcut öne çıkanlar ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-800">
          Öne çıkan stoklar ({highlights.length})
        </h2>
        <div className="space-y-2">
          {highlights.map((h) => {
            const u = getUnit(h.unitRef)
            return (
              <div
                key={h.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{h.unitRef}</span>
                    {u && (
                      <span className="text-xs text-gray-400">
                        {u.proje} · {u.tip} · {formatUSD(u.fiyatUSD)}
                      </span>
                    )}
                    {h.badge && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {h.badge}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {h.tierVisibility}
                    </span>
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {h.fitAudience}
                    {h.whyToday ? ` · ⏳ ${h.whyToday}` : ''}
                  </div>
                </div>
                <a
                  href={`/broker-yonetimi?edit=${h.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400"
                >
                  Düzenle
                </a>
                <form action={deleteHighlightAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
                  >
                    Sil
                  </button>
                </form>
              </div>
            )
          })}
          {highlights.length === 0 && (
            <p className="text-sm text-gray-400">Henüz öne çıkan stok yok.</p>
          )}
        </div>
      </section>

      {/* ── Komisyon durum güncelleme ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-800">
          Komisyon durumları ({commissions.length})
        </h2>
        <p className="mb-3 text-xs text-gray-400">
          Durum değişikliği geçmişe (history) yazılır. SarpNet Faz 2’de
          finans→ödeme→ödendi adımlarını besleyecek.
        </p>
        <div className="space-y-2">
          {commissions.map((c) => (
            <form
              key={c.id}
              action={updateCommissionAction}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <input type="hidden" name="id" value={c.id} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">{c.unitLabel}</div>
                <div className="text-xs text-gray-400">
                  {brokerAd(c.brokerId)} · {c.customerInitials} · {formatTRY(c.amountTRY)}
                </div>
              </div>
              <div>
                <label className={lbl}>Durum</label>
                <select name="status" defaultValue={c.status} className={inp}>
                  {COMMISSION_FLOW.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Tahmini ödeme</label>
                <input
                  type="date"
                  name="expectedPaymentDate"
                  defaultValue={c.expectedPaymentDate ?? ''}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Kaydet
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* ── Kampanya CRUD ── */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">
          {editingCampaign ? 'Kampanyayı düzenle' : 'Yeni kampanya'}
        </h2>
        <form action={saveCampaignAction} className="space-y-4">
          <input type="hidden" name="id" value={editingCampaign?.id ?? ''} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Etiket (kind)</label>
              <input name="kind" defaultValue={editingCampaign?.kind ?? ''} placeholder="Varlık rotasyonu" className={inp} />
            </div>
            <div>
              <label className={lbl}>Başlık</label>
              <input name="title" defaultValue={editingCampaign?.title ?? ''} placeholder="Altınını Getir" className={inp} required />
            </div>
          </div>
          <div>
            <label className={lbl}>Gövde</label>
            <textarea name="body" defaultValue={editingCampaign?.body ?? ''} rows={2} className={inp} />
          </div>
          <div>
            <label className={lbl}>Kime uygun</label>
            <input name="fitAudience" defaultValue={editingCampaign?.fitAudience ?? ''} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hazır mesaj (broker ağzından, WhatsApp)</label>
            <textarea name="readyMessage" defaultValue={editingCampaign?.readyMessage ?? ''} rows={3} className={inp} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Aktif başlangıç</label>
              <input type="date" name="activeFrom" defaultValue={editingCampaign?.activeFrom ?? ''} className={inp} />
            </div>
            <div>
              <label className={lbl}>Aktif bitiş</label>
              <input type="date" name="activeTo" defaultValue={editingCampaign?.activeTo ?? ''} className={inp} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
              {editingCampaign ? 'Güncelle' : 'Ekle'}
            </button>
            {editingCampaign && (
              <a href="/broker-yonetimi" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                İptal
              </a>
            )}
          </div>
        </form>

        <div className="mt-5 space-y-2 border-t border-gray-100 pt-5">
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800">{c.title}</span>
                <span className="ml-2 text-xs text-gray-400">{c.kind}</span>
                <div className="truncate text-xs text-gray-500">{c.fitAudience}</div>
              </div>
              <a
                href={`/broker-yonetimi?editCampaign=${c.id}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400"
              >
                Düzenle
              </a>
              <form action={deleteCampaignAction}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300">
                  Sil
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ── Etkinlik RSVP listesi ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-800">Etkinlik katılımları</h2>
        <div className="space-y-3">
          {EVENTS.map((e) => {
            const gelenler = rsvpBrokers(e.id)
            return (
              <div key={e.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-slate-800">{e.title}</span>
                  <span className="text-xs font-semibold text-gray-400">
                    {gelenler.length} kayıt
                  </span>
                </div>
                {gelenler.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {gelenler.map((b) => (
                      <span key={b.id} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                        {b.name} · {b.agency}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Henüz kayıt yok.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Broker listesi ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-800">
          Broker listesi ({brokers.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3 font-bold">Ad</th>
                <th className="px-4 py-3 font-bold">Acente</th>
                <th className="px-4 py-3 font-bold">Telefon</th>
                <th className="px-4 py-3 font-bold">Kademe</th>
                <th className="px-4 py-3 text-right font-bold">Dönem satışı</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((b) => (
                <tr key={b.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500">{b.agency}</td>
                  <td className="px-4 py-3 text-gray-500">{b.phone}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      {TIER_LABEL[b.tier]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{b.periodSales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
