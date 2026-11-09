Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"
      delete "auth/logout", to: "auth#logout"
      get "games/current", to: "game_sessions#current"
      resources :games, controller: :game_sessions, only: %i[create show update]
      get "leaderboard", to: "leaderboard#index"
      get "health", to: "health#show"
    end
  end

  mount ActionCable.server => "/cable"
end
