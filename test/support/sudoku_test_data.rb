module SudokuTestData
  SOLUTION = %w[
    534678912
    672195348
    198342567
    859761423
    426853791
    713924856
    961537284
    287419635
    345286179
  ].map { |line| line.chars.map(&:to_i) }.freeze

  def puzzle_grid
    grid = SOLUTION.map(&:dup)
    grid[0][1] = 0
    grid
  end

  def empty_notes
    Array.new(9) { Array.new(9) { [] } }
  end

  def game_attributes(user:, **overrides)
    {
      user: user,
      difficulty: "easy",
      puzzle: puzzle_grid,
      solution: SOLUTION.map(&:dup),
      board: puzzle_grid,
      notes: empty_notes,
      mistakes: 0,
      elapsed_seconds: 42,
      completed: false
    }.merge(overrides)
  end
end
