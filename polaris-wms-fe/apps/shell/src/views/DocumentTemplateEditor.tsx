import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'

const TemplateEditorPage = lazy(() => import('remote-document/views/template-editor'))

export function DocumentTemplateEditor() {
  return (
    <RemoteWrapper>
      <TemplateEditorPage />
    </RemoteWrapper>
  )
}
