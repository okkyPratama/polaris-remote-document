export interface CodeDetail {
  id: string
  codeId: string
  codeName: string
  sequence: number
  ownerId: string
  ownerName: string
  warehouseId: string
  warehouseName: string
  status: 'AKTIF' | 'NONAKTIF'
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface Code {
  id: string
  typeCode: string
  typeCodeDescription: string
  isSystem: boolean
  status: 'AKTIF' | 'NONAKTIF'
  detailCount: number
  details?: CodeDetail[]
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}
