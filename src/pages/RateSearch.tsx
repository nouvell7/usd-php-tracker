import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { updateLatestRates } from '../services/exchangeRateService'

export default function RateSearch() {
  const [searchType, setSearchType] = useState<'single' | 'range'>('single')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [rates, setRates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const queryClient = useQueryClient()

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setError('');
    if (type === 'start') {
      setStartDate(value);
      if (searchType === 'single') {
        setEndDate(value);
      } else if (endDate && new Date(value) > new Date(endDate)) {
        setError('Start date cannot be later than end date');
      }
    } else {
      if (new Date(startDate) > new Date(value)) {
        setError('End date cannot be earlier than start date');
        return;
      }
      setEndDate(value);
    }
  };

  const handleSearch = async () => {
    if (!startDate) {
      setError('Please select a date');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      const newRates = await updateLatestRates('custom', startDate, endDate);
      setRates(newRates);
      queryClient.invalidateQueries({ queryKey: ['recentRates'] });
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        setError('Please login to search rates');
      } else {
        setError(`Failed to search rates: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Search Exchange Rates</h2>
              <p className="mt-1 text-sm text-gray-500">
                Search historical exchange rates for a specific date or date range
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    setSearchType('single');
                    setEndDate(startDate);
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    searchType === 'single'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Single Date
                </button>
                <button
                  onClick={() => {
                    setSearchType('range');
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    searchType === 'range'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Date Range
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    {searchType === 'single' ? 'Date' : 'Start Date'}
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {searchType === 'range' && (
                  <div className="flex-1 space-y-2">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    disabled={isLoading || !startDate || (searchType === 'range' && !endDate)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${isLoading || !startDate || (searchType === 'range' && !endDate)
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>

            {rates.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Latest Rate</p>
                    <p className="text-lg font-semibold">
                      ₱{rates[rates.length - 1].usd_php_rate.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Highest Rate</p>
                    <p className="text-lg font-semibold text-green-600">
                      ₱{Math.max(...rates.map(r => r.usd_php_rate)).toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Lowest Rate</p>
                    <p className="text-lg font-semibold text-red-600">
                      ₱{Math.min(...rates.map(r => r.usd_php_rate)).toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Average Rate</p>
                    <p className="text-lg font-semibold">
                      ₱{(rates.reduce((sum, r) => sum + r.usd_php_rate, 0) / rates.length).toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rates}>
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
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip
                        formatter={(value: number) => [`₱${value.toFixed(4)}`, 'USD/PHP Rate']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      />
                      <Line
                        type="monotone"
                        dataKey="usd_php_rate"
                        stroke="#3b82f6"
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 