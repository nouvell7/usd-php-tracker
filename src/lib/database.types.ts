export interface Database {
  public: {
    Tables: {
      exchange_rates: {
        Row: {
          id: number
          date: string
          usd_php_rate: number
          dollar_index: number | null
          ma_20: number | null
          ma_50: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['exchange_rates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['exchange_rates']['Insert']>
      }
      weekly_stats: {
        Row: {
          id: number
          week_ending: string
          high_rate: number
          low_rate: number
          mid_rate: number
          dollar_gap_ratio: number | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['weekly_stats']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['weekly_stats']['Insert']>
      }
      transactions: {
        Row: {
          id: number
          transaction_date: string
          type: 'BUY' | 'SELL'
          amount_usd: number
          rate: number
          amount_php: number
          profit_loss: number | null
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'amount_php'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
    }
  }
}