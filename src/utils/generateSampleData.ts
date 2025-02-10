import { supabase } from '../lib/supabase'

export async function generateSampleData() {
  const today = new Date()
  const sampleData = Array.from({ length: 10 }).map((_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    return {
      date: date.toISOString().split('T')[0],
      usd_php_rate: 56.40 + Math.random() * 0.2,
      dollar_index: 104.40 + Math.random() * 0.2,
      ma_20: 56.35 + Math.random() * 0.1,
      ma_50: 56.30 + Math.random() * 0.1
    }
  })

  const { error } = await supabase
    .from('exchange_rates')
    .insert(sampleData)

  if (error) {
    console.error('Error generating sample data:', error)
    throw error
  }

  console.log('Sample data generated successfully')
} 