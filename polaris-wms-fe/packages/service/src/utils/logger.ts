// ═══════════════════════════════════════════════════════
// Structured Logger
// JSON-formatted, aligned with backend logging standard
// ═══════════════════════════════════════════════════════

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  traceId?: string
  userId?: string
  action?: string
  module?: string
  [key: string]: unknown
}

function createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context || {}),
    ...(error && {
      errorMessage: error.message,
      errorStack: error.stack,
    }),
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.log('[INFO]', message, context || '')
    }
    // In production, send to logging service
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify(createLogEntry('warn', message, context)))
  },

  error: (message: string, error?: Error, context?: LogContext) => {
    console.error(JSON.stringify(createLogEntry('error', message, context, error)))
    // TODO: Send to Sentry or error tracking service
    // captureException(error, context)
  },

  debug: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', message, context || '')
    }
  },
}
