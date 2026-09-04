import type { OperatorData } from './types'

// Portable HTML contains its snapshot inline, so file:// never needs fetch.
// The normal Vite/web build continues to use the local static JSON file.
export async function loadOperatorData(embeddedJson?: string | null): Promise<OperatorData> {
  if (embeddedJson != null) return JSON.parse(embeddedJson) as OperatorData
  const response = await fetch(`${import.meta.env.BASE_URL}data/operators.json`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<OperatorData>
}
