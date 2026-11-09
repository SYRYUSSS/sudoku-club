class GameSession < ApplicationRecord
  DIFFICULTIES = %w[easy medium hard expert].freeze

  belongs_to :user, optional: true

  validates :puzzle, :solution, :board, presence: true
  validates :difficulty, inclusion: { in: DIFFICULTIES }
  validates :mistakes, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 3 }
  validates :elapsed_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :player_name, length: { maximum: 30 }, allow_nil: true
  validate :grids_have_valid_shape
  validate :given_cells_match_solution
  validate :completed_board_is_solved

  after_commit :broadcast_leaderboard, if: :leaderboard_changed?

  scope :completed, -> { where(completed: true) }

  def solved?
    valid_grid?(board) && valid_grid?(solution) && board == solution
  end

  def progress_percentage
    return 0 unless valid_grid?(board)

    (board.flatten.count(&:positive?) * 100.0 / 81).round
  end

  def display_name
    player_name.presence || user&.display_name || "Игрок"
  end

  def complete!
    return false unless solved?

    update(completed: true, player_name: player_name.presence || user&.display_name)
  end

  private

  def valid_grid?(grid)
    grid.is_a?(Array) && grid.length == 9 && grid.all? do |line|
      line.is_a?(Array) && line.length == 9 && line.all? { |value| value.is_a?(Integer) && value.between?(0, 9) }
    end
  end

  def grids_have_valid_shape
    %i[puzzle solution board].each do |attribute|
      errors.add(attribute, "должно содержать сетку 9 × 9 с числами от 0 до 9") unless valid_grid?(public_send(attribute))
    end
    return unless notes.present?

    unless notes.is_a?(Array) && notes.length == 9 && notes.all? { |line| line.is_a?(Array) && line.length == 9 }
      errors.add(:notes, "должны соответствовать сетке 9 × 9")
      return
    end
    errors.add(:notes, "могут содержать только числа от 1 до 9") unless notes.flatten(1).all? { |cell| cell.is_a?(Array) && cell.all? { |value| value.is_a?(Integer) && value.between?(1, 9) } }
  end

  def given_cells_match_solution
    return unless valid_grid?(puzzle) && valid_grid?(solution) && valid_grid?(board)

    unless valid_solution?(solution)
      errors.add(:solution, "должно быть корректным решением судоку")
      return
    end

    9.times do |row|
      9.times do |col|
        if solution[row][col].zero? || (puzzle[row][col].positive? && puzzle[row][col] != solution[row][col]) || (puzzle[row][col].positive? && board[row][col] != puzzle[row][col])
          errors.add(:puzzle, "содержит несовместимые исходные цифры")
          return
        end
      end
    end
  end

  def valid_solution?(grid)
    expected = (1..9).to_a
    return false unless grid.all? { |line| line.sort == expected }
    return false unless 9.times.all? { |col| grid.map { |line| line[col] }.sort == expected }

    3.times.all? do |box_row|
      3.times.all? do |box_col|
        values = 3.times.flat_map { |row| 3.times.map { |col| grid[box_row * 3 + row][box_col * 3 + col] } }
        values.sort == expected
      end
    end
  end

  def completed_board_is_solved
    errors.add(:completed, "можно отметить только решенную партию") if completed? && !solved?
  end

  def leaderboard_changed?
    completed? && (saved_change_to_completed? || saved_change_to_elapsed_seconds? || saved_change_to_player_name? || saved_change_to_user_id?)
  end

  def broadcast_leaderboard
    ActionCable.server.broadcast("leaderboard", { type: "refresh" })
  end
end
