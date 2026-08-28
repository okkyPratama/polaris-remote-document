import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { PageSize, Template, TemplateElement } from '@/types/template';
import {
  clampPosition,
  enforceMinimumSize,
  getNextZOrder,
  getPrintArea,
  snapToGrid,
} from '@/utils/canvasUtils';

// --- Constants ---

const MAX_HISTORY = 50; // Max undo steps

// --- State ---

export interface TemplateState {
  template: Template | null;
  selectedElementId: string | null;
  /** Multi-select: IDs of all selected elements (includes selectedElementId) */
  selectedElementIds: string[];
  isDirty: boolean;
  /** Clipboard for copy/paste */
  clipboard: TemplateElement[];
  /** Undo history stack (past template snapshots) */
  history: Template[];
  /** Redo stack (future template snapshots) */
  future: Template[];
}

const initialState: TemplateState = {
  template: null,
  selectedElementId: null,
  selectedElementIds: [],
  isDirty: false,
  clipboard: [],
  history: [],
  future: [],
};

// --- Actions ---

export type TemplateAction =
  | { type: 'SET_TEMPLATE'; payload: Template }
  | { type: 'ADD_ELEMENT'; payload: TemplateElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; changes: Partial<TemplateElement> } }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'TOGGLE_SELECT_ELEMENT'; payload: string }
  | { type: 'SELECT_MULTIPLE'; payload: string[] }
  | { type: 'SET_SIZE'; payload: { size: PageSize; marginMm: number } }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_MARGIN'; payload: number }
  | { type: 'SET_TEMPLATE_TYPE'; payload: string }
  | { type: 'SET_OUTPUT_FORMAT'; payload: string }
  | { type: 'MARK_SAVED'; payload: { id: string } }
  | { type: 'NUDGE_ELEMENTS'; payload: { ids: string[]; dx: number; dy: number } }
  | { type: 'COPY_ELEMENTS'; payload: string[] }
  | { type: 'PASTE_ELEMENTS' }
  | { type: 'REMOVE_ELEMENTS'; payload: string[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// --- Helpers ---

function applySnappingAndClamping(
  element: TemplateElement,
  size: PageSize,
  marginMm: number
): TemplateElement {
  const printArea = getPrintArea(size.widthMm, size.heightMm, marginMm);
  const { width, height } = enforceMinimumSize(element.type, element.width_mm, element.height_mm);
  const snappedX = snapToGrid(element.x_mm);
  const snappedY = snapToGrid(element.y_mm);
  const { x, y } = clampPosition(snappedX, snappedY, width, height, printArea.width, printArea.height);

  return { ...element, x_mm: x, y_mm: y, width_mm: width, height_mm: height };
}

/** Push current template to history stack (for undo). Clears redo stack. */
function pushToHistory(state: TemplateState): Pick<TemplateState, 'history' | 'future'> {
  if (!state.template) return { history: state.history, future: [] };
  const newHistory = [...state.history, state.template];
  // Cap history size
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { history: newHistory, future: [] };
}

// --- Reducer ---

function templateReducer(state: TemplateState, action: TemplateAction): TemplateState {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return { ...state, template: action.payload, selectedElementId: null, selectedElementIds: [], isDirty: false };

    case 'ADD_ELEMENT': {
      if (!state.template) return state;
      const newElement = applySnappingAndClamping(action.payload, state.template.size, state.template.marginMm);
      newElement.z_order = getNextZOrder(state.template.elements);
      return {
        ...state,
        ...pushToHistory(state),
        template: { ...state.template, elements: [...state.template.elements, newElement] },
        selectedElementId: newElement.id,
        selectedElementIds: [newElement.id],
        isDirty: true,
      };
    }

    case 'UPDATE_ELEMENT': {
      if (!state.template) return state;
      const { id, changes } = action.payload;
      const idx = state.template.elements.findIndex(el => el.id === id);
      if (idx === -1) return state;
      let updated = { ...state.template.elements[idx], ...changes };
      updated = applySnappingAndClamping(updated, state.template.size, state.template.marginMm);
      if (changes.x_mm !== undefined || changes.y_mm !== undefined) {
        updated.z_order = getNextZOrder(state.template.elements);
      }
      const newElements = [...state.template.elements];
      newElements[idx] = updated;
      return { ...state, ...pushToHistory(state), template: { ...state.template, elements: newElements }, isDirty: true };
    }

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload, selectedElementIds: action.payload ? [action.payload] : [] };

    case 'TOGGLE_SELECT_ELEMENT': {
      const id = action.payload;
      const ids = state.selectedElementIds.includes(id)
        ? state.selectedElementIds.filter(i => i !== id)
        : [...state.selectedElementIds, id];
      return { ...state, selectedElementId: ids[ids.length - 1] ?? null, selectedElementIds: ids };
    }

    case 'SELECT_MULTIPLE':
      return { ...state, selectedElementIds: action.payload, selectedElementId: action.payload[action.payload.length - 1] ?? null };

    case 'REMOVE_ELEMENT': {
      if (!state.template) return state;
      const filtered = state.template.elements.filter(el => el.id !== action.payload);
      return {
        ...state,
        ...pushToHistory(state),
        template: { ...state.template, elements: filtered },
        selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter(i => i !== action.payload),
        isDirty: true,
      };
    }

    case 'REMOVE_ELEMENTS': {
      if (!state.template) return state;
      const removeSet = new Set(action.payload);
      const filtered = state.template.elements.filter(el => !removeSet.has(el.id));
      return {
        ...state,
        ...pushToHistory(state),
        template: { ...state.template, elements: filtered },
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    }

    case 'SET_SIZE': {
      if (!state.template) {
        return { ...state, template: { id: '', name: '', size: action.payload.size, marginMm: action.payload.marginMm, elements: [], created_at: '', updated_at: '' }, isDirty: true };
      }
      const reclampedElements = state.template.elements.map(el => applySnappingAndClamping(el, action.payload.size, action.payload.marginMm));
      return { ...state, template: { ...state.template, size: action.payload.size, marginMm: action.payload.marginMm, elements: reclampedElements }, isDirty: true };
    }

    case 'SET_NAME': {
      if (!state.template) {
        return { ...state, template: { id: '', name: action.payload, size: { type: 'thermal_a6', widthMm: 100, heightMm: 150, orientation: 'portrait' }, marginMm: 3.0, elements: [], created_at: '', updated_at: '' }, isDirty: true };
      }
      return { ...state, template: { ...state.template, name: action.payload }, isDirty: true };
    }

    case 'SET_MARGIN': {
      if (!state.template) return state;
      const reclampedElements = state.template.elements.map(el => applySnappingAndClamping(el, state.template!.size, action.payload));
      return { ...state, template: { ...state.template, marginMm: action.payload, elements: reclampedElements }, isDirty: true };
    }
    case 'SET_TEMPLATE_TYPE': {
      if (!state.template) return state;
      return { ...state, template: { ...state.template, template_type: action.payload as Template['template_type'] }, isDirty: true };
    }

    case 'SET_OUTPUT_FORMAT': {
      if (!state.template) return state;
      return { ...state, template: { ...state.template, output_format: action.payload as Template['output_format'] }, isDirty: true };
    }

    case 'MARK_SAVED': {
      if (!state.template) return state;
      return { ...state, template: { ...state.template, id: action.payload.id }, isDirty: false };
    }

    case 'NUDGE_ELEMENTS': {
      if (!state.template) return state;
      const { ids, dx, dy } = action.payload;
      const idSet = new Set(ids);
      const newElements = state.template.elements.map(el => {
        if (!idSet.has(el.id)) return el;
        let updated = { ...el, x_mm: el.x_mm + dx, y_mm: el.y_mm + dy };
        updated = applySnappingAndClamping(updated, state.template!.size, state.template!.marginMm);
        return updated;
      });
      return { ...state, ...pushToHistory(state), template: { ...state.template, elements: newElements }, isDirty: true };
    }

    case 'COPY_ELEMENTS': {
      if (!state.template) return state;
      const idSet = new Set(action.payload);
      const copied = state.template.elements.filter(el => idSet.has(el.id));
      return { ...state, clipboard: copied };
    }

    case 'PASTE_ELEMENTS': {
      if (!state.template || state.clipboard.length === 0) return state;
      const offset = 2; // mm offset for pasted elements
      const pasted = state.clipboard.map(el => {
        const newEl: TemplateElement = {
          ...el,
          id: crypto.randomUUID(),
          x_mm: el.x_mm + offset,
          y_mm: el.y_mm + offset,
          z_order: getNextZOrder(state.template!.elements),
        };
        return applySnappingAndClamping(newEl, state.template!.size, state.template!.marginMm);
      });
      const newIds = pasted.map(el => el.id);
      return {
        ...state,
        ...pushToHistory(state),
        template: { ...state.template, elements: [...state.template.elements, ...pasted] },
        selectedElementId: newIds[newIds.length - 1] ?? null,
        selectedElementIds: newIds,
        isDirty: true,
      };
    }

    case 'UNDO': {
      if (state.history.length === 0 || !state.template) return state;
      const newHistory = [...state.history];
      const previousTemplate = newHistory.pop()!;
      return {
        ...state,
        history: newHistory,
        future: [state.template, ...state.future].slice(0, MAX_HISTORY),
        template: previousTemplate,
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.future.length === 0 || !state.template) return state;
      const newFuture = [...state.future];
      const nextTemplate = newFuture.shift()!;
      return {
        ...state,
        history: [...state.history, state.template].slice(-MAX_HISTORY),
        future: newFuture,
        template: nextTemplate,
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

// --- Context ---

interface TemplateContextValue {
  state: TemplateState;
  dispatch: React.Dispatch<TemplateAction>;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

// --- Provider ---

interface TemplateProviderProps {
  children: ReactNode;
  initialTemplate?: Template;
}

export function TemplateProvider({ children, initialTemplate }: TemplateProviderProps) {
  const computedInitialState: TemplateState = initialTemplate
    ? { template: initialTemplate, selectedElementId: null, selectedElementIds: [], isDirty: false, clipboard: [], history: [], future: [] }
    : initialState;

  const [state, dispatch] = useReducer(templateReducer, computedInitialState);

  return (
    <TemplateContext.Provider value={{ state, dispatch }}>
      {children}
    </TemplateContext.Provider>
  );
}

// --- Custom Hook ---

export function useTemplate(): TemplateContextValue {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
}
