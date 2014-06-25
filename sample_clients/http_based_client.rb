#!/usr/bin/env ruby
require "net/http"
require 'json'

identity = 'Buttercup'

key_commands = {
  'w' => 'accelerate',
  'a' => 'left',
  's' => 'decelerate',
  'd' => 'right',
  ' ' => 'fire',
  'j' => 'turret_left',
  'k' => 'turret_right',
  'q' => 'state'
}

Signal.trap("SIGINT") do # SIGINT = control-C
  exit
end

def post (path, body)
  host, port = ARGV[0].split(':')
  http = Net::HTTP.new(host, port)
	request = Net::HTTP::Post.new(path)
  request.body = body.to_json
  response = http.request(request)
  JSON.parse(response.body)
end

token = post("/registrations", { command: 'register', handle:identity })['token']
token = post("/registrations", { command: 'register', handle:'temp' })['token']
puts token

system("stty raw -echo")
begin
  playing = true
  while playing do
    str = STDIN.getc
    if key_commands[str]
      response = post("/commands", { command: key_commands[str], token: token} )
      puts (">" * 72 + "\r")
      puts (response.inspect + "\r")
      puts ("<" * 72 + "\r")
    end

    playing = (str != 'x')
  end
ensure
  system("stty -raw echo")
end
