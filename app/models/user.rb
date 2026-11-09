class User < ApplicationRecord
  has_secure_password
  has_many :game_sessions, dependent: :destroy

  before_validation :normalize_email

  validates :name, presence: true, length: { minimum: 2, maximum: 30 }
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }
  validates :password, length: { minimum: 8 }, if: -> { password.present? || new_record? }

  def display_name
    name.presence || email.to_s.split("@").first || "Игрок"
  end

  def best_game
    game_sessions.completed.order(:elapsed_seconds, :created_at).first
  end

  def completed_games_count
    game_sessions.completed.count
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
