import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

/**
 * Toaster provider — taruh 1x di root app (biasanya di layout).
 * Position default: top-right, sesuai standard.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: "'Roboto', system-ui, sans-serif",
          fontSize: '13px',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0,24,113,0.1)',
        },
        classNames: {
          success: 'border-l-4 !border-l-[#55bf59]',
          error: 'border-l-4 !border-l-[#ef3340]',
          warning: 'border-l-4 !border-l-[#e97b2e]',
          info: 'border-l-4 !border-l-[#001871]',
        },
      }}
      richColors
      closeButton
    />
  )
}

/**
 * Toast helper — sesuai §8.5 Tabular Data & UX States Standard:
 * - Success: auto-dismiss 5 detik
 * - Error: stay sampai user dismiss
 * - Warning: stay sampai user dismiss
 * - Info: auto-dismiss 3 detik
 */
export const toast = {
  success: (title: string, message?: string) =>
    sonnerToast.success(title, { description: message, duration: 5000 }),

  error: (title: string, message?: string) =>
    sonnerToast.error(title, { description: message, duration: 5000 }),

  warning: (title: string, message?: string) =>
    sonnerToast.warning(title, { description: message, duration: 5000 }),

  info: (title: string, message?: string) =>
    sonnerToast.info(title, { description: message, duration: 3000 }),
}
