require "test_helper"
require_relative "../support/sudoku_test_data"

class AuthAndGameFlowTest < ActionDispatch::IntegrationTest
  include SudokuTestData

  test "health endpoint confirms PostgreSQL with a live query" do
    get "/api/v1/health", as: :json

    assert_response :success
    assert_equal true, response.parsed_body.fetch("database")
  end

  test "registration persists the login session until logout" do
    post "/api/v1/auth/register", params: registration_params("one@example.com"), as: :json
    assert_response :created
    assert_equal "one@example.com", response.parsed_body.dig("user", "email")

    get "/api/v1/auth/me", as: :json
    assert_response :success
    assert_equal "Ирина", response.parsed_body.dig("user", "name")

    delete "/api/v1/auth/logout", as: :json
    assert_response :success
    post "/api/v1/auth/login", params: { email: "one@example.com", password: "sudoku-pass-123" }, as: :json
    assert_response :success
    assert_equal "Ирина", response.parsed_body.dig("user", "name")

    delete "/api/v1/auth/logout", as: :json
    get "/api/v1/auth/me", as: :json
    assert_response :unauthorized
  end

  test "a signed-in player saves and finishes a game shown on the leaderboard" do
    register("winner@example.com")
    post "/api/v1/games", params: { game: game_payload }, as: :json
    assert_response :created
    game_id = response.parsed_body.fetch("id")

    get "/api/v1/games/current", as: :json
    assert_response :success
    assert_equal game_id, response.parsed_body.fetch("id")

    patch "/api/v1/games/#{game_id}", params: { game: game_payload(completed: true, board: SOLUTION) }, as: :json
    assert_response :success
    assert response.parsed_body.fetch("completed")

    get "/api/v1/leaderboard", as: :json
    assert_response :success
    result = response.parsed_body.find { |entry| entry["id"] == game_id }
    assert_equal "Ирина", result.fetch("player_name")
    assert_equal 42, result.fetch("elapsed_seconds")
  end

  test "guests cannot create games and another account cannot open a saved game" do
    post "/api/v1/games", params: { game: game_payload }, as: :json
    assert_response :unauthorized

    register("owner@example.com")
    post "/api/v1/games", params: { game: game_payload }, as: :json
    assert_response :created
    game_id = response.parsed_body.fetch("id")

    delete "/api/v1/auth/logout", as: :json
    register("visitor@example.com")
    get "/api/v1/games/#{game_id}", as: :json
    assert_response :not_found
  end

  private

  def register(email)
    post "/api/v1/auth/register", params: registration_params(email), as: :json
    assert_response :created
  end

  def registration_params(email)
    { user: { name: "Ирина", email: email, password: "sudoku-pass-123", password_confirmation: "sudoku-pass-123" } }
  end

  def game_payload(completed: false, board: puzzle_grid)
    {
      difficulty: "easy",
      puzzle: puzzle_grid,
      solution: SOLUTION,
      board: board,
      notes: empty_notes,
      mistakes: 0,
      elapsed_seconds: 42,
      completed: completed
    }
  end
end
