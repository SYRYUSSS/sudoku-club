require "test_helper"
require_relative "../support/sudoku_test_data"

class GameSessionTest < ActiveSupport::TestCase
  include SudokuTestData

  setup do
    @user = User.create!(name: "Игрок", email: "game@example.com", password: "sudoku-pass-123")
  end

  test "calculates progress and solves a valid board" do
    game = GameSession.new(**game_attributes(user: @user))

    assert game.valid?
    assert_not game.solved?
    assert_equal 99, game.progress_percentage

    game.board = SOLUTION.map(&:dup)
    assert game.solved?
    assert_equal 100, game.progress_percentage
  end

  test "completes a solved game and assigns the player's name" do
    game = GameSession.create!(**game_attributes(user: @user, puzzle: SOLUTION.map(&:dup), board: SOLUTION.map(&:dup)))

    assert game.complete!
    assert game.reload.completed?
    assert_equal "Игрок", game.player_name
  end

  test "rejects malformed grids and changes to fixed clues" do
    malformed = GameSession.new(**game_attributes(user: @user, board: [[1, 2, 3]]))
    changed_clue = GameSession.new(**game_attributes(user: @user, puzzle: SOLUTION.map(&:dup), board: SOLUTION.map(&:dup).tap { |grid| grid[0][0] = 9 }))

    assert_not malformed.valid?
    assert_includes malformed.errors.attribute_names, :board
    assert_not changed_clue.valid?
    assert_includes changed_clue.errors.attribute_names, :puzzle
  end
end
