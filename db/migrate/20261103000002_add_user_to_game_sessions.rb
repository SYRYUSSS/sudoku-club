class AddUserToGameSessions < ActiveRecord::Migration[7.2]
  def change
    add_reference :game_sessions, :user, null: true, foreign_key: true
  end
end
