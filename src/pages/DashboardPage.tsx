import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Datepicker, { type DateValueType } from 'react-tailwindcss-datepicker'

import { useCustomers } from '../hooks/useCustomers'
import { useProducts } from '../hooks/useProducts'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { useSalesOrders } from '../hooks/useSalesOrders'
import { useSync } from '../sync/useSync'
import { useLowStockProducts, useEarningsByDateRange, useTotalCustomerDue } from '../hooks/useDashboard'

type DateFilterType = 'daily' | 'monthly' | 'yearly' | 'custom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export const DashboardPage = () => {
  const { data: customers } = useCustomers()
  const { data: salesOrders } = useSalesOrders()
  const { data: products } = useProducts()
  const { data: purchaseOrders } = usePurchaseOrders()
  const { pendingCount } = useSync()
  const { data: lowStockProducts } = useLowStockProducts()
  const { data: customerDueData } = useTotalCustomerDue()

  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('monthly')
  const [customDateRange, setCustomDateRange] = useState<DateValueType>({
    startDate: null,
    endDate: null,
  })

  // Calculate date range based on filter type
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (dateFilterType) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        break
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        break
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
        break
      case 'custom':
        if (customDateRange?.startDate && customDateRange?.endDate) {
          start = new Date(String(customDateRange.startDate))
          end = new Date(String(customDateRange.endDate))
          end.setHours(23, 59, 59)
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        }
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }, [dateFilterType, customDateRange])

  // Determine groupBy based on date filter type
  const groupBy = useMemo(() => {
    switch (dateFilterType) {
      case 'daily':
        return 'day' as const
      case 'monthly':
        return 'month' as const
      case 'yearly':
        return 'year' as const
      default:
        return 'day' as const
    }
  }, [dateFilterType])

  const { data: earningsData, isPending: isLoadingEarnings } = useEarningsByDateRange(startDate, endDate, groupBy)

  // Calculate additional stats
  const totalSales = salesOrders?.filter((o) => o.status !== 'cancelled' && o.status !== 'refund').length ?? 0
  const totalRevenue = salesOrders?.reduce((sum, o) => {
    if (o.status === 'cancelled' || o.status === 'refund') return sum
    return sum + o.total
  }, 0) ?? 0

  // Prepare chart data for earnings
  const earningsChartData = earningsData?.chartData.map((item) => {
    let formattedDate: string
    if (dateFilterType === 'yearly') {
      formattedDate = item.date
    } else if (dateFilterType === 'monthly') {
      const [year, month] = item.date.split('-')
      formattedDate = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    } else {
      formattedDate = new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
    return {
      date: formattedDate,
      amount: item.amount,
    }
  }) ?? []

  // Prepare data for customer due pie chart (top 5)
  const customerDueChartData = customerDueData?.customerDueList.slice(0, 5).map((item) => ({
    name: item.customerName.length > 15 ? item.customerName.substring(0, 15) + '...' : item.customerName,
    value: item.dueAmount,
  })) ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header Stats */}
      <section>
        <h2 className="text-lg font-semibold">At a glance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active customers" value={customers?.length ?? 0} href="/customers" />
          <StatCard label="Products" value={products?.length ?? 0} href="/products" />
          <StatCard label="Sales orders" value={totalSales} href="/sales" />
          <StatCard label="Purchase orders" value={purchaseOrders?.length ?? 0} href="/purchases" />
        </div>
      </section>

      {/* Earnings Section with Date Filter */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Earnings & Revenue</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDateFilterType('daily')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  dateFilterType === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  dateFilterType === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('yearly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  dateFilterType === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('custom')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  dateFilterType === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Custom
              </button>
            </div>
            {dateFilterType === 'custom' && (
              <div className="w-full sm:w-auto">
                <Datepicker
                  value={customDateRange}
                  onChange={setCustomDateRange}
                  showShortcuts={false}
                  inputClassName="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
            )}
          </div>
        </div>

        {isLoadingEarnings ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-slate-500">Loading earnings data...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Earnings"
                value={earningsData?.totalEarnings.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '₹0'}
              />
              <StatCard
                label="Total Paid"
                value={earningsData?.totalPaid.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '₹0'}
              />
              <StatCard
                label="Total Due"
                value={earningsData?.totalDue.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '₹0'}
              />
              <StatCard label="Total Orders" value={earningsData?.totalOrders ?? 0} />
            </div>

            {earningsChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={earningsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [
                        value.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
                        'Earnings',
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Earnings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-slate-500">No earnings data for the selected period</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Customer Due Amounts */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Customer Due Amounts</h2>
        {customerDueData ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Due Amount</p>
                <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                  {customerDueData.totalDue.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-sm text-slate-600 dark:text-slate-400">Customers with Due</p>
                <p className="mt-2 text-3xl font-bold">{customerDueData.customerCount}</p>
              </div>
            </div>

            {customerDueChartData.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerDueChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {customerDueChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          value.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
                          'Due Amount',
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Top Customers with Due Amounts</h3>
                  <div className="space-y-2">
                    {customerDueData.customerDueList.slice(0, 10).map((item, index) => (
                      <div
                        key={item.customerId}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                            {index + 1}
                          </span>
                          <span className="font-medium">{item.customerName}</span>
                        </div>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {item.dueAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-slate-500">Loading customer due data...</p>
          </div>
        )}
      </section>

      {/* Low Stock Items */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Low Stock Items</h2>
          {lowStockProducts && lowStockProducts.length > 0 && (
            <Link
              to="/products"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View All Products →
            </Link>
          )}
        </div>
        {lowStockProducts && lowStockProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Product</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">SKU</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Current Stock</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Reorder Level</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {lowStockProducts.slice(0, 10).map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3 font-medium">{product.title}</td>
                    <td className="px-3 py-3 text-slate-500">{product.sku}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-semibold text-red-600 dark:text-red-400">{product.stockOnHand}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">{product.reorderLevel}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Low Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lowStockProducts.length > 10 && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Showing 10 of {lowStockProducts.length} low stock items
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-slate-500">No low stock items</p>
          </div>
        )}
      </section>

      {/* Additional Stats */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Additional Statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={totalRevenue.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
          />
          <StatCard label="Pending sync items" value={pendingCount} />
          <StatCard label="Low stock items" value={lowStockProducts?.length ?? 0} href="/products" />
        </div>
      </section>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  href?: string
}

const StatCard = ({ label, value, href }: StatCardProps) => {
  const content = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  return content
}
