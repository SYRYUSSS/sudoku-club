class LeaderboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "leaderboard"
  end
end
