import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, Award, BookOpen, Check, Clock3, Crown, Eraser, Lightbulb, Menu,
  LogOut, Moon, Pause, Pencil, Play, RotateCcw, Sparkles, Sun, Trophy, Undo2, X,
} from 'lucide-react'
import { createConsumer } from '@rails/actioncable'
import { createPuzzle, DIFFICULTIES, formatTime, isConflict } from './sudoku'
import { API_BASE, apiFetch } from './api'
import AuthScreen from './AuthScreen'
import UiKit from './UiKit'
import './style.css'

const STORAGE_KEY = 'sudoku-current-game-v1'
const EMPTY_NOTES = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
const cloneBoard = (board) => board.map((row) => [...row])
const cloneNotes = (notes) => notes.map((row) => row.map((cell) => [...cell]))
const prettyDifficulty = (difficulty) => DIFFICULTIES[difficulty]?.label || 'Легкий'

function readSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

function readAccountGame(userId) {
  try { return JSON.parse(localStorage.getItem(`sudoku-user-${userId}-game-v1`) || 'null') } catch { return null }
}

function payloadOf(game) {
  return {
    difficulty: game.difficulty,
    puzzle: game.puzzle,
    solution: game.solution,
    board: game.board,
    notes: game.notes,
    mistakes: game.mistakes,
    elapsed_seconds: game.elapsedSeconds,
    completed: game.completed,
    player_name: game.playerName || null,
  }
}

function normalizeGame(data) {
  return {
    puzzle: data.puzzle,
    solution: data.solution,
    board: data.board,
    notes: data.notes?.length ? data.notes : EMPTY_NOTES(),
    difficulty: data.difficulty,
    mistakes: data.mistakes || 0,
    elapsedSeconds: data.elapsed_seconds ?? data.elapsedSeconds ?? 0,
    completed: data.completed || false,
    playerName: data.player_name || data.playerName || '',
    id: data.id,
  }
}

function App() {
  const saved = useRef(readSaved()).current
  const [game, setGame] = useState(() => saved?.game ? normalizeGame(saved.game) : createPuzzle('easy'))
  const [gameId, setGameId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountReady, setAccountReady] = useState(false)
  const [screen, setScreen] = useState('game')
  const [selected, setSelected] = useState([4, 4])
  const [notesMode, setNotesMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('sudoku-player-name') || '')
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('sudoku-theme') || 'system')
  const [mistakeMark, setMistakeMark] = useState(null)
  const history = useRef({ past: [], future: [] })
  const createPending = useRef(false)
  const gameRef = useRef(game)
  const gameIdRef = useRef(gameId)
  const toastTimer = useRef(null)
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => { gameIdRef.current = gameId }, [gameId])

  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }, [])

  const persistApi = useCallback(async (nextGame, id = gameIdRef.current) => {
    if (!id && createPending.current) return null
    if (!id) createPending.current = true
    try {
      const response = await apiFetch(id ? `/games/${id}` : '/games', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: payloadOf(nextGame) }),
      })
      if (!response.ok) throw new Error('Не удалось сохранить')
      const result = await response.json()
      if (!id) {
        setGameId(result.id)
        gameIdRef.current = result.id
      }
      setApiOnline(true)
      return result
    } catch {
      setApiOnline(false)
      return null
    } finally {
      if (!id) createPending.current = false
    }
  }, [])

  const selectAccount = useCallback(async (user) => {
    setAccountLoading(true)
    setAccountReady(false)
    setCurrentUser(user)
    setApiOnline(true)
    setPlayerName(user.name || '')
    setGameId(null)
    gameIdRef.current = null
    history.current = { past: [], future: [] }
    try {
      const response = await apiFetch('/games/current')
      if (response.ok) {
        const remote = await response.json()
        const local = readAccountGame(user.id)
        const localIsNewer = local?.game && local.savedAt > Date.parse(remote.updated_at)
        const restored = normalizeGame(localIsNewer ? local.game : remote)
        setGame(restored)
        setGameId(remote.id)
        gameIdRef.current = remote.id
        if (localIsNewer) await persistApi(restored, remote.id)
      } else {
        const local = readAccountGame(user.id)
        setGame(local?.game && !local.game.completed ? normalizeGame(local.game) : createPuzzle('easy'))
      }
    } catch {
      setApiOnline(false)
      const local = readAccountGame(user.id)
      setGame(local?.game && !local.game.completed ? normalizeGame(local.game) : createPuzzle('easy'))
    }
    setSelected([4, 4])
    setPaused(false)
    setAccountReady(true)
    setAccountLoading(false)
  }, [])

  const logout = useCallback(async () => {
    try { await apiFetch('/auth/logout', { method: 'DELETE' }) } catch { /* end the local view even when offline */ }
    setCurrentUser(null)
    setAccountReady(false)
    setGameId(null)
    gameIdRef.current = null
    setScreen('game')
  }, [])

  useEffect(() => {
    let alive = true
    apiFetch('/auth/me').then(async (response) => {
      if (!alive) return
      if (response.ok) {
        const data = await response.json()
        await selectAccount(data.user)
      } else {
        setAccountLoading(false)
        setAccountReady(false)
      }
    }).catch(() => {
      if (alive) {
        setApiOnline(false)
        setAccountLoading(false)
      }
    })
    return () => { alive = false }
  }, [selectAccount])

  useEffect(() => {
    if (currentUser && accountReady) localStorage.setItem(`sudoku-user-${currentUser.id}-game-v1`, JSON.stringify({ id: gameId, game, savedAt: Date.now() }))
  }, [game, gameId, currentUser, accountReady])

  useEffect(() => {
    if (!currentUser || !accountReady || !gameId) return undefined
    const timer = setTimeout(() => persistApi(game), 900)
    return () => clearTimeout(timer)
  }, [game.board, game.notes, game.mistakes, game.completed, game.playerName, game.difficulty, gameId, currentUser, accountReady, persistApi])

  useEffect(() => {
    if (!currentUser || !accountReady || !gameId) return undefined
    const timer = setInterval(() => persistApi(gameRef.current), 15000)
    return () => clearInterval(timer)
  }, [gameId, currentUser, accountReady, persistApi])

  useEffect(() => {
    if (!currentUser || !accountReady || gameId) return undefined
    const timer = setInterval(() => {
      if (!createPending.current) persistApi(gameRef.current, null)
    }, 5000)
    return () => clearInterval(timer)
  }, [gameId, currentUser, accountReady, persistApi])

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await apiFetch('/leaderboard')
        if (response.ok) setLeaderboard(await response.json())
      } catch { /* local game still works when the API is unavailable */ }
    }
    fetchBoard()
    const cableUrl = `${API_BASE.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws')}/cable`
    const consumer = createConsumer(cableUrl)
    const subscription = consumer.subscriptions.create('LeaderboardChannel', {
      received: (message) => { if (message.type === 'refresh') fetchBoard() },
    })
    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !accountReady || paused || game.completed || game.mistakes >= 3) return undefined
    const timer = setInterval(() => setGame((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + 1 })), 1000)
    return () => clearInterval(timer)
  }, [currentUser, accountReady, paused, game.completed, game.mistakes])

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    localStorage.setItem('sudoku-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  const [row, col] = selected
  const selectedValue = game.board[row]?.[col] || 0
  const related = useMemo(() => {
    const group = new Set()
    for (let i = 0; i < 9; i += 1) { group.add(`${row}-${i}`); group.add(`${i}-${col}`) }
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let r = boxRow; r < boxRow + 3; r += 1) for (let c = boxCol; c < boxCol + 3; c += 1) group.add(`${r}-${c}`)
    return group
  }, [row, col])

  const numberCounts = useMemo(() => Array.from({ length: 10 }, (_, value) => value ? game.board.flat().filter((cell) => cell === value).length : 0), [game.board])
  const conflicts = useMemo(() => new Set(game.board.flatMap((line, r) => line.flatMap((value, c) => isConflict(game.board, r, c) || (value && !game.puzzle[r][c] && value !== game.solution[r][c]) ? [`${r}-${c}`] : []))), [game.board, game.puzzle, game.solution])

  const remember = (current) => ({ board: cloneBoard(current.board), notes: cloneNotes(current.notes), mistakes: current.mistakes })
  const edit = useCallback((transform) => {
    setGame((current) => {
      if (current.completed || current.mistakes >= 3 || paused) return current
      if (current.puzzle[row][col]) return current
      const previous = remember(current)
      history.current.past = [...history.current.past.slice(-99), previous]
      history.current.future = []
      return transform(current)
    })
  }, [row, col, paused])

  const enterValue = useCallback((value) => {
    if (paused || game.completed || game.mistakes >= 3 || game.puzzle[row][col]) return
    if (notesMode && value) {
      edit((current) => {
        const notes = cloneNotes(current.notes)
        notes[row][col] = notes[row][col].includes(value) ? notes[row][col].filter((note) => note !== value) : [...notes[row][col], value].sort()
        return { ...current, notes }
      })
      return
    }
    edit((current) => {
      const board = cloneBoard(current.board)
      const notes = cloneNotes(current.notes)
      if (value && current.solution[row][col] !== value) {
        setMistakeMark(`${row}-${col}`)
        setTimeout(() => setMistakeMark(null), 650)
        board[row][col] = value
        notes[row][col] = []
        return { ...current, board, notes, mistakes: Math.min(3, current.mistakes + 1) }
      }
      board[row][col] = value
      notes[row][col] = []
      if (value) {
        for (let index = 0; index < 9; index += 1) {
          notes[row][index] = notes[row][index].filter((note) => note !== value)
          notes[index][col] = notes[index][col].filter((note) => note !== value)
        }
        const startRow = Math.floor(row / 3) * 3
        const startCol = Math.floor(col / 3) * 3
        for (let r = startRow; r < startRow + 3; r += 1) for (let c = startCol; c < startCol + 3; c += 1) notes[r][c] = notes[r][c].filter((note) => note !== value)
      }
      const completed = board.every((line, r) => line.every((cell, c) => cell === current.solution[r][c]))
      const updated = { ...current, board, notes, completed }
      if (completed) {
        setPaused(false)
        setShowNameDialog(true)
        setTimeout(() => apiFetch('/leaderboard').then((response) => response.json()).then(setLeaderboard).catch(() => {}), 1000)
      }
      return updated
    })
  }, [row, col, notesMode, paused, game, edit])

  const clearCell = useCallback(() => enterValue(0), [enterValue])

  const useHint = useCallback(() => {
    const selectedCanFill = !game.puzzle[row][col] && game.board[row][col] !== game.solution[row][col]
    const target = selectedCanFill ? [row, col] : game.board.flatMap((line, r) => line.map((value, c) => value !== game.solution[r][c] ? [r, c] : null).filter(Boolean))[0]
    if (!target) return
    const [r, c] = target
    setSelected([r, c])
    setNotesMode(false)
    setGame((current) => {
      const previous = remember(current)
      history.current.past = [...history.current.past.slice(-99), previous]
      history.current.future = []
      const board = cloneBoard(current.board)
      const notes = cloneNotes(current.notes)
      const value = current.solution[r][c]
      board[r][c] = value
      notes[r][c] = []
      for (let index = 0; index < 9; index += 1) {
        notes[r][index] = notes[r][index].filter((note) => note !== value)
        notes[index][c] = notes[index][c].filter((note) => note !== value)
      }
      const startRow = Math.floor(r / 3) * 3
      const startCol = Math.floor(c / 3) * 3
      for (let rr = startRow; rr < startRow + 3; rr += 1) for (let cc = startCol; cc < startCol + 3; cc += 1) notes[rr][cc] = notes[rr][cc].filter((note) => note !== value)
      const completed = board.every((line, rr) => line.every((cell, cc) => cell === current.solution[rr][cc]))
      if (completed) setShowNameDialog(true)
      return { ...current, board, notes, completed }
    })
    showToast('Подсказка добавлена')
  }, [game, row, col, selected, showToast])

  const undo = useCallback(() => {
    const previous = history.current.past.pop()
    if (!previous) return
    history.current.future.push(remember(gameRef.current))
    setGame((current) => ({ ...current, ...previous, completed: false }))
    setShowNameDialog(false)
  }, [])
  const redo = useCallback(() => {
    const next = history.current.future.pop()
    if (!next) return
    history.current.past.push(remember(gameRef.current))
    const completed = next.board.every((line, r) => line.every((cell, c) => cell === gameRef.current.solution[r][c]))
    setGame((current) => ({ ...current, ...next, completed }))
    if (completed) setShowNameDialog(true)
  }, [])

  const newGame = useCallback((difficulty = game.difficulty) => {
    const next = createPuzzle(difficulty)
    setGame(next)
    history.current = { past: [], future: [] }
    setGameId(null)
    gameIdRef.current = null
    setSelected([4, 4])
    setPaused(false)
    setNotesMode(false)
    setShowNameDialog(false)
    showToast(`${prettyDifficulty(difficulty)} уровень готов`)
  }, [game.difficulty, showToast])

  useEffect(() => {
    if (!currentUser || !accountReady || screen !== 'game') return undefined
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement) return
      if (/^[1-9]$/.test(event.key)) enterValue(Number(event.key))
      else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') clearCell()
      else if (event.key.toLowerCase() === 'n') setNotesMode((mode) => !mode)
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo() }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
      else if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key]
        setSelected(([r, c]) => [Math.max(0, Math.min(8, r + delta[0])), Math.max(0, Math.min(8, c + delta[1]))])
      }
      else if (event.key === 'Escape') setPaused((value) => !value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentUser, accountReady, screen, enterValue, clearCell, undo, redo])

  const saveName = async (event) => {
    event.preventDefault()
    const name = playerName.trim().slice(0, 30) || 'Игрок'
    localStorage.setItem('sudoku-player-name', name)
    setGame((current) => ({ ...current, playerName: name }))
    setShowNameDialog(false)
    await persistApi({ ...game, playerName: name })
    try {
      const response = await apiFetch('/leaderboard')
      if (response.ok) setLeaderboard(await response.json())
    } catch { /* retain latest results */ }
    showToast('Результат сохранен')
  }

  const progress = game.board.flat().filter(Boolean).length
  const active = !paused && !game.completed && game.mistakes < 3
  const sameDigit = selectedValue > 0
  const difficultyPercent = { easy: 32, medium: 58, hard: 78, expert: 94 }[game.difficulty]

  if (accountLoading) return <main className="auth-loading"><span className="brand-mark"><span>9</span><span>×</span><span>9</span></span><p>Восстанавливаем вашу сессию…</p></main>
  if (screen === 'kit') return <UiKit onBack={() => setScreen('game')} user={currentUser} onLogout={logout} theme={theme} onThemeChange={() => setTheme((value) => value === 'dark' ? 'light' : value === 'light' ? 'system' : 'dark')} />
  if (!currentUser) return <AuthScreen onAuthSuccess={selectAccount} onShowKit={() => setScreen('kit')} />

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="На главную"><span className="brand-mark"><span>9</span><span>×</span><span>9</span></span><span className="brand-name">sudoku<span>club</span></span></a>
        <nav className="topnav"><a className="nav-link active" href="#game">Игра</a><button className="nav-link" onClick={() => setScreen('kit')}>UI Kit</button><button className="nav-link" onClick={() => setShowLeaderboard(true)}>Таблица лидеров</button><a className="nav-link" href="#how-to-play">Правила</a></nav>
        <div className="top-actions"><span className={`api-indicator ${apiOnline ? 'online' : ''}`} title={apiOnline ? 'Сохранение подключено' : 'Подключение к серверу'}><span />{apiOnline ? 'Синхронизировано' : 'Сохранение'}</span><span className="user-chip"><i>{currentUser.name?.charAt(0).toUpperCase()}</i><span>{currentUser.name}</span></span><button className="icon-button theme-button" title="Сменить тему" onClick={() => setTheme((value) => value === 'dark' ? 'light' : value === 'light' ? 'system' : 'dark')}>{theme === 'dark' ? <Moon /> : <Sun />}</button><button className="icon-button" title="Выйти" onClick={logout}><LogOut /></button><button className="mobile-menu icon-button" onClick={() => setShowLeaderboard(true)} aria-label="Открыть таблицу"><Menu /></button></div>
      </header>

      <section className="welcome" id="top"><div><div className="eyebrow"><Sparkles size={13} /> ВРЕМЯ ДЛЯ СЕБЯ</div><h1>Пусть цифры<br className="mobile-break" /> <span>встанут на места.</span></h1><p>Немного тишины, девять клеток в ряд и удовольствие от найденного решения.</p></div><div className="welcome-note"><span className="note-icon"><Lightbulb size={19} /></span><div><strong>Маленькая подсказка</strong><span>Выберите клетку и нажмите цифру<br />или используйте клавиатуру.</span></div></div></section>

      <section className="game-layout" id="game">
        <div className="play-column">
          <div className="board-card">
            <div className="game-heading"><div><div className="section-kicker">ТЕКУЩАЯ ИГРА</div><h2>{prettyDifficulty(game.difficulty)} <span className={`difficulty-dot ${game.difficulty}`} /> <span className="game-subtitle">· партия № {String(gameId || '—').slice(-4) || '—'}</span></h2></div><button className="new-game-button" onClick={() => newGame()}><RotateCcw size={15} /> Новая игра</button></div>
            <div className={`sudoku-board ${paused || game.mistakes >= 3 ? 'is-dimmed' : ''}`} role="grid" aria-label="Игровое поле судоку">
              {game.board.map((line, r) => line.map((value, c) => {
                const key = `${r}-${c}`
                const isSelected = row === r && col === c
                const isRelated = related.has(key)
                const isSame = sameDigit && value === selectedValue
                const isFixed = Boolean(game.puzzle[r][c])
                const error = conflicts.has(key)
                const justWrong = mistakeMark === key
                return <button role="gridcell" aria-label={`Строка ${r + 1}, столбец ${c + 1}, ${value || 'пусто'}`} key={key} onClick={() => setSelected([r, c])} className={['cell', c % 3 === 2 && c !== 8 ? 'box-right' : '', r % 3 === 2 && r !== 8 ? 'box-bottom' : '', isRelated ? 'related' : '', isSelected ? 'selected' : '', isSame ? 'same-value' : '', isFixed ? 'fixed' : 'editable', error ? 'conflict' : '', justWrong ? 'shake' : ''].filter(Boolean).join(' ')}>{value || (game.notes[r][c]?.length > 0 ? <span className="notes-grid">{Array.from({ length: 9 }, (_, index) => <i key={index}>{game.notes[r][c].includes(index + 1) ? index + 1 : ''}</i>)}</span> : '')}</button>
              }))}
              {paused && <div className="board-overlay"><div className="overlay-card"><span className="overlay-icon"><Pause size={22} /></span><h3>Пауза</h3><p>Отдохните немного.<br />Игра подождет.</p><button className="primary-button" onClick={() => setPaused(false)}><Play size={15} /> Продолжить</button></div></div>}
              {game.mistakes >= 3 && <div className="board-overlay"><div className="overlay-card"><span className="overlay-icon loss"><X size={22} /></span><h3>Три ошибки</h3><p>Попробуйте новую игру<br />и начните с чистого листа.</p><button className="primary-button" onClick={() => newGame()}><RotateCcw size={15} /> Начать заново</button></div></div>}
            </div>
            <div className="board-footer"><div className="legend"><span className="legend-cell" /> выбранная клетка <span className="legend-line" /> блок 3 × 3</div><div className="progress-label"><span>Заполнено</span><b>{progress}<small>/81</small></b></div></div>
            <div className="progress-track"><span style={{ width: `${(progress / 81) * 100}%` }} /></div>
          </div>

          <div className="input-card">
            <div className="input-top"><div><div className="section-kicker">ВАШ ХОД</div><h3>Выберите цифру</h3></div><div className="input-tools"><button className={`tool-button ${notesMode ? 'tool-active' : ''}`} onClick={() => setNotesMode((value) => !value)} aria-pressed={notesMode}><Pencil size={15} /> Заметки <kbd>N</kbd></button><button className="tool-button" onClick={clearCell} title="Стереть клетку"><Eraser size={15} /> Стереть</button></div></div>
            <div className="number-pad">{Array.from({ length: 9 }, (_, index) => index + 1).map((number) => <button key={number} className={`number-key ${selectedValue === number ? 'number-active' : ''} ${numberCounts[number] >= 9 ? 'number-complete' : ''}`} onClick={() => enterValue(number)} disabled={numberCounts[number] >= 9}><span>{number}</span><small>{numberCounts[number] >= 9 ? <Check size={12} /> : `${9 - numberCounts[number]}`}</small></button>)}</div>
            <div className="action-row"><div className="mistakes"><span className="mistake-title">ОШИБКИ</span><div className="mistake-dots">{[0, 1, 2].map((index) => <span key={index} className={index < game.mistakes ? 'mistake-used' : ''} />)}</div><span className="mistake-count">{game.mistakes} / 3</span></div><div className="history-actions"><button className="action-icon" onClick={undo} disabled={!history.current.past.length} title="Отменить"><Undo2 /></button><button className="action-icon" onClick={redo} disabled={!history.current.future.length} title="Повторить"><ArrowRight /></button></div></div>
          </div>
        </div>

        <aside className="side-column">
          <div className="timer-card"><div className="timer-top"><div className="section-kicker">ВАШ РИТМ</div><span className="live-dot"><i /> {active ? 'ИГРА ИДЕТ' : 'ПАУЗА'}</span></div><div className="timer-value"><Clock3 size={21} /><span>{formatTime(game.elapsedSeconds)}</span></div><div className="timer-divider"/><div className="timer-controls"><span>Каждый шаг — уже прогресс</span><button className="pause-button" onClick={() => setPaused((value) => !value)} disabled={game.completed || game.mistakes >= 3}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? 'Продолжить' : 'Пауза'}</button></div></div>

          <div className="level-card"><div className="level-card-heading"><div><div className="section-kicker">ВЫБЕРИТЕ ТЕМП</div><h3>Сложность</h3></div><span className="level-spark"><Sparkles size={16} /></span></div><div className="difficulty-list">{Object.entries(DIFFICULTIES).map(([key, item], index) => <button key={key} onClick={() => newGame(key)} className={`difficulty-option ${game.difficulty === key ? 'difficulty-selected' : ''}`}><span className={`level-number level-${key}`}>{String(index + 1).padStart(2, '0')}</span><span className="level-copy"><b>{item.label}</b><small>{['Разогреться', 'Войти в ритм', 'Проверить себя', 'Для смелых'][index]}</small></span><span className="level-radio">{game.difficulty === key && <i />}</span></button>)}</div><div className="difficulty-meter"><div><span>Сложность партии</span><b>{difficultyPercent}%</b></div><span className="meter-track"><i style={{ width: `${difficultyPercent}%` }} /></span></div></div>

          <div className="hint-card"><span className="hint-decoration">✳</span><div className="hint-icon"><Lightbulb size={19} /></div><div className="hint-content"><b>Застряли?</b><span>Иногда нужен всего<br />один правильный шаг.</span><button onClick={useHint}>Получить подсказку <ArrowRight size={14} /></button></div></div>

          <div className="leader-mini"><div className="leader-heading"><div><div className="section-kicker">НА ЭТОЙ НЕДЕЛЕ</div><h3>Таблица лидеров</h3></div><button className="see-all" onClick={() => setShowLeaderboard(true)}>Все <ArrowRight size={13} /></button></div>{leaderboard.length ? <div className="leader-list">{leaderboard.slice(0, 3).map((item, index) => <div className="leader-row" key={item.id}><span className={`rank rank-${index + 1}`}>{index === 0 ? <Crown size={13} /> : String(index + 1).padStart(2, '0')}</span><span className="leader-avatar">{(item.player_name || 'И').charAt(0).toUpperCase()}</span><span className="leader-name"><b>{item.player_name || 'Игрок'}</b><small>{prettyDifficulty(item.difficulty)}</small></span><span className="leader-time">{formatTime(item.elapsed_seconds)}</span></div>)}</div> : <div className="leader-empty"><Trophy size={19} /><span>Пока тихо — ваш рекорд<br />может стать первым.</span></div>}<button className="leader-cta" onClick={() => setShowLeaderboard(true)}><Trophy size={14} /> Вся таблица лидеров</button></div>
        </aside>
      </section>

      <section className="bottom-strip" id="how-to-play"><div className="bottom-tip"><span className="tip-symbol"><BookOpen size={17} /></span><div><b>Как играть</b><span>Цифра не должна повторяться в строке, столбце и блоке.</span></div></div><div className="tip-divider"/><div className="bottom-tip"><span className="tip-symbol mint"><Lightbulb size={17} /></span><div><b>Используйте заметки</b><span>Нажмите N и отмечайте кандидатов в пустых клетках.</span></div></div><div className="bottom-shortcuts"><kbd>1—9</kbd> ввод <kbd>← ↑ → ↓</kbd> навигация <kbd>Esc</kbd> пауза</div></section>

      <footer className="footer"><span>© 2026 sudoku club</span><span>Сделано для ясной головы <span className="footer-heart">♥</span></span></footer>

      {showLeaderboard && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLeaderboard(false) }}><section className="dialog leaderboard-dialog"><button className="dialog-close" onClick={() => setShowLeaderboard(false)} aria-label="Закрыть"><X /></button><div className="dialog-icon gold"><Trophy /></div><div className="section-kicker">ЛУЧШЕЕ ВРЕМЯ</div><h2>Таблица лидеров</h2><p className="dialog-subtitle">Каждая решенная партия заслуживает места здесь.</p>{leaderboard.length ? <div className="leaderboard-full">{leaderboard.map((item, index) => <div className="leaderboard-entry" key={item.id}><span className={`rank rank-${index + 1}`}>{index === 0 ? <Crown size={14} /> : String(index + 1).padStart(2, '0')}</span><span className="leader-avatar">{(item.player_name || 'И').charAt(0).toUpperCase()}</span><span className="leader-name"><b>{item.player_name || 'Игрок'}</b><small>{prettyDifficulty(item.difficulty)}</small></span><span className="leader-time">{formatTime(item.elapsed_seconds)}</span></div>)}</div> : <div className="dialog-empty"><Award size={25} /><span>Таблица пока пуста.<br />Решите судоку, чтобы открыть счет!</span></div>}<button className="primary-button full-button" onClick={() => setShowLeaderboard(false)}>Продолжить игру</button></section></div>}

      {showNameDialog && <div className="modal-backdrop"><form className="dialog name-dialog" onSubmit={saveName}><span className="confetti">✦</span><div className="dialog-icon success"><Check /></div><div className="section-kicker">БЛЕСТЯЩЕЕ РЕШЕНИЕ</div><h2>Вы справились!</h2><p className="dialog-subtitle">Ваше время — {formatTime(game.elapsedSeconds)}. Добавим результат в таблицу?</p><label className="name-label" htmlFor="player-name">Как вас записать?</label><input id="player-name" className="name-input" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={30} placeholder="Ваше имя" autoFocus /><button className="primary-button full-button" type="submit">Сохранить результат <ArrowRight size={15} /></button><button className="text-button" type="button" onClick={() => setShowNameDialog(false)}>Не сейчас</button></form></div>}

      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
