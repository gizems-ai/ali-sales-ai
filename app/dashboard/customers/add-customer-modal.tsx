'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCustomer } from './actions'
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

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  if (!isOpen) return null

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

    const result = await createCustomer(formDataToSend)

    setIsSubmitting(false)

    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Müşteri eklendi.', 'success')
      setFormData({
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
        etiketler: [],
        notlar: '',
        sektor: '',
        son_iletisim: '',
      })
      onClose()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Müşteri Ekle</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ad Soyad - Zorunlu */}
          <div>
            <Label htmlFor="ad_soyad">Ad Soyad *</Label>
            <Input
              id="ad_soyad"
              value={formData.ad_soyad}
              onChange={(e) => setFormData(prev => ({ ...prev, ad_soyad: e.target.value }))}
              required
              placeholder="Ad Soyad"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefon */}
            <div>
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                placeholder="Telefon"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Şirket */}
            <div>
              <Label htmlFor="sirket">Şirket</Label>
              <Input
                id="sirket"
                value={formData.sirket}
                onChange={(e) => setFormData(prev => ({ ...prev, sirket: e.target.value }))}
                placeholder="Şirket"
              />
            </div>

            {/* Instagram */}
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="Instagram handle"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aşama */}
            <div>
              <Label htmlFor="asama">Aşama</Label>
              <select
                id="asama"
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
              <Label htmlFor="oncelik">Öncelik</Label>
              <select
                id="oncelik"
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
              <Label htmlFor="tahmini_deger">Tahmini Değer (₺)</Label>
              <Input
                id="tahmini_deger"
                type="number"
                value={formData.tahmini_deger}
                onChange={(e) => setFormData(prev => ({ ...prev, tahmini_deger: e.target.value }))}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Kaynak */}
            <div>
              <Label htmlFor="kaynak">Kaynak</Label>
              <select
                id="kaynak"
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
              <Label htmlFor="sonraki_takip">Sonraki Takip</Label>
              <Input
                id="sonraki_takip"
                type="date"
                value={formData.sonraki_takip}
                onChange={(e) => setFormData(prev => ({ ...prev, sonraki_takip: e.target.value }))}
              />
            </div>

            {/* Son İletişim */}
            <div>
              <Label htmlFor="son_iletisim">Son İletişim</Label>
              <Input
                id="son_iletisim"
                type="date"
                value={formData.son_iletisim}
                onChange={(e) => setFormData(prev => ({ ...prev, son_iletisim: e.target.value }))}
              />
            </div>
          </div>

          {/* Sektör */}
          <div>
            <Label htmlFor="sektor">Sektör</Label>
            <select
              id="sektor"
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
            <Label htmlFor="notlar">Notlar</Label>
            <textarea
              id="notlar"
              value={formData.notlar}
              onChange={(e) => setFormData(prev => ({ ...prev, notlar: e.target.value }))}
              placeholder="Notlar"
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


