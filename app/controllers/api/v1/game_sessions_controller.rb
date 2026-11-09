module Api
  module V1
    class GameSessionsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_game, only: %i[show update]

      def create
        @game = current_user.game_sessions.new(game_params)
        if @game.save
          render json: @game, status: :created
        else
          render json: { errors: @game.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def show
        render json: @game
      end

      def current
        @game = current_user.game_sessions.where(completed: false).order(updated_at: :desc).first
        return head :not_found unless @game

        render json: @game
      end

      def update
        if @game.update(game_params)
          render json: @game
        else
          render json: { errors: @game.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_game
        @game = current_user.game_sessions.find(params[:id])
      end

      def game_params
        source = params.require(:game)
        permitted = source.permit(:difficulty, :mistakes, :elapsed_seconds, :completed, :player_name).to_h
        %w[puzzle solution board notes].each do |key|
          permitted[key] = source[key].as_json if source.key?(key)
        end
        permitted
      end
    end
  end
end
