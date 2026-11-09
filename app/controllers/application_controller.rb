class ApplicationController < ActionController::API
  before_action :verify_request_origin, if: :write_request?

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id])
  end

  def authenticate_user!
    render json: { error: "Для продолжения войдите в аккаунт" }, status: :unauthorized unless current_user
  end

  def write_request?
    request.post? || request.patch? || request.put? || request.delete?
  end

  def verify_request_origin
    origin = request.headers["Origin"]
    allowed_origin = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    render json: { error: "Запрос отклонен" }, status: :forbidden if origin.present? && origin != allowed_origin
  end
end
