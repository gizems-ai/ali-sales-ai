'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Customer, updateCustomer, deleteCustomer } from './actions'
import { toast } from '@/components/ui/toast'

const ASAMA_OPTIONS = ['Yeni', 'İletişim', 'Teklif', 'Pazarlık', 'Kazanıldı', 'Kaybedildi']
const ONCELIK_OPTIONS = ['Sıcak🔥', 'Ilık🟡', 'Soğuk❄️']
const KAYNAK_OPTIONS = ['WhatsApp📱', 'Instagram📸', 'Referans', 'Web🌐', 'Telefon☎️', 'Diğer']
const SEKTOR_OPTIONS = [
  '🏢 Teknoloji',
  '🏭 Üretim',
  '🛒 Perakende',
  '🏥 Sağlık',
  '🎓 Eğitim',
  '🍽️ Gıda',
  '🏗️ İnşaat',
  '🚗 Otomotiv',
  '💼 Danışmanlık',
  '🎨 Tasarım',
  '📱 Dijital',
  '🌍 Diğer'
]

const ETIKET_OPTIONS = ['VIP', 'Referans', 'Fiyat Hassas', 'Acil', 'Tekrar Müşteri', 'Uzun Vadeli', 'Hızlı Karar']

interface CustomerDetailDrawerProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CustomerDetailDrawer({ customer, isOpen, onClose, onUpdate }: CustomerDetailDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    ad_soyad: '',
    telefon: '',
    email: '',
    sirket: '',
    instagram: '',
    asama: 'Yeni',
    oncelik: '',
    tahmini_deger: '',
    kaynak: '',
    sonraki_takip: '',
    etiketler: [] as string[],
    notlar: '',
    sektor: '',
    son_iletisim: '',
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        ad_soyad: customer.ad_soyad || '',
        telefon: customer.telefon || '',
        email: customer.email || '',
        sirket: customer.sirket || '',
        instagram: customer.instagram || '',
        asama: customer.asama || 'Yeni',
        oncelik: customer.oncelik || '',
        tahmini_deger: customer.tahmini_deger?.toString() || '',
        kaynak: customer.kaynak || '',
        sonraki_takip: customer.sonraki_takip ? customer.sonraki_takip.split('T')[0] : '',
        etiketler: customer.etiketler || [],
        notlar: customer.notlar || '',
        sektor: customer.sektor || '',
        son_iletisim: customer.son_iletisim ? customer.son_iletisim.split('T')[0] : '',
      })
    }
  }, [customer])

  if (!isOpen || !customer) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formDataToSend = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'etiketler') {
        formDataToSend.append(key, JSON.stringify(value))
      } else if (value) {
        formDataToSend.append(key, value.toString())
      }
    })

    const result = await updateCustomer(customer.id, formDataToSend)

    setIsSubmitting(false)

    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Değişiklikler kaydedildi.', 'success')
      onUpdate()
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteCustomer(customer.id)
    setIsDeleting(false)

    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Müşteri silindi.', 'success')
      setShowDeleteConfirm(false)
      onClose()
      onUpdate()
    }
  }

  const toggleEtiket = (etiket: string) => {
    setFormData(prev => ({
      ...prev,
      etiketler: prev.etiketler.includes(etiket)
        ? prev.etiketler.filter(e => e !== etiket)
        : [...prev.etiketler, etiket]
    }))
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return null
    }
  }

  const calculateSessizGun = () => {
    if (!customer.son_iletisim) return null
    try {
      const lastContact = new Date(customer.son_iletisim)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return null
    }
  }

  const sessizGun = customer.sessiz_gun ?? calculateSessizGun()

  const whatsappLink = customer.telefon
    ? `https://wa.me/${customer.telefon.replace(/\D/g, '')}`
    : null

  const instagramLink = customer.instagram
    ? `https://instagram.com/${customer.instagram.replace('@', '')}`
    : null

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{customer.ad_soyad}</h2>
              {customer.sirket && (
                <p className="text-gray-600 mt-1">{customer.sirket}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Hızlı Aksiyonlar */}
          <div className="flex gap-2 mt-4">
            {whatsappLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(whatsappLink, '_blank')}
              >
                📱 WhatsApp'tan Yaz
              </Button>
            )}
            {instagramLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(instagramLink, '_blank')}
              >
                📸 Instagram'a Git
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Bilgi Kartları */}
          <div className="grid grid-cols-2 gap-4">
            {sessizGun !== null && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Sessiz Gün</p>
                <p className="text-lg font-semibold text-gray-900">{sessizGun} gün</p>
              </div>
            )}
            {customer.tahmini_deger && customer.tahmini_deger > 0 && (
              <div className="bg-cyan-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Tahmini Değer</p>
                <p className="text-lg font-semibold text-cyan-900">
                  {customer.tahmini_deger.toLocaleString('tr-TR')} ₺
                </p>
              </div>
            )}
          </div>

          {/* Ad Soyad */}
          <div>
            <Label htmlFor="drawer_ad_soyad">Ad Soyad</Label>
            <Input
              id="drawer_ad_soyad"
              value={formData.ad_soyad}
              onChange={(e) => setFormData(prev => ({ ...prev, ad_soyad: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefon */}
            <div>
              <Label htmlFor="drawer_telefon">Telefon</Label>
              <Input
                id="drawer_telefon"
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="drawer_email">Email</Label>
              <Input
                id="drawer_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Şirket */}
            <div>
              <Label htmlFor="drawer_sirket">Şirket</Label>
              <Input
                id="drawer_sirket"
                value={formData.sirket}
                onChange={(e) => setFormData(prev => ({ ...prev, sirket: e.target.value }))}
              />
            </div>

            {/* Instagram */}
            <div>
              <Label htmlFor="drawer_instagram">Instagram</Label>
              <Input
                id="drawer_instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aşama */}
            <div>
              <Label htmlFor="drawer_asama">Aşama</Label>
              <select
                id="drawer_asama"
                value={formData.asama}
                onChange={(e) => setFormData(prev => ({ ...prev, asama: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {ASAMA_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Öncelik */}
            <div>
              <Label htmlFor="drawer_oncelik">Öncelik</Label>
              <select
                id="drawer_oncelik"
                value={formData.oncelik}
                onChange={(e) => setFormData(prev => ({ ...prev, oncelik: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Seçiniz</option>
                {ONCELIK_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tahmini Değer */}
            <div>
              <Label htmlFor="drawer_tahmini_deger">Tahmini Değer (₺)</Label>
              <Input
                id="drawer_tahmini_deger"
                type="number"
                value={formData.tahmini_deger}
                onChange={(e) => setFormData(prev => ({ ...prev, tahmini_deger: e.target.value }))}
                min="0"
                step="0.01"
              />
            </div>

            {/* Kaynak */}
            <div>
              <Label htmlFor="drawer_kaynak">Kaynak</Label>
              <select
                id="drawer_kaynak"
                value={formData.kaynak}
                onChange={(e) => setFormData(prev => ({ ...prev, kaynak: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Seçiniz</option>
                {KAYNAK_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sonraki Takip */}
            <div>
              <Label htmlFor="drawer_sonraki_takip">Sonraki Takip</Label>
              <Input
                id="drawer_sonraki_takip"
                type="date"
                value={formData.sonraki_takip}
                onChange={(e) => setFormData(prev => ({ ...prev, sonraki_takip: e.target.value }))}
              />
            </div>

            {/* Son İletişim */}
            <div>
              <Label htmlFor="drawer_son_iletisim">Son İletişim</Label>
              <Input
                id="drawer_son_iletisim"
                type="date"
                value={formData.son_iletisim}
                onChange={(e) => setFormData(prev => ({ ...prev, son_iletisim: e.target.value }))}
              />
            </div>
          </div>

          {/* Sektör */}
          <div>
            <Label htmlFor="drawer_sektor">Sektör</Label>
            <select
              id="drawer_sektor"
              value={formData.sektor}
              onChange={(e) => setFormData(prev => ({ ...prev, sektor: e.target.value }))}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Seçiniz</option>
              {SEKTOR_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Etiketler */}
          <div>
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ETIKET_OPTIONS.map(etiket => (
                <button
                  key={etiket}
                  type="button"
                  onClick={() => toggleEtiket(etiket)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.etiketler.includes(etiket)
                      ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {etiket}
                </button>
              ))}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <Label htmlFor="drawer_notlar">Notlar</Label>
            <textarea
              id="drawer_notlar"
              value={formData.notlar}
              onChange={(e) => setFormData(prev => ({ ...prev, notlar: e.target.value }))}
              rows={6}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {/* Alt Bilgi */}
          <div className="pt-4 border-t text-sm text-gray-500">
            <p>Oluşturma Tarihi: {formatDate(customer.created_at) || 'Bilinmiyor'}</p>
            {customer.updated_at !== customer.created_at && (
              <p className="mt-1">Son Güncelleme: {formatDate(customer.updated_at) || 'Bilinmiyor'}</p>
            )}
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Sil
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Silme Onay Diyaloğu */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Müşteriyi Sil</h3>
            <p className="text-gray-600 mb-6">
              Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



