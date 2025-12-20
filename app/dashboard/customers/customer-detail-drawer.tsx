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
const ETIKET_OPTIONS = ['VIP', 'Referans', 'Fiyat Hassas', 'Acil', 'Tekrar Müşteri', 'Uzun Vadeli', 'Hızlı Karar']

interface CustomerDetailDrawerProps {
  customer: any
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CustomerDetailDrawer({ customer, isOpen, onClose, onUpdate }: CustomerDetailDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    ad_soyad: '', telefon: '', email: '', sirket: '', instagram: '',
    asama: 'Yeni', oncelik: '', tahmini_deger: '', kaynak: '',
    sonraki_takip: '', etiketler: [] as string[], notlar: '',
    sektor: '', son_iletisim: '',
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

  const getAsamaStyle = (asama: string) => {
    const styles: Record<string, string> = {
      'Kazanıldı': 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
      'Kaybedildi': 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
      'Pazarlık': 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
      'Teklif': 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
      'İletişim': 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]',
      'Yeni': 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
    }
    return styles[asama] || styles['Yeni']
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const fd = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'etiketler') fd.append(key, JSON.stringify(value))
      else if (value !== undefined) fd.append(key, value.toString())
    })
    const result = await updateCustomer(customer.id, fd)
    setIsSubmitting(false)
    if (result.error) toast({ title: "Hata", description: result.error })
    else { toast({ title: "Başarılı", description: "Müşteri güncellendi." }); onUpdate(); }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteCustomer(customer.id)
    setIsDeleting(false)
    if (result.error) toast({ title: "Hata", description: result.error })
    else { setShowDeleteConfirm(false); onClose(); onUpdate(); }
  }

  const toggleEtiket = (etiket: string) => {
    setFormData(prev => ({
      ...prev,
      etiketler: prev.etiketler.includes(etiket) ? prev.etiketler.filter(e => e !== etiket) : [...prev.etiketler, etiket]
    }))
  }

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      
      <div className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-[#FBFCFD] shadow-2xl z-50 transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="bg-white p-8 border-b border-slate-100 sticky top-0 z-20">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-5 items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                {formData.ad_soyad?.[0] || 'M'}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{formData.ad_soyad}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border shadow-sm ${getAsamaStyle(formData.asama)}`}>
                    {formData.asama}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400">✕</button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-xs" onClick={() => window.open(`https://wa.me/${formData.telefon.replace(/\D/g, '')}`, '_blank')}>📱 WhatsApp</Button>
            <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-xs" onClick={() => window.open(`https://instagram.com/${formData.instagram.replace('@', '')}`, '_blank')}>📸 Instagram</Button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">DEĞER</p>
              <p className="text-2xl font-black text-[#4F46E5]">₺{Number(formData.tahmini_deger || 0).toLocaleString('tr-TR')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">SESSİZ GÜN</p>
              <p className="text-2xl font-black text-slate-700">{(customer as any).sessiz_gun || 0}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Kişisel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600">Ad Soyad</Label>
                <Input className="h-11 rounded-xl border-slate-200 bg-white" value={formData.ad_soyad} onChange={(e) => setFormData(prev => ({ ...prev, ad_soyad: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600">Şirket</Label>
                <Input className="h-11 rounded-xl border-slate-200 bg-white" value={formData.sirket} onChange={(e) => setFormData(prev => ({ ...prev, sirket: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Satış Süreci</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600">Aşama</Label>
                <select value={formData.asama} onChange={(e) => setFormData(prev => ({ ...prev, asama: e.target.value }))} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                  {ASAMA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600">Öncelik</Label>
                <select value={formData.oncelik} onChange={(e) => setFormData(prev => ({ ...prev, oncelik: e.target.value }))} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="">Seçiniz</option>
                  {ONCELIK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Etiketler</Label>
            <div className="flex flex-wrap gap-2">
              {ETIKET_OPTIONS.map(etiket => {
                const isSelected = formData.etiketler.includes(etiket);
                return (
                  <button key={etiket} type="button" onClick={() => toggleEtiket(etiket)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${isSelected ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-md scale-105' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>
                    {etiket} {isSelected && '✓'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 pb-20">
            <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Notlar</Label>
            <textarea value={formData.notlar} onChange={(e) => setFormData(prev => ({ ...prev, notlar: e.target.value }))} rows={5} className="w-full rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 outline-none focus:ring-4 ring-indigo-500/5 transition-all shadow-sm" />
          </div>

        </form>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0">
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600">KAYDI SİL</button>
          <div className="flex gap-4">
            <Button type="button" variant="ghost" className="font-bold text-slate-400 rounded-xl" onClick={onClose}>Vazgeç</Button>
            <Button type="submit" disabled={isSubmitting} onClick={handleSubmit} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white h-12 px-10 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all">
              {isSubmitting ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black text-slate-800 mb-2">Emin misin?</h3>
            <p className="text-slate-500 font-medium mb-8 text-sm">Bu işlem geri alınamaz.</p>
            <div className="flex flex-col gap-3">
              <Button variant="destructive" className="w-full h-12 rounded-xl font-black uppercase text-[10px]" onClick={handleDelete} disabled={isDeleting}>SİL</Button>
              <Button variant="ghost" className="w-full h-12 font-bold text-slate-400" onClick={() => setShowDeleteConfirm(false)}>İPTAL</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}