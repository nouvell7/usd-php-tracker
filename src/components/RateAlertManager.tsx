import { useState } from 'react'
import { useRateAlerts } from '../hooks/useRateAlerts'
import { useLatestRate } from '../hooks/useExchangeRates'
import { useAuth } from '../contexts/AuthContext'

export function RateAlertManager() {
  const { user } = useAuth()
  const { alerts, addAlert, toggleAlert, removeAlert } = useRateAlerts()
  const { data: latestRate } = useLatestRate()
  const [targetRate, setTargetRate] = useState('')
  const [alertType, setAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE')
  const [newAlert, setNewAlert] = useState({
    target_rate: 0,
    type: "ABOVE" as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await addAlert.mutateAsync({
        ...newAlert,
        user_id: user.id,
        is_active: true
      })
      setNewAlert({ target_rate: 0, type: "ABOVE" })
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  if (!alerts.data) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Rate Alerts</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Rate</label>
            <input
              type="number"
              step="0.0001"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder={latestRate?.usd_php_rate.toString()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Alert Type</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as 'ABOVE' | 'BELOW')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ABOVE">Above</option>
              <option value="BELOW">Below</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              disabled={addAlert.isPending}
            >
              {addAlert.isPending ? 'Adding...' : 'Add Alert'}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {alerts.data?.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium">
                Alert when rate goes {alert.type.toLowerCase()}{' '}
                ₱{alert.target_rate.toFixed(4)}
              </p>
              <p className="text-sm text-gray-500">
                Created at: {new Date(alert.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => toggleAlert.mutate({ id: alert.id, is_active: !alert.is_active })}
                className={`px-3 py-1 rounded-md ${
                  alert.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {alert.is_active ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => removeAlert.mutate(alert.id)}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 