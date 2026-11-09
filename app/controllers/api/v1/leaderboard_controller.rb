module Api
  module V1
    class LeaderboardController < ApplicationController
      def index
        games = GameSession.completed.includes(:user).order(:elapsed_seconds, :created_at).limit(20)
        render json: games.map { |game|
          {
            id: game.id,
            player_name: game.display_name,
            difficulty: game.difficulty,
            elapsed_seconds: game.elapsed_seconds,
            completed_at: game.updated_at
          }
        }
      end
    end
  end
end
