'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Customer {
  id: string
  ad_soyad: string
  telefon?: string
  email?: string
  sirket?: string
  instagram?: string
  asama: string
  oncelik?: string
  tahmini_deger?: number
  kaynak?: string
  sonraki_takip?: string
  etiketler?: string[]
  notlar?: string
  sektor?: string
  sessiz_gun?: number
  takip_ne_zaman?: string
  son_iletisim?: string
  user_id: string
  created_at: string
  updated_at: string
}

export async function getCustomers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return []
    }

    return (data || []).map((customer: any) => ({
      id: customer.id,
      ad_soyad: customer.ad_soyad || customer.name || '',
      telefon: customer.telefon || customer.phone || '',
      email: customer.email || '',
      sirket: customer.sirket || customer.company || '',
      instagram: customer.instagram || '',
      asama: customer.asama || customer.stage || customer.status || 'Yeni',
      oncelik: customer.oncelik || customer.priority || '',
      tahmini_deger: customer.tahmini_deger || customer.estimated_value || customer.deal_amount || 0,
      kaynak: customer.kaynak || customer.source || '',
      sonraki_takip: customer.sonraki_takip || customer.next_follow_up || '',
      etiketler: customer.etiketler || customer.tags || [],
      notlar: customer.notlar || customer.notes || '',
      sektor: customer.sektor || customer.sector || '',
      sessiz_gun: customer.sessiz_gun || null,
      takip_ne_zaman: customer.takip_ne_zaman || customer.follow_up_when || null,
      son_iletisim: customer.son_iletisim || customer.last_contact || null,
      user_id: customer.user_id,
      created_at: customer.created_at,
      updated_at: customer.updated_at || customer.created_at,
    }))
  } catch (error) {
    console.error('Error fetching customers:', error)
    return []
  }
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Yetkisiz erişim' }
  }

  const ad_soyad = formData.get('ad_soyad') as string
  if (!ad_soyad || ad_soyad.trim() === '') {
    return { error: 'Ad Soyad zorunlu' }
  }

  try {
    const customerData: any = {
      user_id: user.id,
      ad_soyad: ad_soyad.trim(),
      telefon: formData.get('telefon')?.toString().trim() || null,
      email: formData.get('email')?.toString().trim() || null,
      sirket: formData.get('sirket')?.toString().trim() || null,
      instagram: formData.get('instagram')?.toString().trim() || null,
      asama: formData.get('asama')?.toString() || 'Yeni',
      oncelik: formData.get('oncelik')?.toString() || null,
      tahmini_deger: formData.get('tahmini_deger') ? parseFloat(formData.get('tahmini_deger') as string) : null,
      kaynak: formData.get('kaynak')?.toString() || null,
      sonraki_takip: formData.get('sonraki_takip')?.toString() || null,
      etiketler: formData.get('etiketler') ? JSON.parse(formData.get('etiketler') as string) : [],
      notlar: formData.get('notlar')?.toString().trim() || null,
      sektor: formData.get('sektor')?.toString() || null,
      son_iletisim: formData.get('son_iletisim')?.toString() || null,
    }

    // Email validation
    if (customerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      return { error: 'Geçerli bir e-posta gir' }
    }

    const { error } = await supabase
      .from('customers')
      .insert(customerData)

    if (error) {
      console.error('Error creating customer:', error)
      return { error: 'Kaydetme başarısız. Tekrar dener misin?' }
    }

    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { error: 'Kaydetme başarısız. Tekrar dener misin?' }
  }
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Yetkisiz erişim' }
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    const fields = [
      'ad_soyad', 'telefon', 'email', 'sirket', 'instagram', 'asama', 'oncelik',
      'tahmini_deger', 'kaynak', 'sonraki_takip', 'etiketler', 'notlar', 'sektor', 'son_iletisim'
    ]

    fields.forEach(field => {
      const value = formData.get(field)
      if (value !== null) {
        if (field === 'tahmini_deger') {
          updateData[field] = value ? parseFloat(value as string) : null
        } else if (field === 'etiketler') {
          updateData[field] = value ? JSON.parse(value as string) : []
        } else {
          updateData[field] = value?.toString().trim() || null
        }
      }
    })

    // Email validation
    if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      return { error: 'Geçerli bir e-posta gir' }
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating customer:', error)
      return { error: 'Kaydetme başarısız. Tekrar dener misin?' }
    }

    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { error: 'Kaydetme başarısız. Tekrar dener misin?' }
  }
}

export async function deleteCustomer(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Yetkisiz erişim' }
  }

  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting customer:', error)
      return { error: 'Silme başarısız. Tekrar dener misin?' }
    }

    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return { error: 'Silme başarısız. Tekrar dener misin?' }
  }
}



