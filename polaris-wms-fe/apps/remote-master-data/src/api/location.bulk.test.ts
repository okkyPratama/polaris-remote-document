import { describe, expect, it } from 'vitest'
import { extractLocationBulkFailure } from '../api/location.api'

describe('extractLocationBulkFailure', () => {
  it('extracts valid row-error payload from ResponseContent shape', () => {
    const result = extractLocationBulkFailure({
      httpCode: 400,
      status: 400,
      message: 'Failed',
      errorMessage: ['Bulk location creation failed validation. No records were created.'],
      data: {
        data: [
          {
            createdCount: 0,
            errors: [
              { index: 0, code: 'LOC-1', messages: ['zoneId is required.'] },
              { index: 2, code: 'LOC-3', messages: ['locationType is invalid.'] },
            ],
          },
        ],
      },
    })

    expect(result.message).toContain('Bulk location creation failed')
    expect(result.createdCount).toBe(0)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toEqual({
      index: 0,
      code: 'LOC-1',
      messages: ['zoneId is required.'],
    })
    expect(result.errors[1].index).toBe(2)
  })

  it('handles missing optional data', () => {
    const result = extractLocationBulkFailure({
      httpCode: 400,
      status: 400,
      message: 'Failed',
      errorMessage: ['Bulk location creation failed validation. No records were created.'],
    })

    expect(result.createdCount).toBe(0)
    expect(result.errors).toEqual([])
    expect(result.message).toContain('Bulk location creation failed')
  })

  it('handles multiple row errors and batch message with createdCount 0', () => {
    const result = extractLocationBulkFailure({
      httpCode: 400,
      status: 400,
      message: 'Failed',
      errorMessage: ['Bulk location creation failed validation. No records were created.'],
      data: {
        createdCount: 0,
        errors: [
          { index: 0, code: 'A', messages: ['duplicate'] },
          { index: 1, code: 'B', messages: ['invalid'] },
          { index: 1, code: 'B', messages: ['also invalid'] },
        ],
      },
    })

    expect(result.createdCount).toBe(0)
    expect(result.errors).toHaveLength(3)
    expect(result.message).toBe(
      'Bulk location creation failed validation. No records were created.'
    )
  })

  it('unwraps array-shaped data payloads', () => {
    const result = extractLocationBulkFailure({
      httpCode: 400,
      status: 400,
      message: 'Failed',
      errorMessage: [],
      data: [{ createdCount: 0, errors: [{ index: 1, messages: ['bad'] }] }],
    })

    expect(result.errors[0]?.index).toBe(1)
    expect(result.errors[0]?.messages).toEqual(['bad'])
  })
})
