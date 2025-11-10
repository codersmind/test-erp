import { Link } from 'react-router-dom'

import { useCustomers } from '../hooks/useCustomers'
import { useProducts } from '../hooks/useProducts'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { useSalesOrders } from '../hooks/useSalesOrders'
import { useSync } from '../sync/SyncProvider'

export const DashboardPage = () => {
  const { data: customers } = useCustomers()
  const { data: salesOrders } = useSalesOrders()
  const { data: products } = useProducts()
  const { data: purchaseOrders } = usePurchaseOrders()
  const { pendingCount } = useSync()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold">At a glance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active customers" value={customers?.length ?? 0} href="/customers" />
          <StatCard label="Products" value={products?.length ?? 0} href="/products" />
          <StatCard label="Sales orders" value={salesOrders?.length ?? 0} href="/sales" />
          <StatCard label="Purchase orders" value={purchaseOrders?.length ?? 0} href="/purchases" />
          <StatCard label="Pending sync items" value={pendingCount} />
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold">Manual workflow</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Capture sales, purchases, and customer data offline. When you have connectivity, trigger a manual sync from the
          header to upload a snapshot to Google Drive. Replace the sync service in <code>sync/googleDriveClient.ts</code>{' '}
          with actual Drive API calls when you&apos;re ready.
        </p>
      </section>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
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

