import { useEffect, useRef, useState } from 'react'
import { fetchLatestExchangeRate, updateExchangeRate, calculateMovingAverages, updateHistoricalRates } from '../services/exchangeRateService'
import { useQueryClient } from '@tanstack/react-query'

export function useExchangeRateUpdater(intervalMinutes = 60) {
  const queryClient = useQueryClient()
  const intervalRef = useRef<number>()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const updateRate = async () => {
      try {
        if (!isInitialized) {
          // 초기화 시 1년치 데이터 가져오기
          console.log('Fetching historical data...');
          await updateHistoricalRates();
          setIsInitialized(true);
        } else {
          // 이후 실시간 업데이트
          const now = new Date();
          const pht = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
          const hour = pht.getHours();
          
          if (hour >= 9 && hour < 16) {
            console.log('Updating latest rate...');
            const data = await fetchLatestExchangeRate();
            await updateExchangeRate(data);
            await calculateMovingAverages();
          } else {
            console.log('Market is closed. Skipping update.');
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['latestRate'] });
        queryClient.invalidateQueries({ queryKey: ['recentRates'] });
      } catch (error) {
        console.error('Failed to update exchange rate:', error);
      }
    }

    updateRate();

    if (isInitialized) {
      const interval = Math.max(intervalMinutes, 1) * 60 * 1000;
      intervalRef.current = window.setInterval(updateRate, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [intervalMinutes, queryClient, isInitialized]);
} 