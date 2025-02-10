import { useLatestRate, useRecentRates } from '../hooks/useExchangeRates'
import { useExchangeRateUpdater } from '../hooks/useExchangeRateUpdater'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RateAlertManager } from '../components/RateAlertManager'

export default function Dashboard() {
  const { data: latestRate, isLoading: isLoadingLatest } = useLatestRate()
  const { data: recentRates, isLoading: isLoadingRates } = useRecentRates()

  // 1시간마다 환율 업데이트
  useExchangeRateUpdater(60)

  if (isLoadingLatest || isLoadingRates) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Current Rate</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-sm text-gray-500">USD/PHP Rate</p>
            <p className="text-3xl font-bold">{latestRate?.usd_php_rate}</p>
            <p className="text-sm text-gray-500">as of {latestRate?.date}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <p className="text-sm text-gray-500">Dollar Index</p>
            <p className="text-3xl font-bold">{latestRate?.dollar_index}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <p className="text-sm text-gray-500">20-Day MA</p>
            <p className="text-3xl font-bold">{latestRate?.ma_20}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Rate History</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentRates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="usd_php_rate"
                stroke="#2563eb"
                name="USD/PHP Rate"
              />
              <Line
                type="monotone"
                dataKey="ma_20"
                stroke="#7c3aed"
                name="20-Day MA"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8">
        <RateAlertManager />
      </div>
    </>
  )
} 