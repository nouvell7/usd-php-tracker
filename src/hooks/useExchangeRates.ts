import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useLatestRate() {
  return useQuery({
    queryKey: ['latestRate'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    refetchInterval: 5 * 60 * 1000 // 5분마다 자동 갱신
  });
}

export function useRecentRates(days = 30) {
  return useQuery({
    queryKey: ['recentRates', days],
    queryFn: async () => {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      console.log('Fetching recent rates...', { startDate: startDateStr, endDate });
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No data found in the specified date range');
      }

      console.log('Fetched rates:', data);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });
}