import { useState } from 'react'
import { useTransactions, useAddTransaction } from '../hooks/useTransactions'
import { useLatestRate } from '../hooks/useExchangeRates'
import { useAuth } from '../contexts/AuthContext'

interface TransactionFormData {
  transaction_date: string
  type: "BUY" | "SELL"
  amount_usd: number
  rate: number
  amount_php: number
  profit_loss: number | null
  notes: string | null
  user_id: string
}

export default function Transactions() {
  const { data: transactions, isLoading } = useTransactions()
  const { data: latestRate } = useLatestRate()
  const addTransaction = useAddTransaction()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TransactionFormData>({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'BUY',
    amount_usd: 0,
    rate: latestRate?.usd_php_rate || 0,
    amount_php: 0,
    profit_loss: null,
    notes: '',
    user_id: user?.id || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTransaction.mutateAsync({
        ...formData,
        profit_loss: null,
        user_id: user?.id || ''
      })
      // 폼 초기화
      setFormData({
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'BUY',
        amount_usd: 0,
        rate: latestRate?.usd_php_rate || 0,
        amount_php: 0,
        profit_loss: null,
        notes: '',
        user_id: user?.id || '',
      })
    } catch (error) {
      console.error('Failed to add transaction:', error)
    }
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">New Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
              <input
                type="number"
                value={formData.amount_usd}
                onChange={(e) => setFormData({ ...formData, amount_usd: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rate</label>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="0"
                step="0.0001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (PHP)</label>
            <input
              type="number"
              value={formData.amount_php}
              onChange={(e) => setFormData({ ...formData, amount_php: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes ?? ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              disabled={addTransaction.isPending}
            >
              {addTransaction.isPending ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (PHP)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions?.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.transaction_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.amount_usd.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.rate.toFixed(4)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.amount_php.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 