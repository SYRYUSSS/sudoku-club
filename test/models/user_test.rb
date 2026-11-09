require "test_helper"
require_relative "../support/sudoku_test_data"

class UserTest < ActiveSupport::TestCase
  include SudokuTestData

  test "normalizes email and exposes a display name" do
    user = User.create!(name: "Мария", email: "  MARIA@example.com ", password: "sudoku-pass-123", password_confirmation: "sudoku-pass-123")

    assert_equal "maria@example.com", user.email
    assert_equal "Мария", user.display_name
    assert user.authenticate("sudoku-pass-123")
  end

  test "rejects a short password and duplicate email" do
    User.create!(name: "Первый игрок", email: "same@example.com", password: "sudoku-pass-123")
    duplicate = User.new(name: "Другой игрок", email: "SAME@example.com", password: "short")

    assert_not duplicate.valid?
    assert_includes duplicate.errors.attribute_names, :email
    assert_includes duplicate.errors.attribute_names, :password
  end

  test "tracks completed games and the best time" do
    user = User.create!(name: "Игрок", email: "player@example.com", password: "sudoku-pass-123")
    slow = GameSession.create!(**game_attributes(user: user, puzzle: SOLUTION.map(&:dup), board: SOLUTION.map(&:dup), completed: true, elapsed_seconds: 95))
    fast = GameSession.create!(**game_attributes(user: user, puzzle: SOLUTION.map(&:dup), board: SOLUTION.map(&:dup), completed: true, elapsed_seconds: 61))

    assert_equal 2, user.completed_games_count
    assert_equal fast.id, user.best_game.id
    assert_equal [slow.id, fast.id].sort, user.game_sessions.pluck(:id).sort
  end
end
