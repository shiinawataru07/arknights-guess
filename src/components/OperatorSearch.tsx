import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Operator } from '../game/types'

interface OperatorSearchProps {
  operators: Operator[]
  guessedIds: Set<string>
  disabled?: boolean
  onGuess: (operator: Operator) => void
  onSurrender: () => void
}

export function OperatorSearch({
  operators,
  guessedIds,
  disabled = false,
  onGuess,
  onSurrender,
}: OperatorSearchProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Operator | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return operators
      .filter((operator) => !guessedIds.has(operator.id))
      .filter((operator) => !keyword || operator.name.toLocaleLowerCase('zh-CN').includes(keyword))
      .slice(0, 8)
  }, [guessedIds, operators, query])

  useEffect(() => {
    setActiveIndex(0)
    if (selected && selected.name !== query) setSelected(null)
  }, [query, selected])

  function choose(operator: Operator) {
    setSelected(operator)
    setQuery(operator.name)
    setOpen(false)
    inputRef.current?.focus()
  }

  function submit() {
    const exact = operators.find(
      (operator) => !guessedIds.has(operator.id) && operator.name === query.trim(),
    )
    const operator = selected ?? exact
    if (!operator || disabled) return
    onGuess(operator)
    setQuery('')
    setSelected(null)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && suggestions[activeIndex]) choose(suggestions[activeIndex])
      else submit()
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const canSubmit = Boolean(
    selected ??
      operators.find(
        (operator) => !guessedIds.has(operator.id) && operator.name === query.trim(),
      ),
  )

  return (
    <div className="search-panel">
      <div className="search-label-row">
        <label htmlFor="operator-search">输入干员代号</label>
        <span>{guessedIds.size === 0 ? '从任意干员开始' : `已排除 ${guessedIds.size} 名`}</span>
      </div>
      <div className="search-controls">
        <div className="combobox-wrap">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            id="operator-search"
            type="text"
            value={query}
            disabled={disabled}
            autoComplete="off"
            placeholder="搜索中文干员名…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onKeyDown={handleKeyDown}
          />
          {open && !disabled && (
            <ul id={listId} className="suggestions" role="listbox">
              {suggestions.length > 0 ? (
                suggestions.map((operator, index) => (
                  <li
                    id={`${listId}-${index}`}
                    key={operator.id}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={activeIndex === index ? 'active' : ''}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(operator)}
                  >
                    <span>{operator.name}</span>
                    <small>{operator.rarity}★ · {operator.profession} · {operator.subProfession ?? '未知分支'}</small>
                  </li>
                ))
              ) : (
                <li className="no-result">没有可选的匹配干员</li>
              )}
            </ul>
          )}
        </div>
        <button type="button" className="guess-button" disabled={!canSubmit || disabled} onClick={submit}>
          确认猜测
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          className="surrender-button"
          disabled={disabled}
          onClick={onSurrender}
        >
          认输 / 看答案
        </button>
      </div>
    </div>
  )
}
