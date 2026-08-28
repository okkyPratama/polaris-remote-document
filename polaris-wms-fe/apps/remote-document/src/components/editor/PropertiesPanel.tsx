import { useCallback, useMemo } from 'react'
import { useTemplate } from '../../context/TemplateContext'
import { validatePlaceholderName, validateStaticTextLength, validateFontSize } from '../../utils/validation'
import type {
  BarcodeFormat,
  BarcodeProperties,
  BoxProperties,
  DataSource,
  DynamicTextProperties,
  ImageProperties,
  LineOrientation,
  LineProperties,
  QRCodeProperties,
  RepeaterColumn,
  RepeaterProperties,
  StaticTextProperties,
  TemplateElement,
  TextAlignment,
} from '../../types/template.types'

// --- Styles ---

const styles = {
  container: { fontSize: '0.8rem' } as React.CSSProperties,
  heading: { fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 } as React.CSSProperties,
  emptyMessage: { fontSize: '0.8rem', color: '#888' } as React.CSSProperties,
  section: { marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' } as React.CSSProperties,
  sectionTitle: { fontSize: '0.75rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase' as const } as React.CSSProperties,
  row: { display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' } as React.CSSProperties,
  fieldGroup: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0.15rem' } as React.CSSProperties,
  label: { fontSize: '0.7rem', color: '#666' } as React.CSSProperties,
  input: { width: '100%', padding: '0.25rem 0.35rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' as const } as React.CSSProperties,
  select: { width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' as const } as React.CSSProperties,
  textarea: { width: '100%', padding: '0.25rem 0.35rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '3px', resize: 'vertical' as const, minHeight: '3rem', boxSizing: 'border-box' as const } as React.CSSProperties,
  error: { fontSize: '0.65rem', color: '#d32f2f', marginTop: '0.1rem' } as React.CSSProperties,
  buttonRow: { display: 'flex', gap: '0.3rem' } as React.CSSProperties,
  button: { flex: 1, padding: '0.3rem', fontSize: '0.7rem', border: '1px solid #ccc', borderRadius: '3px', background: '#fff', cursor: 'pointer' } as React.CSSProperties,
  checkbox: { marginRight: '0.3rem' } as React.CSSProperties,
  checkboxLabel: { display: 'flex', alignItems: 'center', fontSize: '0.75rem', cursor: 'pointer' } as React.CSSProperties,
}

// --- Validation helpers ---

function validatePositiveNumber(value: number, label: string): string | null {
  if (isNaN(value) || value < 0) return `${label} must be >= 0`
  return null
}

function validateThickness(value: number): string | null {
  if (isNaN(value) || value <= 0) return 'Thickness must be > 0 mm'
  return null
}

// --- Component ---

export function PropertiesPanel() {
  const { state, dispatch } = useTemplate()
  const { template, selectedElementId } = state
  const elements = state.elements

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null
    return elements.find((el) => el.id === selectedElementId) ?? null
  }, [elements, selectedElementId])

  const updateElement = useCallback(
    (changes: Partial<TemplateElement>) => {
      if (!selectedElementId) return
      dispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedElementId, changes } })
    },
    [dispatch, selectedElementId]
  )

  const updateProperties = useCallback(
    (propChanges: Partial<TemplateElement['properties']>) => {
      if (!selectedElement) return
      updateElement({ properties: { ...selectedElement.properties, ...propChanges } as TemplateElement['properties'] })
    },
    [selectedElement, updateElement]
  )

  const handleBringForward = useCallback(() => {
    if (!selectedElement) return
    const maxZ = Math.max(...elements.map((el) => el.z_order))
    if (selectedElement.z_order < maxZ) updateElement({ z_order: selectedElement.z_order + 1 })
  }, [elements, selectedElement, updateElement])

  const handleSendBackward = useCallback(() => {
    if (!selectedElement) return
    if (selectedElement.z_order > 1) updateElement({ z_order: selectedElement.z_order - 1 })
  }, [selectedElement, updateElement])

  if (!selectedElement) {
    return (
      <div style={styles.container}>
        <h3 style={styles.heading}>Properties</h3>
        <p style={styles.emptyMessage}>Pilih elemen di canvas untuk mengedit propertinya.</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Properties</h3>

      <PositionSection element={selectedElement} onUpdate={updateElement} />
      <SizeSection element={selectedElement} onUpdate={updateElement} />

      {/* Z-order */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Z-Order</div>
        <div style={styles.buttonRow}>
          <button type="button" style={styles.button} onClick={handleBringForward} aria-label="Bring forward">↑ Forward</button>
          <button type="button" style={styles.button} onClick={handleSendBackward} aria-label="Send backward">↓ Backward</button>
        </div>
      </div>

      {/* Delete */}
      <div style={styles.section}>
        <button
          type="button"
          onClick={() => {
            if (selectedElementId && confirm('Hapus elemen ini?')) {
              dispatch({ type: 'REMOVE_ELEMENT', payload: selectedElementId })
            }
          }}
          style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', border: '1px solid #e53935', borderRadius: '4px', background: '#fff', color: '#e53935', cursor: 'pointer', fontWeight: 500 }}
          aria-label="Hapus elemen"
        >
          Hapus Elemen
        </button>
      </div>

      <TypeSpecificProperties element={selectedElement} onUpdateProperties={updateProperties} />
    </div>
  )
}

// --- Sub-components ---

function PositionSection({ element, onUpdate }: { element: TemplateElement; onUpdate: (changes: Partial<TemplateElement>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Position (mm)</div>
      <div style={styles.row}>
        <NumberField label="X" value={element.x_mm} onChange={(v) => onUpdate({ x_mm: v })} validate={(v) => validatePositiveNumber(v, 'X')} step={0.5} />
        <NumberField label="Y" value={element.y_mm} onChange={(v) => onUpdate({ y_mm: v })} validate={(v) => validatePositiveNumber(v, 'Y')} step={0.5} />
      </div>
    </div>
  )
}

function SizeSection({ element, onUpdate }: { element: TemplateElement; onUpdate: (changes: Partial<TemplateElement>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Size (mm)</div>
      <div style={styles.row}>
        <NumberField label="W" value={element.width_mm} onChange={(v) => onUpdate({ width_mm: v })} validate={(v) => validatePositiveNumber(v, 'Width')} step={0.5} min={0} />
        <NumberField label="H" value={element.height_mm} onChange={(v) => onUpdate({ height_mm: v })} validate={(v) => validatePositiveNumber(v, 'Height')} step={0.5} min={0} />
      </div>
    </div>
  )
}

function TypeSpecificProperties({ element, onUpdateProperties }: { element: TemplateElement; onUpdateProperties: (changes: Partial<TemplateElement['properties']>) => void }) {
  switch (element.type) {
    case 'static_text': return <StaticTextFields props={element.properties as StaticTextProperties} onUpdate={onUpdateProperties} />
    case 'dynamic_text': return <DynamicTextFields props={element.properties as DynamicTextProperties} onUpdate={onUpdateProperties} />
    case 'barcode': return <BarcodeFields props={element.properties as BarcodeProperties} onUpdate={onUpdateProperties} />
    case 'qrcode': return <QRCodeFields props={element.properties as QRCodeProperties} onUpdate={onUpdateProperties} />
    case 'image': return <ImageFields props={element.properties as ImageProperties} onUpdate={onUpdateProperties} />
    case 'line': return <LineFields props={element.properties as LineProperties} onUpdate={onUpdateProperties} />
    case 'box': return <BoxFields props={element.properties as BoxProperties} onUpdate={onUpdateProperties} />
    case 'repeater': return <RepeaterFields props={element.properties as RepeaterProperties} onUpdate={onUpdateProperties} />
    default: return null
  }
}

// --- Type-specific field components ---

function StaticTextFields({ props, onUpdate }: { props: StaticTextProperties; onUpdate: (c: Partial<StaticTextProperties>) => void }) {
  const contentError = validateStaticTextLength(props.content)
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Static Text</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Content</label>
        <textarea style={styles.textarea} value={props.content} maxLength={500} onChange={(e) => onUpdate({ content: e.target.value })} aria-label="Text content" data-prop-primary-input="true" />
        {contentError && <span style={styles.error}>{contentError}</span>}
      </div>
      <FontFields fontFamily={props.font_family} fontSize={props.font_size_pt} bold={props.font_bold} italic={props.font_italic} onUpdate={onUpdate} />
      <AlignmentField value={props.alignment} onChange={(alignment) => onUpdate({ alignment })} />
    </div>
  )
}

function DynamicTextFields({ props, onUpdate }: { props: DynamicTextProperties; onUpdate: (c: Partial<DynamicTextProperties>) => void }) {
  const placeholderError = validatePlaceholderName(props.placeholder)
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Dynamic Text</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Placeholder name</label>
        <input style={styles.input} type="text" value={props.placeholder} onChange={(e) => onUpdate({ placeholder: e.target.value })} placeholder="e.g. customer_name" aria-label="Placeholder name" data-prop-primary-input="true" />
        {placeholderError && <span style={styles.error}>{placeholderError}</span>}
      </div>
      <FontFields fontFamily={props.font_family} fontSize={props.font_size_pt} bold={props.font_bold} italic={props.font_italic} onUpdate={onUpdate} />
      <AlignmentField value={props.alignment} onChange={(alignment) => onUpdate({ alignment })} />
    </div>
  )
}

function BarcodeFields({ props, onUpdate }: { props: BarcodeProperties; onUpdate: (c: Partial<BarcodeProperties>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Barcode</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Format</label>
        <select style={styles.select} value={props.format} onChange={(e) => onUpdate({ format: e.target.value as BarcodeFormat })} aria-label="Barcode format">
          <option value="code128">Code 128</option>
          <option value="code39">Code 39</option>
          <option value="ean13">EAN-13</option>
        </select>
      </div>
      <DataSourceField dataSource={props.data_source} staticValue={props.static_value} placeholder={props.placeholder} onUpdate={onUpdate} />
    </div>
  )
}

function QRCodeFields({ props, onUpdate }: { props: QRCodeProperties; onUpdate: (c: Partial<QRCodeProperties>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>QR Code</div>
      <DataSourceField dataSource={props.data_source} staticValue={props.static_value} placeholder={props.placeholder} onUpdate={onUpdate} />
    </div>
  )
}

function ImageFields({ props, onUpdate }: { props: ImageProperties; onUpdate: (c: Partial<ImageProperties>) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Image</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Source URL</label>
        <input style={styles.input} type="text" value={props.source_url} onChange={(e) => onUpdate({ source_url: e.target.value })} placeholder="https://..." aria-label="Image source URL" />
      </div>
    </div>
  )
}

function LineFields({ props, onUpdate }: { props: LineProperties; onUpdate: (c: Partial<LineProperties>) => void }) {
  const thicknessError = validateThickness(props.thickness_mm)
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Line</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Thickness (mm)</label>
        <input style={styles.input} type="number" value={props.thickness_mm} step={0.1} min={0.1} onChange={(e) => onUpdate({ thickness_mm: parseFloat(e.target.value) || 0 })} aria-label="Line thickness" />
        {thicknessError && <span style={styles.error}>{thicknessError}</span>}
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Orientation</label>
        <select style={styles.select} value={props.orientation} onChange={(e) => onUpdate({ orientation: e.target.value as LineOrientation })} aria-label="Line orientation">
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </div>
    </div>
  )
}

function BoxFields({ props, onUpdate }: { props: BoxProperties; onUpdate: (c: Partial<BoxProperties>) => void }) {
  const thicknessError = validateThickness(props.thickness_mm)
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Box</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Thickness (mm)</label>
        <input style={styles.input} type="number" value={props.thickness_mm} step={0.1} min={0.1} onChange={(e) => onUpdate({ thickness_mm: parseFloat(e.target.value) || 0 })} aria-label="Box thickness" />
        {thicknessError && <span style={styles.error}>{thicknessError}</span>}
      </div>
      <label style={styles.checkboxLabel}>
        <input style={styles.checkbox} type="checkbox" checked={props.fill} onChange={(e) => onUpdate({ fill: e.target.checked })} aria-label="Box fill" />
        Fill
      </label>
    </div>
  )
}

function RepeaterFields({ props, onUpdate }: { props: RepeaterProperties; onUpdate: (c: Partial<RepeaterProperties>) => void }) {
  const dataKeyError = validatePlaceholderName(props.data_key)
  const rowHeightError = (isNaN(props.row_height_mm) || props.row_height_mm < 4) ? 'Row height must be >= 4 mm' : null
  const maxRowsError = (isNaN(props.max_rows) || props.max_rows < 1 || props.max_rows > 50) ? 'Max rows must be 1-50' : null

  const handleColumnChange = (index: number, changes: Partial<RepeaterColumn>) => {
    const newColumns = props.columns.map((col, i) => (i === index ? { ...col, ...changes } : col))
    onUpdate({ columns: newColumns })
  }

  const handleAddColumn = () => {
    const newColumn: RepeaterColumn = { label: `Col ${props.columns.length + 1}`, placeholder: `field_${props.columns.length + 1}`, x_offset_mm: 0, width_mm: 20, font_family: 'Arial', font_size_pt: 8, alignment: 'left' }
    onUpdate({ columns: [...props.columns, newColumn] })
  }

  const handleRemoveColumn = (index: number) => {
    if (props.columns.length <= 1) return
    onUpdate({ columns: props.columns.filter((_, i) => i !== index) })
  }

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Repeater</div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Data key (array name)</label>
        <input style={styles.input} type="text" value={props.data_key} onChange={(e) => onUpdate({ data_key: e.target.value })} placeholder="e.g. orders" aria-label="Data key" />
        {dataKeyError && <span style={styles.error}>{dataKeyError}</span>}
      </div>
      <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
        <label style={styles.label}>Row height (mm)</label>
        <input style={styles.input} type="number" value={props.row_height_mm} min={4} step={0.5} onChange={(e) => onUpdate({ row_height_mm: parseFloat(e.target.value) || 4 })} aria-label="Row height" />
        {rowHeightError && <span style={styles.error}>{rowHeightError}</span>}
      </div>
      <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
        <label style={styles.label}>Max rows</label>
        <input style={styles.input} type="number" value={props.max_rows} min={1} max={50} step={1} onChange={(e) => onUpdate({ max_rows: parseInt(e.target.value) || 1 })} aria-label="Max rows" />
        {maxRowsError && <span style={styles.error}>{maxRowsError}</span>}
      </div>
      <div style={{ marginTop: '0.35rem' }}>
        <label style={styles.checkboxLabel}>
          <input style={styles.checkbox} type="checkbox" checked={props.show_header} onChange={(e) => onUpdate({ show_header: e.target.checked })} aria-label="Show header" />
          Show header
        </label>
      </div>
      <div style={{ marginTop: '0.25rem' }}>
        <label style={styles.checkboxLabel}>
          <input style={styles.checkbox} type="checkbox" checked={props.show_row_lines} onChange={(e) => onUpdate({ show_row_lines: e.target.checked })} aria-label="Show row lines" />
          Show row lines
        </label>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ ...styles.sectionTitle, marginBottom: '0.3rem' }}>Columns ({props.columns.length})</div>
        {props.columns.map((col, idx) => (
          <RepeaterColumnEditor key={idx} column={col} index={idx} canRemove={props.columns.length > 1} onChange={(changes) => handleColumnChange(idx, changes)} onRemove={() => handleRemoveColumn(idx)} />
        ))}
        <button type="button" style={{ ...styles.button, marginTop: '0.3rem', width: '100%' }} onClick={handleAddColumn} aria-label="Add column">+ Add Column</button>
      </div>
    </div>
  )
}

function RepeaterColumnEditor({ column, index, canRemove, onChange, onRemove }: { column: RepeaterColumn; index: number; canRemove: boolean; onChange: (changes: Partial<RepeaterColumn>) => void; onRemove: () => void }) {
  const placeholderError = validatePlaceholderName(column.placeholder)
  const fontSizeError = validateFontSize(column.font_size_pt)

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '0.4rem', marginBottom: '0.35rem', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#555' }}>Column {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ fontSize: '0.65rem', color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.3rem' }} aria-label={`Remove column ${index + 1}`}>Remove</button>
        )}
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Label</label>
        <input style={styles.input} type="text" value={column.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Column header" aria-label={`Column ${index + 1} label`} />
      </div>
      <div style={{ ...styles.fieldGroup, marginTop: '0.25rem' }}>
        <label style={styles.label}>Placeholder</label>
        <input style={styles.input} type="text" value={column.placeholder} onChange={(e) => onChange({ placeholder: e.target.value })} placeholder="e.g. resi" aria-label={`Column ${index + 1} placeholder`} />
        {placeholderError && <span style={styles.error}>{placeholderError}</span>}
      </div>
      <div style={{ ...styles.row, marginTop: '0.25rem' }}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>X offset (mm)</label>
          <input style={styles.input} type="number" value={column.x_offset_mm} min={0} step={0.5} onChange={(e) => onChange({ x_offset_mm: parseFloat(e.target.value) || 0 })} aria-label={`Column ${index + 1} X offset`} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Width (mm)</label>
          <input style={styles.input} type="number" value={column.width_mm} min={1} step={0.5} onChange={(e) => onChange({ width_mm: parseFloat(e.target.value) || 1 })} aria-label={`Column ${index + 1} width`} />
        </div>
      </div>
      <div style={{ ...styles.row, marginTop: '0.25rem' }}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Font size (pt)</label>
          <input style={styles.input} type="number" value={column.font_size_pt} min={4} max={72} step={1} onChange={(e) => onChange({ font_size_pt: parseFloat(e.target.value) || 4 })} aria-label={`Column ${index + 1} font size`} />
          {fontSizeError && <span style={styles.error}>{fontSizeError}</span>}
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Alignment</label>
          <select style={styles.select} value={column.alignment} onChange={(e) => onChange({ alignment: e.target.value as TextAlignment })} aria-label={`Column ${index + 1} alignment`}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// --- Shared field components ---

function FontFields({ fontFamily, fontSize, bold, italic, onUpdate }: { fontFamily: string; fontSize: number; bold: boolean; italic: boolean; onUpdate: (c: Record<string, unknown>) => void }) {
  const fontSizeError = validateFontSize(fontSize)
  return (
    <>
      <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
        <label style={styles.label}>Font family</label>
        <select style={styles.select} value={fontFamily} onChange={(e) => onUpdate({ font_family: e.target.value })} aria-label="Font family">
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>
      <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
        <label style={styles.label}>Font size (pt)</label>
        <input style={styles.input} type="number" value={fontSize} min={4} max={72} step={1} onChange={(e) => onUpdate({ font_size_pt: parseFloat(e.target.value) || 4 })} aria-label="Font size" />
        {fontSizeError && <span style={styles.error}>{fontSizeError}</span>}
      </div>
      <div style={{ ...styles.row, marginTop: '0.35rem' }}>
        <label style={styles.checkboxLabel}>
          <input style={styles.checkbox} type="checkbox" checked={bold} onChange={(e) => onUpdate({ font_bold: e.target.checked })} aria-label="Bold" />
          <strong>B</strong>
        </label>
        <label style={styles.checkboxLabel}>
          <input style={styles.checkbox} type="checkbox" checked={italic} onChange={(e) => onUpdate({ font_italic: e.target.checked })} aria-label="Italic" />
          <em>I</em>
        </label>
      </div>
    </>
  )
}

function AlignmentField({ value, onChange }: { value: TextAlignment; onChange: (v: TextAlignment) => void }) {
  return (
    <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
      <label style={styles.label}>Alignment</label>
      <select style={styles.select} value={value} onChange={(e) => onChange(e.target.value as TextAlignment)} aria-label="Text alignment">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
  )
}

function DataSourceField({ dataSource, staticValue, placeholder, onUpdate }: { dataSource: DataSource; staticValue: string; placeholder: string; onUpdate: (c: Record<string, unknown>) => void }) {
  const placeholderError = dataSource === 'placeholder' ? validatePlaceholderName(placeholder) : null
  return (
    <>
      <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
        <label style={styles.label}>Data source</label>
        <select style={styles.select} value={dataSource} onChange={(e) => onUpdate({ data_source: e.target.value as DataSource })} aria-label="Data source">
          <option value="static">Static value</option>
          <option value="placeholder">Placeholder</option>
        </select>
      </div>
      {dataSource === 'static' && (
        <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
          <label style={styles.label}>Value</label>
          <input style={styles.input} type="text" value={staticValue} onChange={(e) => onUpdate({ static_value: e.target.value })} placeholder="Enter value" aria-label="Static value" />
        </div>
      )}
      {dataSource === 'placeholder' && (
        <div style={{ ...styles.fieldGroup, marginTop: '0.35rem' }}>
          <label style={styles.label}>Placeholder name</label>
          <input style={styles.input} type="text" value={placeholder} onChange={(e) => onUpdate({ placeholder: e.target.value })} placeholder="e.g. tracking_number" aria-label="Placeholder name" />
          {placeholderError && <span style={styles.error}>{placeholderError}</span>}
        </div>
      )}
    </>
  )
}

function NumberField({ label, value, onChange, validate, step = 0.5, min }: { label: string; value: number; onChange: (v: number) => void; validate?: (v: number) => string | null; step?: number; min?: number }) {
  const error = validate ? validate(value) : null
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} type="number" value={value} step={step} min={min} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} aria-label={label} />
      {error && <span style={styles.error}>{error}</span>}
    </div>
  )
}
