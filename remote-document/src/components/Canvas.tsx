import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTemplate } from '@/context/TemplateContext';
import type { RepeaterProperties, TemplateElement } from '@/types/template';
import { enforceMinimumSize } from '@/utils/canvasUtils';

/** Size of corner resize handles in mm (relative to viewBox) */
const HANDLE_SIZE = 2;

/** Renders a single template element as SVG, made draggable via a foreignObject overlay */
function ElementRenderer({
  element,
  offsetX,
  offsetY,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  element: TemplateElement;
  offsetX: number;
  offsetY: number;
  isSelected: boolean;
  onSelect: (id: string, ctrlKey?: boolean) => void;
  onDoubleClick?: (id: string) => void;
}) {
  const x = offsetX + element.x_mm;
  const y = offsetY + element.y_mm;
  const { width_mm: w, height_mm: h } = element;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-element-${element.id}`,
    data: {
      type: 'canvas-element',
      elementId: element.id,
      x_mm: element.x_mm,
      y_mm: element.y_mm,
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id, e.ctrlKey || e.metaKey);
  };

  const handleDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(element.id);
  };

  return (
    <g
      data-element-id={element.id}
      aria-label={`Element ${element.type}`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      {/* Element content */}
      <ElementContent element={element} x={x} y={y} w={w} h={h} />

      {/* Selection highlight with resize handles */}
      {isSelected && (
        <SelectionHighlight x={x} y={y} w={w} h={h} element={element} />
      )}

      {/* Drag handle overlay using foreignObject */}
      <foreignObject x={x} y={y} width={w} height={h} style={{ overflow: 'visible' }}>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          style={{
            width: '100%',
            height: '100%',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            outline: 'none',
            border: 'none',
          }}
        />
      </foreignObject>
    </g>
  );
}

/** Renders element-type-specific content */
function ElementContent({
  element,
  x,
  y,
  w,
  h,
}: {
  element: TemplateElement;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const type = element.type;

  switch (type) {
    case 'static_text':
      return <TextElement x={x} y={y} w={w} h={h} text={getTextContent(element)} element={element} />;
    case 'dynamic_text':
      return <TextElement x={x} y={y} w={w} h={h} text={getTextContent(element)} isDynamic element={element} />;
    case 'barcode':
      return <BarcodeElement x={x} y={y} w={w} h={h} />;
    case 'qrcode':
      return <QRCodeElement x={x} y={y} w={w} h={h} />;
    case 'image':
      return <ImageElement x={x} y={y} w={w} h={h} />;
    case 'line':
      return <LineElement element={element} x={x} y={y} w={w} h={h} />;
    case 'box':
      return <BoxElement element={element} x={x} y={y} w={w} h={h} />;
    case 'repeater':
      return <RepeaterElement element={element} x={x} y={y} w={w} h={h} />;
    default:
      return <rect x={x} y={y} width={w} height={h} fill="#eee" stroke="#999" strokeWidth={0.3} />;
  }
}

/** Get display text from element properties */
function getTextContent(element: TemplateElement): string {
  const props = element.properties;
  if ('content' in props && typeof props.content === 'string') {
    return props.content || 'Text';
  }
  if ('placeholder' in props && typeof props.placeholder === 'string') {
    return `{{${props.placeholder}}}`;
  }
  return 'Text';
}

/** Text element renderer — renders with actual font properties for WYSIWYG feedback */
function TextElement({
  x,
  y,
  w,
  h,
  text,
  isDynamic,
  element,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  isDynamic?: boolean;
  element: TemplateElement;
}) {
  const props = element.properties as Record<string, unknown>;
  const fontBold = props.font_bold === true;
  const fontItalic = props.font_italic === true;
  const alignment = (props.alignment as string) || 'left';
  const fontSizePt = (props.font_size_pt as number) || 10;

  // Convert pt to mm for SVG (1pt ≈ 0.353mm)
  const fontSizeMm = fontSizePt * 0.353;
  // Cap font size to fit within element height, but allow it to be proportionally large
  const displayFontSize = Math.min(fontSizeMm, h * 0.85);

  // SVG text-anchor based on alignment
  let textAnchor: string;
  let textX: number;
  if (alignment === 'center') {
    textAnchor = 'middle';
    textX = x + w / 2;
  } else if (alignment === 'right') {
    textAnchor = 'end';
    textX = x + w - 0.5;
  } else {
    textAnchor = 'start';
    textX = x + 0.5;
  }

  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={isDynamic ? 'rgba(74,144,217,0.06)' : '#fff'}
        stroke={isDynamic ? '#4a90d9' : '#bbb'}
        strokeWidth={0.2}
        strokeDasharray={isDynamic ? '1 0.5' : undefined}
      />
      <text
        x={textX}
        y={y + h / 2}
        dominantBaseline="central"
        textAnchor={textAnchor}
        fontSize={displayFontSize}
        fontWeight={fontBold ? 'bold' : 'normal'}
        fontStyle={fontItalic ? 'italic' : 'normal'}
        fill={isDynamic ? '#2563eb' : '#1f2b59'}
        style={{ pointerEvents: 'none' }}
      >
        <tspan>
          {text.length > 40 ? text.slice(0, 40) + '…' : text}
        </tspan>
      </text>
    </>
  );
}

/** Barcode placeholder renderer */
function BarcodeElement({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  // Draw barcode-like vertical lines
  const lineCount = Math.min(Math.floor(w / 1.5), 20);
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const lx = x + 1 + (i * (w - 2)) / lineCount;
    const lineWidth = i % 3 === 0 ? 0.8 : 0.4;
    lines.push(
      <rect
        key={i}
        x={lx}
        y={y + 1}
        width={lineWidth}
        height={h - 2}
        fill="#333"
      />
    );
  }

  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#999" strokeWidth={0.3} />
      {lines}
    </>
  );
}

/** QR code placeholder renderer */
function QRCodeElement({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const size = Math.min(w, h);
  const cellSize = size / 8;
  const offsetX = x + (w - size) / 2;
  const offsetY = y + (h - size) / 2;

  // Draw a simplified QR pattern
  const pattern = [
    [1, 1, 1, 0, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 0, 1, 1, 1],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [1, 1, 1, 0, 0, 0, 0, 1],
  ];

  const cells = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (pattern[row][col]) {
        cells.push(
          <rect
            key={`${row}-${col}`}
            x={offsetX + col * cellSize + 0.5}
            y={offsetY + row * cellSize + 0.5}
            width={cellSize * 0.9}
            height={cellSize * 0.9}
            fill="#333"
          />
        );
      }
    }
  }

  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#999" strokeWidth={0.3} />
      {cells}
    </>
  );
}

/** Image placeholder renderer */
function ImageElement({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="#f0f0f0" stroke="#999" strokeWidth={0.3} />
      {/* Mountain/landscape icon */}
      <polyline
        points={`${x + w * 0.2},${y + h * 0.7} ${x + w * 0.4},${y + h * 0.4} ${x + w * 0.6},${y + h * 0.6} ${x + w * 0.8},${y + h * 0.3}`}
        fill="none"
        stroke="#999"
        strokeWidth={0.4}
      />
      <circle cx={x + w * 0.3} cy={y + h * 0.3} r={Math.min(w, h) * 0.08} fill="#999" />
    </>
  );
}

/** Line element renderer */
function LineElement({
  element,
  x,
  y,
  w,
  h,
}: {
  element: TemplateElement;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const props = element.properties;
  const thickness = 'thickness_mm' in props ? (props.thickness_mm as number) : 0.5;
  const orientation = 'orientation' in props ? (props.orientation as string) : 'horizontal';

  if (orientation === 'horizontal') {
    return (
      <line
        x1={x}
        y1={y + h / 2}
        x2={x + w}
        y2={y + h / 2}
        stroke="#333"
        strokeWidth={thickness}
      />
    );
  }
  return (
    <line
      x1={x + w / 2}
      y1={y}
      x2={x + w / 2}
      y2={y + h}
      stroke="#333"
      strokeWidth={thickness}
    />
  );
}

/** Box element renderer */
function BoxElement({
  element,
  x,
  y,
  w,
  h,
}: {
  element: TemplateElement;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const props = element.properties;
  const thickness = 'thickness_mm' in props ? (props.thickness_mm as number) : 0.5;
  const fill = 'fill' in props ? (props.fill as boolean) : false;

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={fill ? '#333' : 'none'}
      stroke="#333"
      strokeWidth={thickness}
    />
  );
}

/** Repeater element renderer — shows table-like preview with header + placeholder rows */
function RepeaterElement({
  element,
  x,
  y,
  w,
  h,
}: {
  element: TemplateElement;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const props = element.properties as RepeaterProperties;
  const {
    row_height_mm = 6,
    max_rows = 5,
    show_header = true,
    columns = [],
  } = props;

  const headerHeight = show_header ? row_height_mm : 0;
  const headerFontSize = Math.min(row_height_mm * 0.5, 2.5);
  const dataFontSize = Math.min(row_height_mm * 0.45, 2.2);

  // Number of data rows that fit visually (capped by max_rows and available space)
  const availableDataHeight = h - headerHeight;
  const visibleDataRows = Math.min(max_rows, Math.max(1, Math.floor(availableDataHeight / row_height_mm)));

  return (
    <g>
      {/* Light background to distinguish repeater area */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="#f0f7ff"
        stroke="#7bafd4"
        strokeWidth={0.4}
        strokeDasharray="2 1"
      />

      {/* Header row */}
      {show_header && (
        <>
          {/* Header background */}
          <rect
            x={x}
            y={y}
            width={w}
            height={headerHeight}
            fill="#dce9f5"
            stroke="none"
          />
          {/* Header bottom line */}
          <line
            x1={x}
            y1={y + headerHeight}
            x2={x + w}
            y2={y + headerHeight}
            stroke="#7bafd4"
            strokeWidth={0.3}
          />
          {/* Column header labels */}
          {columns.map((col, i) => (
            <text
              key={`hdr-${i}`}
              x={x + col.x_offset_mm + col.width_mm / 2}
              y={y + headerHeight / 2}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize={headerFontSize}
              fontWeight="bold"
              fill="#2c5282"
            >
              {col.label.length > Math.floor(col.width_mm / 1.5)
                ? col.label.slice(0, Math.floor(col.width_mm / 1.5)) + '…'
                : col.label}
            </text>
          ))}
        </>
      )}

      {/* Data rows */}
      {Array.from({ length: visibleDataRows }, (_, rowIdx) => {
        const rowY = y + headerHeight + rowIdx * row_height_mm;
        return (
          <g key={`row-${rowIdx}`}>
            {/* Row separator line (dashed) */}
            {rowIdx > 0 && (
              <line
                x1={x}
                y1={rowY}
                x2={x + w}
                y2={rowY}
                stroke="#b0c4d8"
                strokeWidth={0.2}
                strokeDasharray="1 0.5"
              />
            )}
            {/* Show placeholder text only in first row as a visual guide */}
            {rowIdx === 0 &&
              columns.map((col, colIdx) => (
                <text
                  key={`cell-${colIdx}`}
                  x={x + col.x_offset_mm + col.width_mm / 2}
                  y={rowY + row_height_mm / 2}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize={dataFontSize}
                  fill="#8aa4bd"
                  fontStyle="italic"
                >
                  {`{{${col.placeholder}}}`.length > Math.floor(col.width_mm / 1.2)
                    ? `{{${col.placeholder}}}`.slice(0, Math.floor(col.width_mm / 1.2)) + '…'
                    : `{{${col.placeholder}}}`}
                </text>
              ))}
          </g>
        );
      })}

      {/* Bottom border line of last visible row */}
      <line
        x1={x}
        y1={y + headerHeight + visibleDataRows * row_height_mm}
        x2={x + w}
        y2={y + headerHeight + visibleDataRows * row_height_mm}
        stroke="#7bafd4"
        strokeWidth={0.2}
      />
    </g>
  );
}

/** Resize handle direction identifiers */
type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'  |        'e'
  | 'sw' | 's' | 'se';

/** CSS cursors for each handle direction */
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  w: 'ew-resize',
  e: 'ew-resize',
  sw: 'nesw-resize',
  s: 'ns-resize',
  se: 'nwse-resize',
};

/** Selection highlight with interactive corner and edge resize handles */
function SelectionHighlight({
  x,
  y,
  w,
  h,
  element,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  element: TemplateElement;
}) {
  const { dispatch } = useTemplate();
  const hs = HANDLE_SIZE;
  const halfHs = hs / 2;
  const [resizing, setResizing] = useState<{
    handle: ResizeHandle;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  // Handle positions: corners + edges
  const handles: { id: ResizeHandle; cx: number; cy: number }[] = [
    // Corners
    { id: 'nw', cx: x, cy: y },
    { id: 'ne', cx: x + w, cy: y },
    { id: 'sw', cx: x, cy: y + h },
    { id: 'se', cx: x + w, cy: y + h },
    // Edges
    { id: 'n', cx: x + w / 2, cy: y },
    { id: 's', cx: x + w / 2, cy: y + h },
    { id: 'w', cx: x, cy: y + h / 2 },
    { id: 'e', cx: x + w, cy: y + h / 2 },
  ];

  /** Convert a pixel delta to mm using the nearest parent SVG viewBox */
  const pixelDeltaToMm = useCallback(
    (pxDeltaX: number, pxDeltaY: number): { dxMm: number; dyMm: number } => {
      // Find the SVG element to get viewBox / client scaling
      const svgEl = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null;
      if (!svgEl) return { dxMm: 0, dyMm: 0 };
      const rect = svgEl.getBoundingClientRect();
      const viewBox = svgEl.viewBox.baseVal;
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      return { dxMm: pxDeltaX * scaleX, dyMm: pxDeltaY * scaleY };
    },
    []
  );

  const handleMouseDown = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing({
        handle,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: element.x_mm,
        startY: element.y_mm,
        startW: element.width_mm,
        startH: element.height_mm,
      });
    },
    [element.x_mm, element.y_mm, element.width_mm, element.height_mm]
  );

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { handle, startMouseX, startMouseY, startX, startY, startW, startH } = resizing;
      const { dxMm, dyMm } = pixelDeltaToMm(
        e.clientX - startMouseX,
        e.clientY - startMouseY
      );

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      // Apply deltas based on which handle is being dragged
      if (handle.includes('e')) {
        newW = startW + dxMm;
      }
      if (handle.includes('w')) {
        newW = startW - dxMm;
        newX = startX + dxMm;
      }
      if (handle.includes('s')) {
        newH = startH + dyMm;
      }
      if (handle.includes('n')) {
        newH = startH - dyMm;
        newY = startY + dyMm;
      }

      // Enforce minimum sizes locally for position adjustments
      const { width: minW, height: minH } = enforceMinimumSize(element.type, 0, 0);

      // If width would go below minimum, clamp and adjust position
      if (newW < minW) {
        if (handle.includes('w')) {
          newX = startX + startW - minW;
        }
        newW = minW;
      }
      if (newH < minH) {
        if (handle.includes('n')) {
          newY = startY + startH - minH;
        }
        newH = minH;
      }

      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: element.id,
          changes: {
            x_mm: newX,
            y_mm: newY,
            width_mm: newW,
            height_mm: newH,
          },
        },
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, pixelDeltaToMm, dispatch, element.id, element.type]);

  return (
    <>
      {/* Highlight border */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="#4a90d9"
        strokeWidth={0.5}
        pointerEvents="none"
      />
      {/* Resize handles (corners + edges) */}
      {handles.map((handle) => (
        <rect
          key={handle.id}
          x={handle.cx - halfHs}
          y={handle.cy - halfHs}
          width={hs}
          height={hs}
          fill="#fff"
          stroke="#4a90d9"
          strokeWidth={0.3}
          style={{ cursor: HANDLE_CURSORS[handle.id] }}
          onMouseDown={(e) => handleMouseDown(handle.id, e)}
          data-resize-handle={handle.id}
        />
      ))}
    </>
  );
}

/** Sort elements by z_order for correct rendering order */
function sortByZOrder(elements: TemplateElement[]): TemplateElement[] {
  return [...elements].sort((a, b) => a.z_order - b.z_order);
}

/**
 * Convert pixel coordinates (relative to the SVG element) to mm coordinates
 * relative to the print area (inside margins).
 */
export function pixelToMm(
  pixelX: number,
  pixelY: number,
  svgElement: SVGSVGElement,
  marginMm: number
): { xMm: number; yMm: number } {
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;

  // Scale from pixel space to mm (viewBox) space
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;

  // Convert pixel position to mm in the viewBox coordinate system
  const xInViewBox = pixelX * scaleX;
  const yInViewBox = pixelY * scaleY;

  // Subtract margin to get position relative to print area
  const xMm = xInViewBox - marginMm;
  const yMm = yInViewBox - marginMm;

  return { xMm, yMm };
}

/** Main Canvas component */
export default function Canvas() {
  const { state, dispatch } = useTemplate();
  const { template, selectedElementId } = state;
  const svgRef = useRef<SVGSVGElement>(null);

  const { setNodeRef } = useDroppable({
    id: 'canvas-drop-target',
  });

  // Combine refs: useDroppable's setNodeRef + our svgRef
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
    },
    [setNodeRef]
  );

  if (!template) {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#999',
        }}
        aria-label="Canvas workspace - no template loaded"
      >
        No template loaded
      </div>
    );
  }

  const { size, marginMm, elements } = template;
  const { widthMm, heightMm } = size;

  const handleSelectElement = (id: string, ctrlKey?: boolean) => {
    if (ctrlKey) {
      dispatch({ type: 'TOGGLE_SELECT_ELEMENT', payload: id });
    } else {
      dispatch({ type: 'SELECT_ELEMENT', payload: id });
    }
  };

  const handleDoubleClickElement = (id: string) => {
    // Select element and focus properties panel input
    dispatch({ type: 'SELECT_ELEMENT', payload: id });
    // Focus the first input in properties panel after a tick, cursor at end
    setTimeout(() => {
      const propInput = document.querySelector('[data-prop-primary-input]') as HTMLInputElement | HTMLTextAreaElement | null;
      if (propInput) {
        propInput.focus();
        // Place cursor at the end of the content
        const len = propInput.value.length;
        propInput.setSelectionRange(len, len);
      }
    }, 50);
  };

  const handleCanvasClick = () => {
    dispatch({ type: 'SELECT_ELEMENT', payload: null });
  };

  const sortedElements = sortByZOrder(elements);
  const selectedIds = new Set(state.selectedElementIds);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '1rem',
        background: '#e8e8e8',
      }}
      data-testid="canvas-drop-target"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: `${widthMm} / ${heightMm}`,
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        onClick={handleCanvasClick}
        aria-label={`Template canvas ${widthMm}×${heightMm}mm`}
        role="img"
        data-testid="canvas-svg"
      >
        {/* Page background */}
        <rect x={0} y={0} width={widthMm} height={heightMm} fill="#fff" />

        {/* Margin indicators - dashed rectangle */}
        <rect
          x={marginMm}
          y={marginMm}
          width={widthMm - 2 * marginMm}
          height={heightMm - 2 * marginMm}
          fill="none"
          stroke="#ccc"
          strokeWidth={0.3}
          strokeDasharray="2 1"
          pointerEvents="none"
        />

        {/* Grid lines (5mm intervals) inside print area */}
        <g pointerEvents="none" opacity={0.3}>
          {/* Vertical grid lines */}
          {Array.from({ length: Math.floor((widthMm - 2 * marginMm) / 5) - 1 }, (_, i) => {
            const x = marginMm + (i + 1) * 5;
            return (
              <line
                key={`vg-${i}`}
                x1={x}
                y1={marginMm}
                x2={x}
                y2={heightMm - marginMm}
                stroke="#d0d0d0"
                strokeWidth={0.15}
              />
            );
          })}
          {/* Horizontal grid lines */}
          {Array.from({ length: Math.floor((heightMm - 2 * marginMm) / 5) - 1 }, (_, i) => {
            const y = marginMm + (i + 1) * 5;
            return (
              <line
                key={`hg-${i}`}
                x1={marginMm}
                y1={y}
                x2={widthMm - marginMm}
                y2={y}
                stroke="#d0d0d0"
                strokeWidth={0.15}
              />
            );
          })}
        </g>

        {/* Render elements sorted by z-order */}
        {sortedElements.map((element) => (
          <ElementRenderer
            key={element.id}
            element={element}
            offsetX={marginMm}
            offsetY={marginMm}
            isSelected={selectedIds.has(element.id)}
            onSelect={handleSelectElement}
            onDoubleClick={handleDoubleClickElement}
          />
        ))}
      </svg>
    </div>
  );
}

/** Get the SVG element ref from the Canvas for coordinate calculations */
export function useCanvasSvgRef() {
  return useRef<SVGSVGElement>(null);
}
