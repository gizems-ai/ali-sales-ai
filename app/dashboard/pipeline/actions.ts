'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Customer {
  id: string
  ad_soyad: string
  telefon?: string
  email?: string
  sirket?: string
  asama: string
  oncelik?: string
  tahmini_deger?: number
  kaynak?: string
  sonraki_takip?: string
  etiketler?: string[]
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

    // Map database fields to our interface
    return (data || []).map((customer: any) => ({
      id: customer.id,
      ad_soyad: customer.ad_soyad || customer.name || '',
      telefon: customer.telefon || customer.phone || '',
      email: customer.email || '',
      sirket: customer.sirket || customer.company || '',
      asama: customer.asama || customer.stage || customer.status || 'Yeni',
      oncelik: customer.oncelik || customer.priority || '',
      tahmini_deger: customer.tahmini_deger || customer.estimated_value || customer.deal_amount || 0,
      kaynak: customer.kaynak || customer.source || '',
      sonraki_takip: customer.sonraki_takip || customer.next_follow_up || '',
      etiketler: customer.etiketler || customer.tags || [],
      user_id: customer.user_id,
      created_at: customer.created_at,
      updated_at: customer.updated_at || customer.created_at,
    }))
  } catch (error) {
    console.error('Error fetching customers:', error)
    return []
  }
}

export async function updateCustomerStage(customerId: string, newStage: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Yetkisiz erişim' }
  }

  try {
    // Update the customer stage
    // Try both field names for compatibility
    const updateData: any = {
      asama: newStage,
      stage: newStage,
      status: newStage,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating customer stage:', error)
      return { error: 'Taşıma başarısız. Tekrar dener misin?' }
    }

    revalidatePath('/dashboard/pipeline')
    return { success: true }
  } catch (error) {
    console.error('Error updating customer stage:', error)
    return { error: 'Taşıma başarısız. Tekrar dener misin?' }
  }
}



