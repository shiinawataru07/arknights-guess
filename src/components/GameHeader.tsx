interface GameHeaderProps {
  operatorCount: number
  round: number
}

export function GameHeader({ operatorCount, round }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="brand-mark" aria-hidden="true">
        <span>R</span>
      </div>
      <div className="brand-copy">
        <p className="eyebrow">RHODES ISLAND · HR ARCHIVE</p>
        <h1>干员识别测试</h1>
      </div>
      <div className="round-chip" aria-label={`当前第 ${round} 局`}>
        <span>ROUND</span>
        <strong>{String(round).padStart(2, '0')}</strong>
        <small>{operatorCount} 名干员</small>
      </div>
    </header>
  )
}

