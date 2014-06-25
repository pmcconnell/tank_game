#!/usr/bin/env ruby
require 'em-websocket-client'
require 'json'

identity = 'Buttercup'

k = 0
movements = [
  'accelerate'
  'left'
  'decelerate'
  'right'
  'fire'
  'turret_left'
  'turret_right'
  'state'
]

EM.run do
  conn = EventMachine::WebSocketClient.connect("ws://#{ARGV[0]}/")

  conn.callback do
  end

  conn.stream do |message|
    message = JSON.parse(message.data)
    # Check for commands, status, .etc
  end

  conn.disconnect do
    puts "Server has disconnected your websocket"
    EM::stop_event_loop
  end

  EM.add_periodic_timer(0.5) do
    conn.send_msg(
      {
        command: movements[k],
        token: token
      }.to_json
    )
    k = (k==(movements.size-1)) ? 0 : (k+1)
  end

end
