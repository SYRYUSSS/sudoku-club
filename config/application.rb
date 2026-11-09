require_relative "boot"
require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "active_job/railtie"
require "action_cable/engine"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module Sudoku
  class Application < Rails::Application
    config.load_defaults 7.2
    config.api_only = true
    config.time_zone = "UTC"
    config.autoload_lib(ignore: %w[assets tasks])
    config.filter_parameters += %i[password password_confirmation]
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore,
      key: "_sudoku_session",
      same_site: :lax,
      httponly: true,
      expire_after: 2.weeks,
      secure: Rails.env.production?
    config.action_cable.allowed_request_origins = [ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")]
  end
end
