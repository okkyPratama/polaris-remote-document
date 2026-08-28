import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary, Loading } from '@polaris/ui'

interface RemoteWrapperProps {
  children: ReactNode
}

export function RemoteWrapper({ children }: RemoteWrapperProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center">
          <p className="text-red-600">Failed to load remote module</p>
          <button
            className="mt-2 text-sm text-blue-600 hover:underline"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loading size="lg" />
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}
