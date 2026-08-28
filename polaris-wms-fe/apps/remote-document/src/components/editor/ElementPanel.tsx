import { useState } from 'react'
import { useDraggable, useDndContext } from '@dnd-kit/core'
import type { ElementType } from '../../types/template.types'

interface ElementDragItem {
  type: ElementType
  icon: string
  iconColor: string
  label: string
}

const ELEMENT_TYPES: ElementDragItem[] = [
  { type: 'static_text', icon: 'T', iconColor: '#e53935', label: 'Teks Statis' },
  { type: 'dynamic_text', icon: 'D', iconColor: '#1976d2', label: 'Teks Dinamis' },
  { type: 'barcode', icon: '\u2551\u2502\u2551', iconColor: '#333', label: 'Barcode' },
  { type: 'qrcode', icon: '\u25A3', iconColor: '#333', label: 'QR Code' },
  { type: 'image', icon: '\uD83D\uDDBC', iconColor: '#43a047', label: 'Gambar' },
  { type: 'line', icon: '\u2500\u2500', iconColor: '#666', label: 'Garis' },
  { type: 'box', icon: '\u25A1', iconColor: '#666', label: 'Kotak' },
  { type: 'repeater', icon: '\uD83D\uDCCB', iconColor: '#333', label: 'Repeater' },
]

function DraggableElement({ item, isDraggingGlobal }: { item: ElementDragItem; isDraggingGlobal: boolean }) {
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `element-panel-${item.type}`,
    data: { type: item.type, source: 'palette' },
  })

  const showHighlight = isDragging || (hovered && !isDraggingGlobal)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        border: `1px solid ${showHighlight ? '#001871' : '#ebebeb'}`,
        borderRadius: '8px',
        background: showHighlight ? '#f1f3f8' : '#fff',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        userSelect: 'none',
        transition: 'background .1s, border-color .1s',
        pointerEvents: (isDraggingGlobal && !isDragging) ? 'none' : 'auto',
      }}
    >
      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', fontWeight: 700, flexShrink: 0, color: item.iconColor }}>{item.icon}</span>
      <span style={{ fontSize: '12px', color: '#1f2b59' }}>{item.label}</span>
    </div>
  )
}

export function ElementPanel() {
  const { active } = useDndContext()
  const isDraggingGlobal = active !== null

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2b59', marginBottom: '4px' }}>Elemen</div>
      <p style={{ fontSize: '10px', color: '#949eb8', marginBottom: '12px' }}>Drag ke canvas untuk menambahkan</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ELEMENT_TYPES.map(item => (
          <DraggableElement key={item.type} item={item} isDraggingGlobal={isDraggingGlobal} />
        ))}
      </div>
    </div>
  )
}
