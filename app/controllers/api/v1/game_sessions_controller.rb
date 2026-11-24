module Api
  module V1
    class GameSessionsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_game, only: %i[show update]

      def create
        @game = current_user.game_sessions.new(create_game_params)
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
        if @game.update(update_game_params)
          render json: @game
        else
          render json: { errors: @game.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_game
        @game = current_user.game_sessions.find(params[:id])
      end

      def create_game_params
        source = params.require(:game)
        permitted = source.permit(:difficulty, :mistakes, :elapsed_seconds, :completed, :player_name).to_h
        %w[puzzle solution board notes].each do |key|
          permitted[key] = source[key].as_json if source.key?(key)
        end
        permitted
      end

      def update_game_params
        source = params.require(:game)
        if @game.completed?
          return source.permit(:player_name).to_h
        end

        permitted = source.permit(:mistakes, :elapsed_seconds, :completed, :player_name).to_h
        %w[board notes].each do |key|
          permitted[key] = source[key].as_json if source.key?(key)
        end
        permitted
      end
    end
  end
end
