import type { ComparisonCell, ComparisonKey, GuessResult } from '../game/types'

const columns: Array<{ key: ComparisonKey; label: string }> = [
  { key: 'rarity', label: '星级' },
  { key: 'profession', label: '职业' },
  { key: 'subProfession', label: '分支职业' },
  { key: 'position', label: '部署位' },
  { key: 'gender', label: '性别' },
  { key: 'race', label: '种族' },
  { key: 'attack', label: '攻击力' },
  { key: 'releaseDate', label: '实装日期' },
]

function formatValue(cell: ComparisonCell) {
  if (cell.value === null) return '未知'
  if (cell.key === 'rarity') return `${cell.value}★`
  return String(cell.value)
}

export function GuessBoard({ guesses }: { guesses: GuessResult[] }) {
  if (guesses.length === 0) {
    return (
      <div className="empty-board">
        <span className="scanner" aria-hidden="true" />
        <div>
          <strong>等待首次识别</strong>
          <p>提交一名干员后，档案比对结果会显示在这里。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="board-scroll" tabIndex={0} aria-label="猜测结果，可横向滚动">
      <table className="guess-board">
        <thead>
          <tr>
            <th scope="col">干员</th>
            {columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {guesses.map((guess, rowIndex) => (
            <tr key={guess.operator.id} style={{ '--row-index': rowIndex } as React.CSSProperties}>
              <th scope="row">
                <span className="guess-order">#{String(guesses.length - rowIndex).padStart(2, '0')}</span>
                <strong>{guess.operator.name}</strong>
              </th>
              {columns.map(({ key }) => {
                const cell = guess.cells[key]
                const directionLabel = cell.direction === 'up' ? '答案更高' : '答案更低'
                return (
                  <td key={key} className={`cell-${cell.state}`}>
                    <span>{formatValue(cell)}</span>
                    {cell.direction && (
                      <b className={`arrow arrow-${cell.direction}`} aria-label={directionLabel}>
                        {cell.direction === 'up' ? '↑' : '↓'}
                      </b>
                    )}
                    {cell.state === 'unknown' && <b className="unknown-mark" aria-label="数据未知">?</b>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

