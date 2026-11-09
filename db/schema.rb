# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record.

ActiveRecord::Schema[7.2].define(version: 2026_11_03_000002) do
  enable_extension "plpgsql"

  create_table "game_sessions", force: :cascade do |t|
    t.string "difficulty", null: false
    t.jsonb "puzzle", default: [], null: false
    t.jsonb "solution", default: [], null: false
    t.jsonb "board", default: [], null: false
    t.jsonb "notes", default: {}, null: false
    t.integer "mistakes", default: 0, null: false
    t.integer "elapsed_seconds", default: 0, null: false
    t.boolean "completed", default: false, null: false
    t.string "player_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["completed"], name: "index_game_sessions_on_completed"
    t.index ["elapsed_seconds"], name: "index_game_sessions_on_elapsed_seconds"
    t.index ["user_id"], name: "index_game_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
  end

  add_foreign_key "game_sessions", "users"
end
