import { useState } from 'react'
import { useDraggable, useDndContext } from '@dnd-kit/core'
import type { ElementType } from '@/types/template'

interface ElementDragItem {
  type: ElementType
  icon: string
  iconColor: string
  label: string
}

const ELEMENT_TYPES: ElementDragItem[] = [
  { type: 'static_text', icon: 'T', iconColor: '#e53935', label: 'Teks Statis' },
  { type: 'dynamic_text', icon: 'D', iconColor: '#1976d2', label: 'Teks Dinamis' },
  { type: 'barcode', icon: '║│║', iconColor: '#333', label: 'Barcode' },
  { type: 'qrcode', icon: '▣', iconColor: '#333', label: 'QR Code' },
  { type: 'image', icon: '🖼', iconColor: '#43a047', label: 'Gambar' },
  { type: 'line', icon: '──', iconColor: '#666', label: 'Garis' },
  { type: 'box', icon: '□', iconColor: '#666', label: 'Kotak' },
  { type: 'repeater', icon: '📋', iconColor: '#333', label: 'Repeater' },
]

function DraggableElement({ item, isDraggingGlobal }: { item: ElementDragItem; isDraggingGlobal: boolean }) {
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `element-panel-${item.type}`,
    data: { type: item.type },
  })

  // Only show highlight if:
  // 1. This specific item is being dragged, OR
  // 2. It's hovered AND no global drag is happening
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

export default function ElementPanel() {
  const { active } = useDndContext()
  const isDraggingGlobal = active !== null

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2b59', marginBottom: '12px' }}>Elemen</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ELEMENT_TYPES.map(item => (
          <DraggableElement key={item.type} item={item} isDraggingGlobal={isDraggingGlobal} />
        ))}
      </div>
    </div>
  )
}
