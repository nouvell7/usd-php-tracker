import { supabase } from '../lib/supabase'

export interface RateAlert {
  id: number
  target_rate: number
  type: "ABOVE" | "BELOW"
  user_id: string
  is_active: boolean
}

export async function getUserAlerts() {
  const { data, error } = await supabase
    .from('rate_alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createAlert(alert: Omit<RateAlert, 'id'>) {
  const { data, error } = await supabase
    .from('rate_alerts')
    .insert(alert)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAlert(id: number, is_active: boolean) {
  const { data, error } = await supabase
    .from('rate_alerts')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAlert(id: number) {
  const { error } = await supabase
    .from('rate_alerts')
    .delete()
    .eq('id', id)

  if (error) throw error
} 