import { useState, useMemo, useEffect } from 'react'
import { useRecentRates } from '../hooks/useExchangeRates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { updateMissingRates } from '../services/exchangeRateService'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type Period = '1D' | '1W' | '2W' | '1M' | '3M' | '6M' | '1Y'

const formatDateWithTime = (date: Date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInHours = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago (${targetDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    })})`;
  }
  
  return targetDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const periods: { label: string; value: Period }[] = [
  { label: 'Today', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '2W', value: '2W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
]

export default function RateHistory() {
  const [period, setPeriod] = useState<Period>('1W')
  const { data: rates, isLoading, error } = useRecentRates(365)
  const queryClient = useQueryClient()

  console.log('RateHistory render:', { rates, isLoading, error });  // 컴포넌트 상태 로깅

  const filteredRates = useMemo(() => {
    if (!rates) {
      console.log('No rates data available');
      return [];
    }
    
    console.log('Filtering rates:', rates);  // 데이터 로깅 추가
    
    const today = new Date()
    const periodStartDate = new Date(today)
    
    switch (period) {
      case '1D':
        periodStartDate.setDate(today.getDate() - 1)
        break
      case '1W':
        periodStartDate.setDate(today.getDate() - 7)
        break
      case '2W':
        periodStartDate.setDate(today.getDate() - 14)
        break
      case '1M':
        periodStartDate.setMonth(today.getMonth() - 1)
        break
      case '3M':
        periodStartDate.setMonth(today.getMonth() - 3)
        break
      case '6M':
        periodStartDate.setMonth(today.getMonth() - 6)
        break
      case '1Y':
        periodStartDate.setFullYear(today.getFullYear() - 1)
        break
    }

    const filtered = rates
      .filter(rate => new Date(rate.date) >= periodStartDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    console.log('Filtered rates:', filtered);  // 필터링된 데이터 로깅
    return filtered;
  }, [rates, period])

  const stats = useMemo(() => {
    if (!filteredRates.length) return null

    return {
      high: Math.max(...filteredRates.map(r => r.usd_php_rate)),
      low: Math.min(...filteredRates.map(r => r.usd_php_rate)),
      avg: filteredRates.reduce((sum, r) => sum + r.usd_php_rate, 0) / filteredRates.length,
      current: filteredRates[filteredRates.length - 1].usd_php_rate,
      change: filteredRates[filteredRates.length - 1].usd_php_rate - filteredRates[0].usd_php_rate,
    }
  }, [filteredRates])

  const lastUpdate = useMemo(() => {
    if (!filteredRates.length) return null;
    const lastRate = filteredRates[filteredRates.length - 1];
    const today = new Date().toISOString().split('T')[0];
    const rateDate = new Date(lastRate.date);
    const isToday = lastRate.date === today;
    
    // created_at이 있는 경우 그대로 사용, 없는 경우 해당 날짜의 마지막 시간 사용
    const updateTime = lastRate.created_at 
      ? new Date(lastRate.created_at)
      : new Date(`${lastRate.date}T23:59:59.999Z`);

    return {
      date: updateTime,
      displayDate: rateDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      isToday,
      hasCreatedAt: !!lastRate.created_at
    };
  }, [filteredRates]);

  useEffect(() => {
    // 세션 체크를 async 함수로 분리
    const checkSessionAndUpdate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const rates = await updateMissingRates();
          console.log('Missing rates updated successfully:', rates);
          queryClient.invalidateQueries({ queryKey: ['recentRates'] });
        } catch (error: any) {  // 타입 명시
          console.error('Failed to update missing rates:', error);
          // 인증 오류는 무시 (일반 사용자는 조회만 가능)
          if (error?.message !== 'Authentication required') {
            // 다른 오류는 표시
            console.error('Error:', error);
          }
        }
      }
    };

    // 세션 체크 및 업데이트 실행
    checkSessionAndUpdate();
  }, [queryClient]);

  useEffect(() => {
    console.log('Current rates data:', rates);  // rates 데이터 변경 시 로깅
  }, [rates]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="text-red-600">Error loading data: {error.message}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Exchange Rate History</h2>
              {lastUpdate && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">
                      Rate as of: <span className="font-medium">{lastUpdate.displayDate}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Last updated: {formatDateWithTime(lastUpdate.date)}
                    </span>
                  </div>
                  {!lastUpdate.isToday && (
                    <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                      Today's rate not available yet
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {periods.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    period === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">Current</p>
                <p className="text-lg sm:text-xl font-semibold">₱{stats.current.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">High</p>
                <p className="text-lg sm:text-xl font-semibold text-green-600">₱{stats.high.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">Low</p>
                <p className="text-lg sm:text-xl font-semibold text-red-600">₱{stats.low.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">Average</p>
                <p className="text-lg sm:text-xl font-semibold">₱{stats.avg.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">Change</p>
                <p className={`text-lg sm:text-xl font-semibold ${
                  stats.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.change > 0 ? '+' : ''}{stats.change.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredRates} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date)
                    return d.toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      ...(period === '1Y' && { year: '2-digit' })
                    }).replace(/\//g, '-')
                  }}
                  height={50}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(4)}
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(dateStr) => {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const isToday = date.toDateString() === today.toDateString();
                    const rate = filteredRates.find(r => r.date === dateStr);
                    
                    const formattedDate = date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });

                    if (isToday) {
                      return `${formattedDate} (Not yet updated)`;
                    }

                    // created_at이 있는 경우 그대로 사용, 없는 경우 해당 날짜의 마지막 시간 사용
                    const updateTime = rate?.created_at 
                      ? new Date(rate.created_at)
                      : new Date(`${dateStr}T23:59:59.999Z`);

                    const formattedTime = updateTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });

                    return `${formattedDate} ${formattedTime}`;
                  }}
                  formatter={(value: number) => [`₱${value.toFixed(4)}`, 'USD/PHP Rate']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    padding: '0.75rem'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="usd_php_rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={period === '1D'}
                />
                <Line
                  type="monotone"
                  dataKey="ma_20"
                  stroke="#7c3aed"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
} 