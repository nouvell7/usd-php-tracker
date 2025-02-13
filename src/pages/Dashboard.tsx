import { useState, useMemo } from 'react'
import { useLatestRate, useRecentRates } from '../hooks/useExchangeRates'
import { useExchangeRateUpdater } from '../hooks/useExchangeRateUpdater'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { RateAlertManager } from '../components/RateAlertManager'

export default function Dashboard() {
  const { data: latestRate, isLoading: isLoadingLatest } = useLatestRate()
  const { data: recentRates, isLoading: isLoadingRates } = useRecentRates(30)  // 최근 30일 데이터

  // 1시간마다 환율 업데이트
  useExchangeRateUpdater(60)

  const stats = useMemo(() => {
    if (!recentRates?.length) return null;
    
    return {
      current: recentRates[recentRates.length - 1].usd_php_rate,
      dollarIndex: recentRates[recentRates.length - 1].dollar_index,
      change: recentRates[recentRates.length - 1].usd_php_rate - recentRates[0].usd_php_rate,
      changePercent: ((recentRates[recentRates.length - 1].usd_php_rate - recentRates[0].usd_php_rate) / recentRates[0].usd_php_rate) * 100
    };
  }, [recentRates]);

  if (isLoadingLatest || isLoadingRates || !stats) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">USD/PHP Exchange Rate</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Current Rate</p>
              <p className="text-2xl font-semibold">₱{stats.current.toFixed(4)}</p>
              <p className={`text-sm ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.change >= 0 ? '▲' : '▼'} {Math.abs(stats.change).toFixed(4)} ({Math.abs(stats.changePercent).toFixed(2)}%)
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Dollar Index</p>
              <p className="text-2xl font-semibold">{stats.dollarIndex?.toFixed(2) || 'N/A'}</p>
              <p className="text-sm text-gray-500">USD Strength Indicator</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">30-Day Trend</p>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentRates}>
                    <Line
                      type="monotone"
                      dataKey="usd_php_rate"
                      stroke="#3b82f6"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentRates}>
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

      <div className="mt-8">
        <RateAlertManager />
      </div>
    </div>
  )
} 