const range = Array.from({ length: 9 }, (_, index) => index)

export const DIFFICULTIES = {
  easy: { label: 'Легкий', removed: 38 },
  medium: { label: 'Средний', removed: 45 },
  hard: { label: 'Сложный', removed: 50 },
  expert: { label: 'Эксперт', removed: 54 },
}

const boxIndex = (row, col) => Math.floor(row / 3) * 3 + Math.floor(col / 3)

function candidates(board, row, col) {
  const used = new Set()
  for (let index = 0; index < 9; index += 1) {
    used.add(board[row][index])
    used.add(board[index][col])
  }
  const startRow = Math.floor(row / 3) * 3
  const startCol = Math.floor(col / 3) * 3
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) used.add(board[r][c])
  }
  return range.map((index) => index + 1).filter((value) => !used.has(value))
}

function fillGrid(board) {
  let best = null
  let choices = null
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) continue
      const options = candidates(board, row, col)
      if (!options.length) return false
      if (!choices || options.length < choices.length) {
        best = [row, col]
        choices = options
      }
    }
  }
  if (!best) return true
  choices.sort(() => Math.random() - 0.5)
  const [row, col] = best
  for (const value of choices) {
    board[row][col] = value
    if (fillGrid(board)) return true
  }
  board[row][col] = 0
  return false
}

function countSolutions(board, limit = 2) {
  let total = 0
  function visit() {
    if (total >= limit) return
    let best = null
    let choices = null
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col] !== 0) continue
        const options = candidates(board, row, col)
        if (!options.length) return
        if (!choices || options.length < choices.length) {
          best = [row, col]
          choices = options
        }
      }
    }
    if (!best) {
      total += 1
      return
    }
    const [row, col] = best
    for (const value of choices) {
      board[row][col] = value
      visit()
      board[row][col] = 0
      if (total >= limit) return
    }
  }
  visit()
  return total
}

export function createPuzzle(difficulty = 'easy') {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0))
  fillGrid(solution)
  const puzzle = solution.map((row) => [...row])
  const cells = range.flatMap((row) => range.map((col) => [row, col])).sort(() => Math.random() - 0.5)
  const target = DIFFICULTIES[difficulty]?.removed ?? DIFFICULTIES.easy.removed
  let removed = 0
  for (const [row, col] of cells) {
    if (removed >= target) break
    const value = puzzle[row][col]
    puzzle[row][col] = 0
    if (countSolutions(puzzle) === 1) removed += 1
    else puzzle[row][col] = value
  }
  return { puzzle, solution, board: puzzle.map((row) => [...row]), notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])), difficulty, mistakes: 0, elapsedSeconds: 0, completed: false, playerName: '' }
}

export function isConflict(board, row, col) {
  const value = board[row][col]
  if (!value) return false
  for (let index = 0; index < 9; index += 1) {
    if (index !== col && board[row][index] === value) return true
    if (index !== row && board[index][col] === value) return true
  }
  const box = boxIndex(row, col)
  return range.some((r) => range.some((c) => (r !== row || c !== col) && boxIndex(r, c) === box && board[r][c] === value))
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}
