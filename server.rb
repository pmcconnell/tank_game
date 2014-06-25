#!/usr/bin/env ruby

lib_path = File.expand_path("./lib")
$LOAD_PATH.unshift lib_path unless $LOAD_PATH.include?(lib_path)

require 'CLIENT_HANDLER'
require 'http_server'
require 'eventmachine'
require 'em-websocket'
require 'json'

SERVER_IP = '0.0.0.0'
WEBSOCKET_SERVER_PORT = '8081'
HTTP_SERVER_PORT = '8080'

puts "SocketGame WS   Server starting at ws://#{SERVER_IP}:#{WEBSOCKET_SERVER_PORT}"
puts "SocketGame HTTP Server starting at http://#{SERVER_IP}:#{HTTP_SERVER_PORT}"

class GameState
  @@state = {}

  def self.state
    @@state
  end

  def self.state= (_state)
    @@state = _state
  end
end


CLIENT_HANDLER = SocketGame::ClientHandler.new
EventMachine.run do
  # hit Control + C to stop
  Signal.trap("INT")  { EventMachine.stop }
  Signal.trap("TERM") { EventMachine.stop }

  SocketGame::HttpServer.run!({ :bind => '0.0.0.0', :port => HTTP_SERVER_PORT})

  EventMachine::WebSocket.start(:host => SERVER_IP, :port => WEBSOCKET_SERVER_PORT, :debug => false) do |socket|
    
    socket.onopen do |data|
      puts "onopen called..."
    end

    socket.onmessage do |data|
      begin
        message = JSON.parse(data)
        CLIENT_HANDLER.message_recieved(message, socket)
      rescue JSON::ParserError
        socket.send( {error: "server only communicates in JSON"}.to_json )
      end
    end

    socket.onclose do
      CLIENT_HANDLER.delete_client(socket)
    end
    
  end
end
