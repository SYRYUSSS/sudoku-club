module Api
  module V1
    class HealthController < ApplicationController
      def show
        ActiveRecord::Base.connection.select_value("SELECT 1")
        render json: { status: "ok", database: true }
      rescue ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid
        render json: { status: "error", database: false }, status: :service_unavailable
      end
    end
  end
end
