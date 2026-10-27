import React, { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageViewTracker } from './components/PageViewTracker'

const ReaderPage = React.lazy(() => import('./pages/ReaderPage'))

// Follow the build base so routing works both at "/" and under a sub-path mount.
const basename = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router basename={basename}>
          <PageViewTracker />
          <div className="min-h-screen bg-gray-900 text-white">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/read/:arxivId"
                element={
                  <Suspense fallback={<div className="p-8 text-center text-gray-400">正在加载阅读器…</div>}>
                    <ReaderPage />
                  </Suspense>
                }
              />
            </Routes>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#f3f4f6',
                border: '1px solid #374151',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App