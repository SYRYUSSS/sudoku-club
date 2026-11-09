module Api
  module V1
    class AuthController < ApplicationController
      def register
        user = User.new(user_params)
        if user.save
          sign_in(user)
          render json: { user: user_payload(user) }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by(email: params[:email].to_s.strip.downcase)
        if user&.authenticate(params[:password].to_s)
          sign_in(user)
          render json: { user: user_payload(user) }
        else
          render json: { error: "Неверная почта или пароль" }, status: :unauthorized
        end
      end

      def me
        return render json: { user: user_payload(current_user) } if current_user

        render json: { user: nil }, status: :unauthorized
      end

      def logout
        reset_session
        render json: { ok: true }
      end

      private

      def sign_in(user)
        reset_session
        session[:user_id] = user.id
      end

      def user_params
        params.require(:user).permit(:name, :email, :password, :password_confirmation)
      end

      def user_payload(user)
        {
          id: user.id,
          name: user.name,
          email: user.email,
          completed_games_count: user.completed_games_count,
          best_time: user.best_game&.elapsed_seconds
        }
      end
    end
  end
end
