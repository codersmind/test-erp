import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './layouts/AppLayout'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProductsPage } from './pages/ProductsPage'
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage'
import { SalesOrdersPage } from './pages/SalesOrdersPage'
import { SettingsPage } from './pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'sales', element: <SalesOrdersPage /> },
      { path: 'purchases', element: <PurchaseOrdersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

