function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continue(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continue(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
/******************************************/  
/******************************************/
/*    THE AI CODE STARTS FROM HERE        */
/******************************************/
/******************************************/
  /*  0:Up 
      1:Right 
      2:Down  
      3:Left 
  */

this.isValid = function(x,y){
  if(x < 0 || x >3 || y <0 || y > 3)
    return false;
  return true;
}  
this.moveCells = function(matrix, move){
  var dx = [-1,0,1,0];
  var dy = [0,1,0,-1];
  var nx,ny;
  for(var k = 0;k<3;k++){
    for(var i = 0;i<4;i++){
      for(var j = 0; j<4; j++){
       nx = i+dx[move];
       ny = j+dy[move];
       if(self.isValid(nx,ny)){
          if(matrix[nx][ny] == 0){
           matrix[nx][ny] = matrix[i][j];
           matrix[i][j] = 0;
         }
        }
      }
    }
  }
  for(var i = 0;i<4;i++){
      for(var j = 0; j<4; j++){
        nx = i + dx[move];
        ny = j + dy[move];
        if(self.isValid(nx,ny)){
          if(matrix[i][j] == matrix[nx][ny]){
            matrix[nx][ny] *= -2;
            matrix[i][j] = 0;
          }
        }
      }
    }
    for(var k = 0;k<3;k++){
    for(var i = 0;i<4;i++){
      for(var j = 0; j<4; j++){
        if(matrix[i][j] <0)
          matrix[i][j] *= -1;
        nx = i+dx[move];
        ny = j+dy[move];
        if(self.isValid(nx,ny)){
          if(matrix[nx][ny] == 0){
           matrix[nx][ny] = matrix[i][j];
           matrix[i][j] = 0;
          }
        }
      }
    }
  }
  return matrix;
}

this.evaluateMatrix = function(matrix){
  /* Count Number of Free Spaces */
  var cc = 0;
  for(var i = 0;i<4;i++)
    for(var j = 0;j<4;j++){
      if(matrix[i][j] == 0)
        cc += 100;
      else 
        cc += matrix[i][j]*matrix[i][j];
    }

  return cc;
}

this.printMatrix = function(matrix){
  for(var i = 0;i<4;i++){
    var str = ""
    for(var j = 0;j<4;j++)
      str += matrix[i][j] + " ";
    console.log(str)
  }
  console.log("******************************");
}

this.findFreeCell = function(matrix){
  var i,j,k=0;
  do{
    i =  (Math.floor(Math.random()*100))%4;
    j =  (Math.floor(Math.random()*100))%4;
    k++;
  }while(matrix[i][j] != 0 && k != 500);
  if(matrix[i][j] != 0)
    for(i = 0;i<4;i++)
      for(j = 0;j<4;j++)
        if(matrix[i][j] == 0)
          return ({x:i, y:j});
  
  return ({x:i, y:j});
}

this.isEqualMatrix = function(m1,m2){
  for(var i = 0;i<4;i++)
    for(var j = 0;j<4;j++)
      if(m1[i][j] != m2[i][j])
        return false;
  return true;
}

this.minMax = function(matrix, move, depth){
  if(depth == 6)
    return 0;
  var rmatrix = self.moveCells(self.createCopy(matrix),move);
  var areSame = self.isEqualMatrix(rmatrix, matrix);
  var score = self.evaluateMatrix(rmatrix);

  if(areSame == true)
    return score-1;
  var maxVal=-1000,val,ret;
  var freeCell = self.findFreeCell(rmatrix);
  if(freeCell.x == 4 || freeCell.y == 4)
    console.log("YES VALUE IS 4 || " + freeCell.x + " | " + freeCell.y);
  rmatrix[freeCell.x][freeCell.y] = 2;
  for(var x = 0;x<4;x++)
  {
    val = this.minMax(self.createCopy(rmatrix), x, depth+1);
    if(val > maxVal)
      maxVal  = val;
  }
  return (score+maxVal);
}

  this.getMove = function(matrix){

    var maxVal = 0,val,ret;
    for(var x = 0; x < 4;x++){
      val = this.minMax(self.createCopy(matrix),x,0);
      // console.log("Score for "+ x + ":" + val )
      if(val > maxVal){
        maxVal = val;
        ret = x;
      }
    }
    return ret;
  }
  
  
  this.getMatrix = function(){
    var matrix = [];
    for (var i = 0 ; i <4 ; i++) {
      var row = [];
      for (var j = 0; j < 4; j++) {
        tile = self.grid.cellContent({x:j, y:i});
        if(tile == null)
          row.push(0);
        else 
          row.push(tile["value"]);
      };
      matrix.push(row);
    };
    return matrix;
  }

  this.createCopy = function(matrix){
    var ret =[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for(var i = 0; i < 4;i++)
      for(var j = 0; j < 4; j++)
        ret[i][j] = matrix[i][j].valueOf();
    return ret;
  }

  

 
setTimeout(function() {
  matrix = self.getMatrix();
  var myMove = self.getMove(self.createCopy(matrix));
  var rmat = self.moveCells(self.createCopy(matrix), myMove);
  console.log(myMove);
  if( self.isEqualMatrix(rmat,matrix))
    myMove = (Math.floor(Math.random()*100))%4;
  self.move(myMove);
  }, 100);

/******************************************/  
/******************************************/
/*        THE AI CODE ENDS  HERE          */
/******************************************/
/******************************************/

};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
