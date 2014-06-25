window.onload = function() {

  'use strict';

   function PlayerTank(client, game) {

    var x = game.world.randomX;
    var y = game.world.randomY;

    var bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);
    bullets.owner = client.handle;

    this.game = game;
    this.token = client.token;
    this.health = 3;
    this.bullets = bullets;
    this.bullet;
    this.bulletTime = 0;
    this.fireRate = 1000;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'tank', 'shadow');
    this.tank = game.add.sprite(x, y, 'tank', 'tank1');
    this.turret = game.add.sprite(x, y, 'tank', 'turret');

    this.tank.token = this.token;

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.tank.name = client.handle;
    console.log('Creating tank: ' + this.tank.name + ' at ' + x + ':' + y);

    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.immovable = false;
    this.tank.body.collideWorldBounds = true;
    this.tank.body.bounce.setTo(1, 1);
    //  This will force it to decelerate and limit its speed
    this.tank.body.drag.set(0.2);
    this.tank.body.maxVelocity.setTo(400, 400);

    this.tank.angle = 0
    this.currentSpeed = 0;

    this.createLabel();

    
    // console.log('Tank: ' + this.shadow.x + ':' + this.shadow.y);
    // console.log('Tank: ' + this.tank.x + ':' + this.tank.y);
    // console.log('Tank: ' + this.turret.x + ':' + this.turret.y);
  }

  PlayerTank.prototype.createLabel = function(){
    var style = { font: '18px Arial', fill: 'white', align: 'center' };
    this.enemyName = this.tank.name;
    var labelText = this.enemyName + ' - ' + this.health;
    this.label = game.add.text(this.tank.body.center.x, this.tank.body.center.y, labelText, style);
  };

  PlayerTank.prototype.damage = function() {

      this.health -= 1;

      if (this.health <= 0)
      {
          this.alive = false;

          this.shadow.kill();
          this.tank.kill();
          this.turret.kill();

          return true;
      }
      return false;
  };

  PlayerTank.prototype.fire = function() {
    if (game.time.now > this.bulletTime) {
      this.bullet = this.bullets.getFirstExists(false);

      if (this.bullet) {
        this.bullet.reset(this.tank.body.center.x, this.tank.body.center.y);
        this.bullet.lifespan = 2000;
        this.bullet.rotation = this.turret.rotation;
        game.physics.arcade.velocityFromRotation(this.turret.rotation, 400, this.bullet.body.velocity);
        this.bulletTime = game.time.now + 500;
        this.turret.bringToTop();
        shotsFired++;
      }
    }
  };

  PlayerTank.prototype.turn = function(direction){
    switch (direction) {
      case 'left' :
        this.tank.angle = this.tank.angle -= tankRotation;
        break;
      case 'right' :
        this.tank.angle = this.tank.angle += tankRotation;
        break;
    }
  };

  PlayerTank.prototype.accelerate = function(){
    console.log('Accelerating');
    this.currentSpeed += tankSpeed;
    this.currentSpeed = this.currentSpeed < 300 ? this.currentSpeed : 300;
  };

  PlayerTank.prototype.decelerate = function(){
    this.currentSpeed = this.currentSpeed - tankSpeed / 4;
    this.currentSpeed = this.currentSpeed > 0 ? this.currentSpeed : 0;
  };

  PlayerTank.prototype.rotateTurret = function(direction){
    switch (direction) {
      case 'left' :
        this.turret.angle = this.turret.angle -= turretRotation;
        break;
      case 'right' :
        this.turret.angle = this.turret.angle += turretRotation;
        break;
    }
  }

  PlayerTank.prototype.update = function() {
    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;

    this.turret.x = this.tank.x;
    this.turret.y = this.tank.y;

    this.label.x = this.tank.x - this.tank.body.halfWidth;
    this.label.y = this.tank.y + this.tank.body.halfHeight;
    this.label.text = this.health < 1 ? ' ' : this.enemyName + ' - ' + this.health;

    if (this.currentSpeed >= 0) {
      game.physics.arcade.velocityFromRotation(this.tank.rotation, this.currentSpeed, this.tank.body.velocity);
    }
  };

  var socket;
  var socketConnected = false;

  var game;

  var land;
  var players;

  var playersTotal = 0;
  var playersAlive = 0;
  var explosions;

  var tankRotation = 15;
  var turretRotation = 15;
  var tankSpeed = 100;

  var shotsFired = 0;

  var playingField = { width : 800, height:800 };

  var controlledTank = 0;

  var deathMessages = [];
  var messages = [];

  var startGameMessage = 'Press anywhere to start';
  var buttonTextLabel;
  var currentGameState = {
    state: 'REGISTRATION',
    players: []
  };

  function preload () {
    game.load.image('earth', './images/earth.jpg');
    game.load.atlas('tank', './images/tanks.png', 'assets/tanks.json');
    game.load.image('bullet', './images/bullet.png');
    game.load.spritesheet('kaboom', './images/explosion.png', 64, 64, 23);

    game.stage.disableVisibilityChange = true;
  }

  function addButtonWithLabel (text) {
    var style = { font: "48px Arial", fill: "white", align: "center" };
    buttonTextLabel = game.add.text(0, 0, text, style);
    buttonTextLabel.setShadow(3,3, "black", 0);

    buttonTextLabel.anchor.set(0.5);
  }

  function create () {
    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-playingField.width / 2, -playingField.height/2, playingField.width / 2, [playingField.height / 2]);

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, playingField.width, playingField.height, 'earth');
    land.fixedToCamera = true;

    players = [];

    // playersTotal = 6;
    // playersAlive = 6;

    // for (var i = 0; i < playersTotal; i++) {
    //   players.push(new PlayerTank(i, game));
    // }

    //  Explosion pool
    explosions = game.add.group();

    for (var j = 0; j < 10; j++) {
      var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
      explosionAnimation.anchor.setTo(0.5, 0.5);
      explosionAnimation.animations.add('kaboom');
    }

    game.camera.focusOnXY(0, 0);

    this.cursors = game.input.keyboard.createCursorKeys();

    addButtonWithLabel(startGameMessage);
  }

  function bulletHitEnemy (tank, bullet) {
    bullet.kill();

    var theHitPlayer = playerFromToken(tank.token);
    var destroyed = theHitPlayer.damage();

    // console.log('****** Player: ****** Destroyed: ' + destroyed + 'tank name: ' + tank.name);
    // console.log(bullet.parent.owner);

    if (destroyed) {
      var deathMessage = '*** Player ' + bullet.parent.owner + ' killed Player ' + tank.name + '***';
      console.log( deathMessage );
      deathMessages.push(deathMessage);
      var explosionAnimation = explosions.getFirstExists(false);
      explosionAnimation.reset(tank.x, tank.y);
      explosionAnimation.play('kaboom', 30, false, true);
    } else {
      var message = 'Player ' + bullet.parent.owner + ' hit Player ' + tank.name;
      console.log(message);
    }

  }

  function changeGameState (state) {
    var msg = { command: 'state',
      content: { state: state .toUpperCase() }
    };
    socket.send(JSON.stringify(msg));
    console.log('Changing state to: ' + state);
    currentGameState.state = state;
  }

  function updateGameStatePlayers() {
    var statusOfPlayers = [];

    for (var i = 0; i < players.length; i++) {
      statusOfPlayers.push({
        name:    players[i].tank.name,
        isAlive: players[i].alive,
        x:       players[i].tank.x,
        y:       players[i].tank.y
      });
    }

    currentGameState['players'] = statusOfPlayers;
  }

  function sendGameStateToServer() {
    var msg = JSON.stringify({
      command: 'state',
      content: currentGameState
    });
    $('#debug').text(msg);
    if (socketConnected) {
      socket.send(msg);
    }
  }

  function lastLivingPlayer () {
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) {return players[i];}
    }
  }

  function processMouseClicks () {
    if (game.input.activePointer.isDown) {
      if (currentGameState.state == 'GAME_OVER') {
        changeGameState('REGISTRATION');
        buttonTextLabel.text = startGameMessage;
      } else if ( (players.length > 1) && (currentGameState.state == 'REGISTRATION') ) {
        changeGameState('PLAY');
        buttonTextLabel.destroy();
      }   
    }
  }

  function checkForWinner () {
    if ( (playersAlive == 1) &&  (currentGameState.state == 'PLAY') ) {
      var winner = lastLivingPlayer();
      addButtonWithLabel( winner.tank.name + ' is victorious!');
      changeGameState('GAME_OVER');
      players = [];
    }
  }

  function update () {
    processMouseClicks();
    
    playersAlive = 0;

    // the shooter
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) { playersAlive++; }
      // the other tanks
      for (var j = 0; j < players.length; j++) {
        if (players[i].alive) {
          if (i !== j) {
            // console.log('Checking collisions/hits: ' + i + ':' + j);
            game.physics.arcade.collide(players[i].tank, players[j].tank);
            game.physics.arcade.overlap(players[i].bullets, players[j].tank, bulletHitEnemy, null, this);
            
          }
        }
        players[i].update();
      }
      // console.log('-------------------');
    }
    
    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    checkForWinner();
    updateGameStatePlayers();
    sendGameStateToServer();
  }

  function render () {
    game.debug.text('Players: ' + playersAlive + '/' + playersTotal, 32, 32);
    
    // game.debug.text(startGameMessage, playingField.width/2, playingField.height/2);
    // game.debug.text('Enemies Killed: ' + (enemiesTotal - enemiesAlive), 32, 64);
  }

  function playerFromToken (token) {
    for (var i = 0; i < players.length; i++) {
      if (players[i].token === token) { return players[i]; }
    } 
    return null; 
  }

  function processInput(data) {
    var cmd = JSON.parse(data);
    console.log('Received command: ');
    console.log(cmd);

    if (cmd.new_client) {
      players.push(new PlayerTank(cmd.new_client, game));
      playersTotal = players.length;
    }

    if ( cmd.command && cmd.token ) {
      var thePlayer = playerFromToken(cmd.token); 
      switch (cmd.command) {
        case 'left': 
          thePlayer.turn('left');
          break;
        case 'right':
          thePlayer.turn('right');
          break;
        case 'turret_left':
          thePlayer.rotateTurret('left');
          break;
        case 'turret_right':
          thePlayer.rotateTurret('right');
          break;
        case 'accelerate':
          thePlayer.accelerate();
          break;
        case 'decelerate':
          thePlayer.decelerate();
          break;
        case 'fire':
          thePlayer.fire();
          break;
      }
    }
  }

  function connect(){
    try {
      var socket_host = window.location.hostname;
      var host = 'ws://' + socket_host + ':8081';

      // Fix for Firefox
      if (window.MozWebSocket) {
        window.WebSocket = window.MozWebSocket;
      }

      socket = new WebSocket(host);

      socket.onopen = function() {
        console.log('WebSocket opened');
        socketConnected = true;
        var msg = { 'master' : true };
        socket.send(JSON.stringify(msg));
      };

      socket.onmessage = function(msg) {
        var data = msg.data;
        // console.log('Received message: ' + data);
        processInput(data);
      };

      socket.onclose = function() {
        console.log('WebSocket closed');
        socketConnected = false;
      };

    } catch(exception) {
         console.log('WebSocket Error' + exception);
    }
}

  function initialize() {
    connect();
    game = new Phaser.Game(playingField.width, playingField.height, Phaser.AUTO, 'phaser-game', { preload: preload, create: create, update: update, render: render });
  }

  initialize();

};
