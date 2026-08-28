import type { RemoteConfig } from './types'

export const gatewayHeaders = {
  appname: import.meta.env?.VITE_APP_NAME || 'polaris',
  appversion: import.meta.env?.VITE_APP_VERSION || '1.0.0',
}

export interface ServiceConfig {
  admin: {
    baseURL: string
    timeout: number
    headers: Record<string, string>
  }
  timeout: number
  env: {
    VITE_API_BASE_URL: string
    VITE_API_TIMEOUT: number
    VITE_URL_HOST: string
    VITE_URL_REMOTE_ADMIN: string
    VITE_URL_REMOTE_MASTER_DATA: string
    VITE_URL_REMOTE_COMMON: string
    VITE_URL_REMOTE_INVENTORY: string
    VITE_URL_REMOTE_INBOUND: string
    VITE_URL_REMOTE_OUTBOUND: string
    VITE_URL_REMOTE_AUDIT: string
    VITE_URL_REMOTE_DOCUMENT: string
    NODE_ENV: string
    APP_ENV: string
  }
  remotes: RemoteConfig[]
}

export const getServiceConfig = (): ServiceConfig => {
  const apiURL = import.meta.env?.VITE_API_BASE_URL ?? ''
  const timeout = parseInt(import.meta.env?.VITE_API_TIMEOUT || '30000')

  // Host
  const host = import.meta.env?.VITE_URL_HOST || ''

  // Remote services
  const remoteAdmin = import.meta.env?.VITE_URL_REMOTE_ADMIN || ''
  const remoteMasterData = import.meta.env?.VITE_URL_REMOTE_MASTER_DATA || ''
  const remoteCommon = import.meta.env?.VITE_URL_REMOTE_COMMON || ''
  const remoteInventory = import.meta.env?.VITE_URL_REMOTE_INVENTORY || ''
  const remoteInbound = import.meta.env?.VITE_URL_REMOTE_INBOUND || ''
  const remoteOutbound = import.meta.env?.VITE_URL_REMOTE_OUTBOUND || ''
  const remoteAudit = import.meta.env?.VITE_URL_REMOTE_AUDIT || ''
  const remoteDocument = import.meta.env?.VITE_URL_REMOTE_DOCUMENT || ''

  // Environment
  const nodeEnv = import.meta.env?.NODE_ENV || ''
  const appEnv = import.meta.env?.APP_ENV || 'development'

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...gatewayHeaders,
  }

  // Remotes configuration
  const remotes: RemoteConfig[] = [
    {
      name: 'remote-admin',
      url: `${remoteAdmin}/assets/remoteEntry.js`,
      format: 'esm',
      from: 'vite',
      modules: ['company-groups', 'companies', 'warehouse', 'roles', 'users', 'settings'],
    },
    {
      name: 'remote-master-data',
      url: `${remoteMasterData}/assets/remoteEntry.js`,
      format: 'esm',
      from: 'vite',
      modules: [],
    },
    {
      name: 'remote-document',
      url: `${remoteDocument}/assets/remoteEntry.js`,
      format: 'esm',
      from: 'vite',
      modules: ['templates', 'template-editor'],
    },
  ]

  return {
    admin: {
      baseURL: apiURL ? `${apiURL}/api/v1` : '/api/v1',
      timeout,
      headers: defaultHeaders,
    },
    timeout,
    env: {
      VITE_API_BASE_URL: apiURL,
      VITE_API_TIMEOUT: timeout,
      VITE_URL_HOST: host,
      VITE_URL_REMOTE_ADMIN: remoteAdmin,
      VITE_URL_REMOTE_MASTER_DATA: remoteMasterData,
      VITE_URL_REMOTE_COMMON: remoteCommon,
      VITE_URL_REMOTE_INVENTORY: remoteInventory,
      VITE_URL_REMOTE_INBOUND: remoteInbound,
      VITE_URL_REMOTE_OUTBOUND: remoteOutbound,
      VITE_URL_REMOTE_AUDIT: remoteAudit,
      VITE_URL_REMOTE_DOCUMENT: remoteDocument,
      NODE_ENV: nodeEnv,
      APP_ENV: appEnv,
    },
    remotes,
  }
}

export const config = getServiceConfig()
