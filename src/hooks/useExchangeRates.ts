import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useLatestRate() {
  return useQuery({
    queryKey: ['latestRate'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*, created_at')
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
        .select('*, created_at')
        .gte('date', startDateStr)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching rates:', error);
        throw error;
      }
      
      // 데이터가 없는 날짜는 이전 날짜의 데이터로 채움
      const filledData = [];
      let currentDate = new Date(startDateStr);
      let lastRate = null;
      
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingRate = data?.find(rate => rate.date === dateStr);
        
        if (existingRate) {
          // created_at이 없는 경우 해당 날짜의 마지막 시간으로 설정
          const created = existingRate.created_at 
            ? new Date(existingRate.created_at).toISOString()
            : `${existingRate.date}T23:59:59.999Z`;
          
          filledData.push({
            ...existingRate,
            created_at: created
          });
          lastRate = {
            ...existingRate,
            created_at: created
          };
        } else if (lastRate) {
          const created = `${dateStr}T23:59:59.999Z`; // 채워진 데이터는 해당 날짜의 마지막 시간으로 설정
          filledData.push({
            ...lastRate,
            date: dateStr,
            created_at: created
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log('Processed rates:', filledData);
      return filledData;
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    refetchInterval: 5 * 60 * 1000 // 5분마다 자동 갱신
  });
}