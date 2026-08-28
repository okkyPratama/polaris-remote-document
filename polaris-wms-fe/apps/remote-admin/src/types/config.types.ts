export interface ConfigHeader {
  id: string
  configKey: string
  configValue: string
  dataType: 'INT' | 'DECIMAL' | 'STRING' | 'BOOLEAN' | 'JSON'
  description?: string
  scope?: string
  category?: string
  configGroup?: string
  typeCode?: string
  status: 'ACTIVE' | 'INACTIVE'
  detailCount: number
  details?: ConfigDetail[]
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface ConfigDetail {
  id: string
  configId: string
  configKey?: string
  productId?: string
  productName?: string
  ownerId?: string
  ownerName?: string
  warehouseId?: string
  warehouseName?: string
  companyId?: string
  companyName?: string
  configValue: string
  status?: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface ConfigResolved {
  configKey: string
  resolvedValue: string
  dataType: string
  resolvedFrom: 'HEADER' | 'PRODUCT' | 'OWNER' | 'WAREHOUSE' | 'COMPANY' | 'CUSTOMER_WAREHOUSE'
  scopeId?: string
  scopeName?: string
}

