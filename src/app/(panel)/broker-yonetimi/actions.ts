'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getKullanicıProfili } from '@/lib/yetki'
import {
  upsertHighlight,
  deleteHighlight,
  newHighlightId,
  upsertCampaign,
  deleteCampaign,
  newCampaignId,
  updateCommissionStatus,
  COMMISSION_FLOW,
} from '@/lib/broker/store'
import type {
  StockHighlight,
  StockBadge,
  TierVisibility,
  StockFilter,
  Campaign,
  CommissionStatus,
} from '@/lib/broker/types'

const ALL_FILTERS: StockFilter[] = [
  'vatandaslik',
  'yatirim',
  'aile',
  'premium',
  'ofis',
  'otel',
]

async function assertAdmin() {
  const p = await getKullanicıProfili()
  if (!p || (p.rol !== 'admin' && p.rol !== 'yönetici')) redirect('/')
}

export async function saveHighlightAction(formData: FormData) {
  await assertAdmin()

  const id = String(formData.get('id') ?? '').trim() || newHighlightId()
  const why = String(formData.get('whyAdvantaged') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
  const filters = ALL_FILTERS.filter((f) => formData.get(`f_${f}`) === 'on')

  const badgeRaw = String(formData.get('badge') ?? '')
  const badge: StockBadge =
    badgeRaw === 'hot' || badgeRaw === 'premium' ? badgeRaw : null

  const tvRaw = String(formData.get('tierVisibility') ?? 'all')
  const tierVisibility: TierVisibility =
    tvRaw === 'gold' || tvRaw === 'platinum' ? tvRaw : 'all'

  const whyToday = String(formData.get('whyToday') ?? '').trim()

  const h: StockHighlight = {
    id,
    unitRef: String(formData.get('unitRef') ?? '').trim(),
    badge,
    whyAdvantaged: why,
    whyToday: whyToday || undefined, // boşsa undefined → stok kartında satır render edilmez
    fitAudience: String(formData.get('fitAudience') ?? '').trim(),
    filters,
    tierVisibility,
    activeFrom: String(formData.get('activeFrom') ?? '').trim(),
    activeTo: String(formData.get('activeTo') ?? '').trim(),
  }

  upsertHighlight(h)
  revalidatePath('/broker-yonetimi')
  revalidatePath('/broker/stoklar')
  redirect('/broker-yonetimi')
}

export async function deleteHighlightAction(formData: FormData) {
  await assertAdmin()
  const id = String(formData.get('id') ?? '').trim()
  if (id) deleteHighlight(id)
  revalidatePath('/broker-yonetimi')
  revalidatePath('/broker/stoklar')
  redirect('/broker-yonetimi')
}

// ── Kampanya CRUD ────────────────────────────────────────────────────────────
export async function saveCampaignAction(formData: FormData) {
  await assertAdmin()
  const id = String(formData.get('id') ?? '').trim() || newCampaignId()
  const c: Campaign = {
    id,
    kind: String(formData.get('kind') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    body: String(formData.get('body') ?? '').trim(),
    fitAudience: String(formData.get('fitAudience') ?? '').trim(),
    readyMessage: String(formData.get('readyMessage') ?? '').trim(),
    activeFrom: String(formData.get('activeFrom') ?? '').trim(),
    activeTo: String(formData.get('activeTo') ?? '').trim(),
  }
  upsertCampaign(c)
  revalidatePath('/broker-yonetimi')
  revalidatePath('/broker/kampanyalar')
  redirect('/broker-yonetimi')
}

export async function deleteCampaignAction(formData: FormData) {
  await assertAdmin()
  const id = String(formData.get('id') ?? '').trim()
  if (id) deleteCampaign(id)
  revalidatePath('/broker-yonetimi')
  revalidatePath('/broker/kampanyalar')
  redirect('/broker-yonetimi')
}

// ── Komisyon durum güncelleme ────────────────────────────────────────────────
export async function updateCommissionAction(formData: FormData) {
  await assertAdmin()
  const id = String(formData.get('id') ?? '').trim()
  const statusRaw = String(formData.get('status') ?? '')
  const status = (COMMISSION_FLOW as string[]).includes(statusRaw)
    ? (statusRaw as CommissionStatus)
    : null
  if (!id || !status) redirect('/broker-yonetimi')

  const expected = String(formData.get('expectedPaymentDate') ?? '').trim()
  const today = new Date().toISOString().slice(0, 10)
  updateCommissionStatus(id, status, today, expected)

  revalidatePath('/broker-yonetimi')
  revalidatePath('/broker/komisyonlar')
  redirect('/broker-yonetimi')
}
