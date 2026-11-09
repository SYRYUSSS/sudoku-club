module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      session_data = cookies.encrypted["_sudoku_session"]
      self.current_user = User.find_by(id: session_data&.dig("user_id"))
    end
  end
end
