import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'

const TemplatesPage = lazy(() => import('remote-document/views/templates'))

export function DocumentTemplates() {
  return (
    <RemoteWrapper>
      <TemplatesPage canCreate canUpdate canDelete />
    </RemoteWrapper>
  )
}
