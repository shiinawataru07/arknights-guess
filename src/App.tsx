import { useEffect, useMemo, useState } from 'react'
import { GameHeader } from './components/GameHeader'
import { GuessBoard } from './components/GuessBoard'
import { OperatorSearch } from './components/OperatorSearch'
import { ResultCard } from './components/ResultCard'
import { compareOperators } from './game/compare'
import { loadOperatorData } from './game/loadOperatorData'
import type { GuessResult, Operator } from './game/types'

function randomOperator(operators: Operator[], previousId?: string): Operator {
  const pool = operators.length > 1 ? operators.filter((operator) => operator.id !== previousId) : operators
  const randomValues = new Uint32Array(1)
  crypto.getRandomValues(randomValues)
  return pool[randomValues[0] % pool.length]
}

export default function App() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [answer, setAnswer] = useState<Operator | null>(null)
  const [guesses, setGuesses] = useState<GuessResult[]>([])
  const [surrendered, setSurrendered] = useState(false)
  const [round, setRound] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadOperatorData(document.getElementById('operator-data')?.textContent)
      .then((data) => {
        if (!active) return
        if (!Array.isArray(data.operators) || data.operators.length === 0) {
          throw new Error('数据文件中没有干员')
        }
        setOperators(data.operators)
        setAnswer(randomOperator(data.operators))
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : '未知错误')
      })
    return () => { active = false }
  }, [])

  const won = guesses.some((guess) => guess.isCorrect)
  const roundEnded = won || surrendered
  const guessedIds = useMemo(() => new Set(guesses.map((guess) => guess.operator.id)), [guesses])

  function makeGuess(operator: Operator) {
    if (!answer || roundEnded || guessedIds.has(operator.id)) return
    setGuesses((current) => [compareOperators(operator, answer), ...current])
  }

  function nextRound() {
    if (!answer) return
    setAnswer(randomOperator(operators, answer.id))
    setGuesses([])
    setSurrendered(false)
    setRound((current) => current + 1)
  }

  return (
    <main className="app-shell">
      <div className="top-rule" aria-hidden="true"><span /></div>
      <GameHeader operatorCount={operators.length} round={round} />

      <section className="play-area" aria-label="猜干员游戏">
        <div className="briefing">
          <div>
            <p className="eyebrow">OPERATOR IDENTIFICATION PROTOCOL</p>
            <h2>锁定一名未知干员</h2>
          </div>
          <p>绿色代表完全一致；箭头指向答案更高或更晚的方向。用尽可能少的档案比对完成识别。</p>
        </div>

        {loadError ? (
          <div className="error-state" role="alert">
            <strong>干员档案载入失败</strong>
            <span>{loadError}。请确认 public/data/operators.json 已生成。</span>
          </div>
        ) : (
          <OperatorSearch
            operators={operators}
            guessedIds={guessedIds}
            disabled={!answer || roundEnded}
            onGuess={makeGuess}
            onSurrender={() => setSurrendered(true)}
          />
        )}

        {roundEnded && answer && (
          <ResultCard
            answer={answer}
            guessCount={guesses.length}
            surrendered={surrendered}
            onNext={nextRound}
          />
        )}

        <div className="legend" aria-label="比对结果图例">
          <span><i className="legend-correct" />完全一致</span>
          <span><i className="legend-wrong" />属性不同</span>
          <span><b>↑</b> 答案更高 / 更晚</span>
          <span><b>↓</b> 答案更低 / 更早</span>
        </div>

        <GuessBoard guesses={guesses} />
      </section>

      <footer>
        <span>DATA TERMINAL / CN SERVER</span>
        <details>
          <summary>规则说明</summary>
          <p>星级、攻击力和实装日期按数值比较；其余属性只判断相同或不同。攻击力不含潜能、信赖、模组、技能与天赋。</p>
        </details>
      </footer>
    </main>
  )
}
