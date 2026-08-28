import { Outlet } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { AppSidebar } from './AppSidebar'
import { Toaster } from '@polaris/ui'

export function AuthLayout() {
  return <Outlet />
}

export function DefaultLayout() {
  return (
    <RequireAuth>
      <div className="flex h-screen overflow-hidden bg-[#f1f3f8]">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-[22px]">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </RequireAuth>
  )
}
