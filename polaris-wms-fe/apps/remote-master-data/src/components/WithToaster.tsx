import { type ReactNode } from 'react'
import { Toaster } from '@polaris/ui'

/** Ensures toasts are rendered by the same microfrontend bundle that emits them. */
export function WithToaster({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      {children}
    </>
  )
}
