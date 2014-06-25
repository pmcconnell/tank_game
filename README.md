##Tank Game##
---

A multi-player game implemented with a Ruby server and PhaserJS game engine.

The server acts a proxy between clients and the Javascript game engine.

Clients may issue commands to control their tanks via HTTP requests or Websocket communication.

Each tank has three lives and the goal is to survive in open combat against other players. Last tank standing wins.

Commands are issued as JSON objects with the following syntax:

To register:
	
	{ command : 'register',
  	  handle  : <your_name> }
  	
  	response -> { 'token' : <your_token> }

To send commands to your tank:

	{ command : <command_name>,
  	  token   : <your_token> }

The token is provided upon registration and must be provided with each command.

Valid commands are 

*	left
*	right
*	turret_left
*	turret_right
*	accelerate
*	decelerate
*	fire
*	state (returns the state of the playing field, an array of all tanks and their locations)

