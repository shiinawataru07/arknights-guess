import {
  comparisonKeys,
  type ComparisonCell,
  type ComparisonKey,
  type GuessResult,
  type Operator,
} from './types'

const orderedKeys = new Set<ComparisonKey>(['rarity', 'attack', 'releaseDate'])

function comparableValue(key: ComparisonKey, value: string | number): number {
  if (key === 'releaseDate') {
    return Date.parse(String(value))
  }
  return Number(value)
}

export function compareValue(
  key: ComparisonKey,
  guessValue: string | number | null,
  answerValue: string | number | null,
): ComparisonCell {
  if (guessValue === null || answerValue === null) {
    return { key, value: guessValue, state: 'unknown', direction: null }
  }

  if (guessValue === answerValue) {
    return { key, value: guessValue, state: 'correct', direction: null }
  }

  if (!orderedKeys.has(key)) {
    return { key, value: guessValue, state: 'wrong', direction: null }
  }

  const guessNumber = comparableValue(key, guessValue)
  const answerNumber = comparableValue(key, answerValue)

  if (!Number.isFinite(guessNumber) || !Number.isFinite(answerNumber)) {
    return { key, value: guessValue, state: 'unknown', direction: null }
  }

  return {
    key,
    value: guessValue,
    state: 'wrong',
    direction: answerNumber > guessNumber ? 'up' : 'down',
  }
}

export function compareOperators(guess: Operator, answer: Operator): GuessResult {
  const cells = Object.fromEntries(
    comparisonKeys.map((key) => [key, compareValue(key, guess[key], answer[key])]),
  ) as Record<ComparisonKey, ComparisonCell>

  return {
    operator: guess,
    isCorrect: guess.id === answer.id,
    cells,
  }
}

