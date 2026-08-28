import { type ReactNode } from 'react'
import { Toaster } from '@polaris/ui'

/**
 * Wrapper yang memastikan Toaster dari bundle remote-admin
 * ter-render saat page di-load sebagai microfrontend.
 * Karena sonner tidak di-share antar bundle, Toaster harus
 * berada di bundle yang sama dengan toast() yang dipanggil.
 */
export function WithToaster({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      {children}
    </>
  )
}
