import { type ReactNode } from 'react'
import { Toaster } from '@polaris/ui'

export function WithToaster({ children }: { children: ReactNode }) {
  return (
    <>
      <Toaster />
      {children}
    </>
  )
}
