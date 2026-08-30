import type { Operator } from '../game/types'

interface ResultCardProps {
  answer: Operator
  guessCount: number
  surrendered?: boolean
  onNext: () => void
}

export function ResultCard({ answer, guessCount, surrendered = false, onNext }: ResultCardProps) {
  return (
    <section className={`result-card${surrendered ? ' result-card-surrendered' : ''}`} aria-live="polite">
      <div className="success-code" aria-hidden="true">{surrendered ? '!' : '✓'}</div>
      <div className="result-copy">
        <p className="eyebrow">{surrendered ? 'ANSWER REVEALED' : 'IDENTITY CONFIRMED'}</p>
        <h2>{surrendered ? '本轮答案' : '识别成功'}：{answer.name}</h2>
        <p>
          {surrendered ? '认输前已进行' : '本轮共进行'} <strong>{guessCount}</strong> 次猜测。
        </p>
      </div>
      <button type="button" onClick={onNext}>
        开始下一局 <span aria-hidden="true">↗</span>
      </button>
    </section>
  )
}
