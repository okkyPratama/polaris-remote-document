import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Template, TemplateElement, PageSettingsJson } from '../types/template.types'
import { snapToGrid, clampPosition, enforceMinimumSize, getPrintArea, getNextZOrder } from '../utils/canvasUtils'

// --- Constants ---

const MAX_HISTORY = 50

// --- Helper: parse/serialize elements from templateContent ---

export function parseElements(templateContent: string): TemplateElement[] {
  if (!templateContent) return []
  try {
    const parsed = JSON.parse(templateContent)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return [] // Non-JSON content (HTML, ZPL) — no visual elements
  }
}

export function serializeElements(elements: TemplateElement[]): string {
  return JSON.stringify(elements)
}

// --- State ---

export interface TemplateState {
  template: Template | null
  /** Parsed elements from templateContent for WYSIWYG editing */
  elements: TemplateElement[]
  selectedElementId: string | null
  selectedElementIds: string[]
  isDirty: boolean
  clipboard: TemplateElement[]
  history: TemplateElement[][]
  future: TemplateElement[][]
}

const initialState: TemplateState = {
  template: null,
  elements: [],
  selectedElementId: null,
  selectedElementIds: [],
  isDirty: false,
  clipboard: [],
  history: [],
  future: [],
}

// --- Actions ---

export type TemplateAction =
  | { type: 'SET_TEMPLATE'; payload: Template }
  | { type: 'ADD_ELEMENT'; payload: TemplateElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; changes: Partial<TemplateElement> } }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'REMOVE_ELEMENTS'; payload: string[] }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'TOGGLE_SELECT_ELEMENT'; payload: string }
  | { type: 'SELECT_MULTIPLE'; payload: string[] }
  | { type: 'SET_PAGE_SETTINGS'; payload: PageSettingsJson }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_TEMPLATE_TYPE'; payload: string }
  | { type: 'SET_OUTPUT_FORMAT'; payload: string }
  | { type: 'MARK_SAVED'; payload: { id: string } }
  | { type: 'NUDGE_ELEMENTS'; payload: { ids: string[]; dx: number; dy: number } }
  | { type: 'COPY_ELEMENTS'; payload: string[] }
  | { type: 'PASTE_ELEMENTS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }

// --- Helpers ---

function getPageDimensions(settings: PageSettingsJson | null): { widthMm: number; heightMm: number; marginMm: number } {
  if (!settings) return { widthMm: 100, heightMm: 150, marginMm: 5 }
  return { widthMm: settings.widthMm, heightMm: settings.heightMm, marginMm: settings.marginMm }
}

function applySnappingAndClamping(element: TemplateElement, settings: PageSettingsJson | null): TemplateElement {
  const { widthMm, heightMm, marginMm } = getPageDimensions(settings)
  const printArea = getPrintArea(widthMm, heightMm, marginMm)
  const { width, height } = enforceMinimumSize(element.type, element.width_mm, element.height_mm)
  const snappedX = snapToGrid(element.x_mm)
  const snappedY = snapToGrid(element.y_mm)
  const { x, y } = clampPosition(snappedX, snappedY, width, height, printArea.width, printArea.height)
  return { ...element, x_mm: x, y_mm: y, width_mm: width, height_mm: height }
}

function pushToHistory(state: TemplateState): Pick<TemplateState, 'history' | 'future'> {
  const newHistory = [...state.history, state.elements]
  if (newHistory.length > MAX_HISTORY) newHistory.shift()
  return { history: newHistory, future: [] }
}

// --- Reducer ---

function templateReducer(state: TemplateState, action: TemplateAction): TemplateState {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      const elements = parseElements(action.payload.templateContent)
      return { ...state, template: action.payload, elements, selectedElementId: null, selectedElementIds: [], isDirty: false, history: [], future: [] }
    }

    case 'ADD_ELEMENT': {
      const newElement = applySnappingAndClamping(action.payload, state.template?.pageSettingsJson ?? null)
      newElement.z_order = getNextZOrder(state.elements)
      const newElements = [...state.elements, newElement]
      return {
        ...state,
        ...pushToHistory(state),
        elements: newElements,
        selectedElementId: newElement.id,
        selectedElementIds: [newElement.id],
        isDirty: true,
      }
    }

    case 'UPDATE_ELEMENT': {
      const { id, changes } = action.payload
      const idx = state.elements.findIndex((el) => el.id === id)
      if (idx === -1) return state
      let updated = { ...state.elements[idx], ...changes }
      updated = applySnappingAndClamping(updated, state.template?.pageSettingsJson ?? null)
      if (changes.x_mm !== undefined || changes.y_mm !== undefined) {
        updated.z_order = getNextZOrder(state.elements)
      }
      const newElements = [...state.elements]
      newElements[idx] = updated
      return { ...state, ...pushToHistory(state), elements: newElements, isDirty: true }
    }

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload, selectedElementIds: action.payload ? [action.payload] : [] }

    case 'TOGGLE_SELECT_ELEMENT': {
      const id = action.payload
      const ids = state.selectedElementIds.includes(id)
        ? state.selectedElementIds.filter((i) => i !== id)
        : [...state.selectedElementIds, id]
      return { ...state, selectedElementId: ids[ids.length - 1] ?? null, selectedElementIds: ids }
    }

    case 'SELECT_MULTIPLE':
      return { ...state, selectedElementIds: action.payload, selectedElementId: action.payload[action.payload.length - 1] ?? null }

    case 'REMOVE_ELEMENT': {
      const filtered = state.elements.filter((el) => el.id !== action.payload)
      return {
        ...state, ...pushToHistory(state), elements: filtered,
        selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter((i) => i !== action.payload),
        isDirty: true,
      }
    }

    case 'REMOVE_ELEMENTS': {
      const removeSet = new Set(action.payload)
      const filtered = state.elements.filter((el) => !removeSet.has(el.id))
      return { ...state, ...pushToHistory(state), elements: filtered, selectedElementId: null, selectedElementIds: [], isDirty: true }
    }

    case 'SET_PAGE_SETTINGS': {
      if (!state.template) {
        const newTemplate: Template = { id: '', templateCode: '', name: '', templateType: 'GRN', outputFormat: 'PDF', description: '', templateContent: '[]', version: 1, pageSettingsJson: action.payload, isSystemDefault: false, isActive: true, createdBy: '', createdAt: '', updatedBy: '', updatedAt: '' }
        return { ...state, template: newTemplate, isDirty: true }
      }
      const reclampedElements = state.elements.map((el) => applySnappingAndClamping(el, action.payload))
      return { ...state, template: { ...state.template, pageSettingsJson: action.payload }, elements: reclampedElements, isDirty: true }
    }

    case 'SET_NAME': {
      if (!state.template) {
        const newTemplate: Template = { id: '', templateCode: '', name: action.payload, templateType: 'GRN', outputFormat: 'PDF', description: '', templateContent: '[]', version: 1, pageSettingsJson: null, isSystemDefault: false, isActive: true, createdBy: '', createdAt: '', updatedBy: '', updatedAt: '' }
        return { ...state, template: newTemplate, isDirty: true }
      }
      return { ...state, template: { ...state.template, name: action.payload }, isDirty: true }
    }

    case 'SET_TEMPLATE_TYPE': {
      if (!state.template) return state
      return { ...state, template: { ...state.template, templateType: action.payload as Template['templateType'] }, isDirty: true }
    }

    case 'SET_OUTPUT_FORMAT': {
      if (!state.template) return state
      return { ...state, template: { ...state.template, outputFormat: action.payload as Template['outputFormat'] }, isDirty: true }
    }

    case 'MARK_SAVED': {
      if (!state.template) return state
      return { ...state, template: { ...state.template, id: action.payload.id }, isDirty: false }
    }

    case 'NUDGE_ELEMENTS': {
      const { ids, dx, dy } = action.payload
      const idSet = new Set(ids)
      const newElements = state.elements.map((el) => {
        if (!idSet.has(el.id)) return el
        let nudged = { ...el, x_mm: el.x_mm + dx, y_mm: el.y_mm + dy }
        nudged = applySnappingAndClamping(nudged, state.template?.pageSettingsJson ?? null)
        return nudged
      })
      return { ...state, ...pushToHistory(state), elements: newElements, isDirty: true }
    }

    case 'COPY_ELEMENTS': {
      const idSet = new Set(action.payload)
      const copied = state.elements.filter((el) => idSet.has(el.id))
      return { ...state, clipboard: copied }
    }

    case 'PASTE_ELEMENTS': {
      if (state.clipboard.length === 0) return state
      const offset = 2
      const pasted = state.clipboard.map((el) => {
        const newEl: TemplateElement = {
          ...el, id: crypto.randomUUID(), x_mm: el.x_mm + offset, y_mm: el.y_mm + offset, z_order: getNextZOrder(state.elements),
        }
        return applySnappingAndClamping(newEl, state.template?.pageSettingsJson ?? null)
      })
      const newIds = pasted.map((el) => el.id)
      return {
        ...state, ...pushToHistory(state), elements: [...state.elements, ...pasted],
        selectedElementId: newIds[newIds.length - 1] ?? null, selectedElementIds: newIds, isDirty: true,
      }
    }

    case 'UNDO': {
      if (state.history.length === 0) return state
      const newHistory = [...state.history]
      const previousElements = newHistory.pop()!
      return {
        ...state,
        history: newHistory,
        future: [state.elements, ...state.future].slice(0, MAX_HISTORY),
        elements: previousElements,
        selectedElementId: null, selectedElementIds: [], isDirty: true,
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const newFuture = [...state.future]
      const nextElements = newFuture.shift()!
      return {
        ...state,
        history: [...state.history, state.elements].slice(-MAX_HISTORY),
        future: newFuture,
        elements: nextElements,
        selectedElementId: null, selectedElementIds: [], isDirty: true,
      }
    }

    default:
      return state
  }
}

// --- Context ---

interface TemplateContextValue {
  state: TemplateState
  dispatch: React.Dispatch<TemplateAction>
}

const TemplateContext = createContext<TemplateContextValue | null>(null)

// --- Provider ---

interface TemplateProviderProps {
  children: ReactNode
  initialTemplate?: Template
}

export function TemplateProvider({ children, initialTemplate }: TemplateProviderProps) {
  const computedInitialState: TemplateState = initialTemplate
    ? { template: initialTemplate, elements: parseElements(initialTemplate.templateContent), selectedElementId: null, selectedElementIds: [], isDirty: false, clipboard: [], history: [], future: [] }
    : initialState

  const [state, dispatch] = useReducer(templateReducer, computedInitialState)

  return <TemplateContext.Provider value={{ state, dispatch }}>{children}</TemplateContext.Provider>
}

// --- Custom Hook ---

export function useTemplate(): TemplateContextValue {
  const context = useContext(TemplateContext)
  if (!context) throw new Error('useTemplate must be used within a TemplateProvider')
  return context
}
