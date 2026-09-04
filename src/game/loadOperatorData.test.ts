import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadOperatorData } from './loadOperatorData'

afterEach(() => vi.unstubAllGlobals())

describe('operator data loading', () => {
  it('loads the portable snapshot without making a network request', async () => {
    const network = vi.fn(() => { throw new Error('offline') })
    vi.stubGlobal('fetch', network)
    const snapshot = { meta: { count: 1 }, operators: [{ id: 'example' }] }
    expect(await loadOperatorData(JSON.stringify(snapshot))).toEqual(snapshot)
    expect(network).not.toHaveBeenCalled()
  })

  it('keeps the normal web build loading the local JSON file', async () => {
    const snapshot = { operators: [] }
    const network = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot })
    vi.stubGlobal('fetch', network)
    expect(await loadOperatorData()).toEqual(snapshot)
    expect(network).toHaveBeenCalledWith('/data/operators.json')
  })

  it('reports invalid embedded data without falling back to networking', async () => {
    const network = vi.fn()
    vi.stubGlobal('fetch', network)
    await expect(loadOperatorData('invalid')).rejects.toThrow()
    expect(network).not.toHaveBeenCalled()
  })
})
