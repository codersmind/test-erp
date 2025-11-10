import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { SyncProvider } from './sync/SyncProvider'
import { router } from './router'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SyncProvider>
            <RouterProvider router={router} />
          </SyncProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)

