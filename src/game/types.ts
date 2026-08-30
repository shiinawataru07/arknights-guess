export interface Operator {
  id: string
  name: string
  rarity: number
  profession: string
  subProfession: string | null
  position: string
  gender: string | null
  race: string | null
  attack: number | null
  releaseDate: string | null
}

export interface OperatorData {
  meta: {
    count: number
    generatedAt: string
    sources: string[]
  }
  operators: Operator[]
}

export const comparisonKeys = [
  'rarity',
  'profession',
  'subProfession',
  'position',
  'gender',
  'race',
  'attack',
  'releaseDate',
] as const

export type ComparisonKey = (typeof comparisonKeys)[number]
export type ComparisonState = 'correct' | 'wrong' | 'unknown'
export type Direction = 'up' | 'down' | null

export interface ComparisonCell {
  key: ComparisonKey
  value: string | number | null
  state: ComparisonState
  direction: Direction
}

export interface GuessResult {
  operator: Operator
  isCorrect: boolean
  cells: Record<ComparisonKey, ComparisonCell>
}

