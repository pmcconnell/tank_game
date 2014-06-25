require 'sinatra/base'
require 'json'

module SocketGame
  class HttpServer < Sinatra::Base
    def my_first_private_ipv4
      address = Socket.ip_address_list.detect{|intf| intf.ipv4_private?}
      return address.ip_address if address
    end

    def my_first_public_ipv4
      address = Socket.ip_address_list.detect{|intf| intf.ipv4? and !intf.ipv4_loopback? and !intf.ipv4_multicast? and !intf.ipv4_private?}
      return address.ip_address if address
    end

    get '/' do
      send_file(File.join(File.dirname(__FILE__), 'public', 'index.html'))
    end

    get '/ip' do
      content_type :json
      { 
        :private => my_first_private_ipv4,
        :public => my_first_public_ipv4
      }.to_json
    end

    get '/game_state' do
      content_type :json
      GameState.state.to_json
    end

    post '/registrations' do
      content_type :json

      request.body.rewind
      result = begin
        json = JSON.parse(request.body.read)
        CLIENT_HANDLER.register_client(json['handle'], :http)
      rescue JSON::ParserError
        { status: :error, message: 'server only communicates in JSON' }
      end

      result.to_json
    end

    post '/commands' do
      content_type :json

      request.body.rewind
      json = JSON.parse(request.body.read)

      result = CLIENT_HANDLER.message_recieved(json)
      result.to_json
    end

    get '*' do
      file_path = File.join(File.dirname(__FILE__), 'public',  request.path.downcase)
      File.exist?(file_path) ? send_file(file_path) : halt(404)
    end

    not_found do
      send_file(File.join(File.dirname(__FILE__), 'public', '404.html'))
    end
  end
end
