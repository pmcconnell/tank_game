require 'json'

module SocketGame
  class ClientHandler
    def initialize
      @clients = []
      @master_socket = nil
    end
    
    def register_client(handle, communication_type, socket=nil)
      if GameState.state['state'] == 'REGISTRATION'
        if @clients.find{|client| client[:handle] == handle}
          return { status: :error, error: "Handle in use" }
        else
          client = {
            handle: handle,
            communication_type: communication_type,
            token: SecureRandom.hex
          }
          client.merge!(socket: socket) if socket
          send_master_socket_a_message ( { new_client: client } ) 
          @clients << client
          return { status: :ok, token: client[:token] }
        end
      else
        return { status: :error, error: "Not accepting registrations" }
      end
    end

    def message_recieved_by_master_socket?(socket)
      socket && (socket == @master_socket)
    end

    def reset_game (socket)
      @master_socket = socket
      @clients = []
      GameState.state = { 'state' => 'REGISTRATION' }
    end

    def delete_client (socket)
      if @master_socket && (socket == @master_socket)
        GameState.state = { 'state' => 'ERROR' }
        send_each_client_a_message({ state: GameState.state })
      else
        @clients.delete_if{ |client| client[:socket] == socket }
      end
    end

    def message_recieved (message, socket=nil)
      if socket && message['master']
        reset_game(socket) 
        return
      end

      if message['command'] == 'register'
        register_client(message['handle'], :ws, socket)
      end

      if message_recieved_by_master_socket?(socket)
        case message['command']
        when 'state'
          GameState.state = message['content']
          send_each_client_a_message GameState.state
        end
      else
        if message['command']
          if message['command'] == 'state'
            return { status: :ok, state: GameState.state }
          end

          if GameState.state['state'] == 'PLAY'
            unless !!message['token']
              return { status: :error, error: "Commands require a token" }
            end

            client = @clients.find{ |client| client[:token] == message['token'] }
            if client
              send_master_socket_a_message({ token: client[:token], command: message['command']})
              return { status: :ok }
            else
              return { status: :error, error: "Invalid token" }
            end
          else
            return { status: :error, error: "Not accepting commands" }
          end
        end
      end
    end
    
    def send_each_client_a_message (content={})
      @clients.each do |client|
        if client[:communication_type] == :ws
          client[:socket].send( content.to_json )
        end
      end
    end

    def send_master_socket_a_message (message)
      if @master_socket
        @master_socket.send(message.to_json)
      end
    end
  end
end