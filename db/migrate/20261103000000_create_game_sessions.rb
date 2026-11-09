class CreateGameSessions < ActiveRecord::Migration[7.2]
  def change
    create_table :game_sessions do |t|
      t.string :difficulty, null: false
      t.jsonb :puzzle, null: false, default: []
      t.jsonb :solution, null: false, default: []
      t.jsonb :board, null: false, default: []
      t.jsonb :notes, null: false, default: {}
      t.integer :mistakes, null: false, default: 0
      t.integer :elapsed_seconds, null: false, default: 0
      t.boolean :completed, null: false, default: false
      t.string :player_name

      t.timestamps
    end

    add_index :game_sessions, :completed
    add_index :game_sessions, :elapsed_seconds
  end
end
