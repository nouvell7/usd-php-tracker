import { useTransactions } from '../hooks/useTransactions'
import { useMemo } from 'react'
import { MonthlyVolumeChart } from '../components/charts/MonthlyVolumeChart'
import { PortfolioDistributionChart } from '../components/charts/PortfolioDistributionChart'

interface MonthlyVolumeData {
  month: string
  volume: number
}

export default function Analysis() {
  const { data: transactions, isLoading } = useTransactions()

  const stats = useMemo(() => {
    if (!transactions) return null

    const totalBought = transactions
      .filter(t => t.type === 'BUY')
      .reduce((sum, t) => sum + t.amount_usd, 0)
    
    const totalSold = transactions
      .filter(t => t.type === 'SELL')
      .reduce((sum, t) => sum + t.amount_usd, 0)

    const totalBoughtPHP = transactions
      .filter(t => t.type === 'BUY')
      .reduce((sum, t) => sum + t.amount_php, 0)
    
    const totalSoldPHP = transactions
      .filter(t => t.type === 'SELL')
      .reduce((sum, t) => sum + t.amount_php, 0)

    const averageBuyRate = totalBoughtPHP / totalBought || 0
    const averageSellRate = totalSoldPHP / totalSold || 0
    
    const currentPosition = totalBought - totalSold
    const realizedProfitPHP = totalSoldPHP - (totalSold * averageBuyRate)

    // 월별 거래량 계산
    const monthlyVolume = transactions.reduce((acc, t) => {
      const month = t.transaction_date.substring(0, 7) // YYYY-MM
      if (!acc[month]) acc[month] = 0
      acc[month] += t.amount_usd
      return acc
    }, {} as Record<string, number>)

    const monthlyVolumeData: MonthlyVolumeData[] = Object.entries(monthlyVolume).map(([month, volume]) => ({
      month,
      volume: Number(volume)
    }))

    return {
      totalBought,
      totalSold,
      averageBuyRate,
      averageSellRate,
      currentPosition,
      realizedProfitPHP,
      monthlyVolume: monthlyVolumeData
    }
  }, [transactions])

  if (isLoading || !stats) return <div>Loading...</div>

  const pieData = [
    { name: 'Current Position', value: stats.currentPosition },
    { name: 'Sold', value: stats.totalSold }
  ]

  const COLORS = ['#2563eb', '#dc2626']

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Bought</h3>
          <p className="text-3xl font-bold text-blue-600">${stats.totalBought.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Avg. Rate: ₱{stats.averageBuyRate.toFixed(4)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Sold</h3>
          <p className="text-3xl font-bold text-red-600">${stats.totalSold.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Avg. Rate: ₱{stats.averageSellRate.toFixed(4)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Realized Profit</h3>
          <p className="text-3xl font-bold text-green-600">₱{stats.realizedProfitPHP.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Current Position: ${stats.currentPosition.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trading Volume</h3>
          <div className="h-80">
            <MonthlyVolumeChart data={stats.monthlyVolume} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Distribution</h3>
          <div className="h-80">
            <PortfolioDistributionChart data={pieData} colors={COLORS} />
          </div>
        </div>
      </div>
    </div>
  )
} 