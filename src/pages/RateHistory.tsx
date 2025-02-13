import { useState, useMemo, useEffect } from 'react'
import { useRecentRates } from '../hooks/useExchangeRates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { updateMissingRates, updateLatestRates } from '../services/exchangeRateService'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

type Period = '1D' | '1W' | '2W' | '1M' | '3M' | '6M' | '1Y' | 'custom'

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
  const [isUpdating, setIsUpdating] = useState(false)

  console.log('RateHistory render:', { rates, isLoading, error });  // 컴포넌트 상태 로깅

  const filteredRates = useMemo(() => {
    if (!rates) {
      console.log('No rates data available');
      return [];
    }
    
    console.log('Raw rates data:', JSON.stringify(rates, null, 2));  // 전체 데이터 상세 로깅
    
    // 현재 날짜를 UTC 기준으로 설정
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setUTCHours(0, 0, 0, 0);
    
    // 시작 날짜도 현재 날짜 기준으로 설정
    const periodStartDate = new Date(today);
    
    switch (period) {
      case '1D':
        periodStartDate.setDate(periodStartDate.getDate() - 1)
        break
      case '1W':
        periodStartDate.setDate(periodStartDate.getDate() - 7)
        break
      case '2W':
        periodStartDate.setDate(periodStartDate.getDate() - 14)
        break
      case '1M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 1)
        break
      case '3M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 3)
        break
      case '6M':
        periodStartDate.setMonth(periodStartDate.getMonth() - 6)
        break
      case '1Y':
        periodStartDate.setFullYear(periodStartDate.getFullYear() - 1)
        break
    }

    console.log('Date range:', {
      now: now.toISOString(),
      today: today.toISOString(),
      periodStart: periodStartDate.toISOString(),
      period
    });

    const filtered = rates
      .filter(rate => {
        const rateDate = new Date(rate.date);
        const isInRange = rateDate >= periodStartDate;
        if (rate.date === '2025-02-13') {
          console.log('2025-02-13 rate:', rate);  // 2월 13일 데이터 특별 로깅
        }
        return isInRange;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('Filtered and sorted rates:', JSON.stringify(filtered, null, 2));
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
      dollarIndex: filteredRates[filteredRates.length - 1].dollar_index,
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

  const handleUpdateRates = async () => {
    try {
      setIsUpdating(true);
      await updateLatestRates(period);
      queryClient.invalidateQueries({ queryKey: ['recentRates'] });
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        alert('Please login to update rates');
      } else {
        alert('Failed to update rates: ' + error.message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

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
              <div className="flex items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Exchange Rate History</h2>
                <Link
                  to="/rates/search"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Advanced Search
                </Link>
                <button
                  onClick={handleUpdateRates}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${isUpdating 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Update Rates'
                  )}
                </button>
              </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-gray-500">Dollar Index</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {stats.dollarIndex?.toFixed(2) || 'N/A'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    return new Date(date).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit'
                    });
                  }}
                />
                <YAxis
                  yAxisId="left"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'usd_php_rate') return [`₱${value.toFixed(4)}`, 'USD/PHP Rate'];
                    if (name === 'dollar_index') return [value.toFixed(2), 'Dollar Index'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="usd_php_rate"
                  stroke="#3b82f6"
                  dot={false}
                  activeDot={{ r: 6 }}
                  name="USD/PHP Rate"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dollar_index"
                  stroke="#10b981"
                  dot={false}
                  activeDot={{ r: 6 }}
                  name="Dollar Index"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
} 