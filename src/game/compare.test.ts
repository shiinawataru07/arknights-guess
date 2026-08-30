import { describe, expect, it } from 'vitest'
import { compareOperators, compareValue } from './compare'
import type { Operator } from './types'

const base: Operator = {
  id: 'char_answer',
  name: '答案',
  rarity: 6,
  profession: '近卫',
  subProfession: '领主',
  position: '近战位',
  gender: '女',
  race: '菲林',
  attack: 700,
  releaseDate: '2024-05-01',
}

describe('compareOperators', () => {
  it('将完全相同的属性标记为正确', () => {
    const result = compareOperators(base, base)
    expect(result.isCorrect).toBe(true)
    expect(Object.values(result.cells).every((cell) => cell.state === 'correct')).toBe(true)
  })

  it('按答案相对猜测值的方向给出箭头', () => {
    const result = compareOperators(
      { ...base, id: 'guess', rarity: 5, attack: 800, releaseDate: '2023-01-01' },
      base,
    )
    expect(result.cells.rarity.direction).toBe('up')
    expect(result.cells.attack.direction).toBe('down')
    expect(result.cells.releaseDate.direction).toBe('up')
  })

  it('分类属性不同不提供方向', () => {
    const result = compareOperators({ ...base, id: 'guess', profession: '术师' }, base)
    expect(result.cells.profession).toMatchObject({ state: 'wrong', direction: null })
  })

  it('任一侧数据为空时返回未知', () => {
    expect(compareValue('race', null, '萨卡兹').state).toBe('unknown')
    expect(compareValue('attack', 500, null).direction).toBeNull()
  })
})

