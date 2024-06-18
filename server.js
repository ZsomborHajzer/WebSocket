const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Importing UUID generation function

const wss = new WebSocket.Server({ port: 8081, host: '0.0.0.0' });
console.log("Server is running on port 8081");

let clients = {};
let roles = ["player1", "player2", "player3", "player4"];
let availableRoles = [...roles]; // Clone the roles array to manage availability
let sessionActive = false;
let currentClientIndex = 0
let clientsReady = 0
let creatureIndex = 0

let currentBattle = []

wss.on('connection', function connection(ws) {
  const clientId = uuidv4();
  ws.id = clientId; // Assign a unique id to the WebSocket connection
  console.log(`Client connected: ${clientId}`);

  if (sessionActive && availableRoles.length === 0) {
    ws.close(1000, "Session is full"); // Close connection if no roles are available
    console.log("Connection attempt rejected: Session is full");
    return;
  }

  if (!sessionActive) {
    startSession();
  }

  ws.role = availableRoles.shift(); // Assign the next available role
  clients[clientId] = ws; // Store the connection with its ID and role
  console.log(`Assigned role ${ws.role} to client ${clientId}`);

  ws.on('message', function incoming(message) {
    console.log(`Message received from client ${clientId}: ${message}`);
    handleMessage(ws, message);
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    handleDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientId} error: ${error}`);
  });

  if (Object.keys(clients).length > 1) {
    sendCurrentPlayers(ws);
  }
});

function handleMessage(ws, message) {
  message = JSON.parse(message);
  console.log(`Parsed message from client ${ws.id}: ${JSON.stringify(message)}`);

  if (message.hasOwnProperty("username")) {
    ws.username = message.username;
    console.log(`Client ${ws.id} set username to ${ws.username}`);
    // Notify the newly connected client about their username and role
    ws.send(connectMessage(ws.id, ws.username, ws.role));
    // Notify all other clients about the new connection
    notifyAllClientsExcept(ws, connectMessage(ws.id, ws.username, ws.role));
    return;
  }
  handleClientEvent(ws, message)
}

function handleClientEvent(senderWs, message) {

  console.log(`Handling event ${message.event} from client ${senderWs.id}`);
  switch (message.event) {
    case "endTurn":
      onEndTurn()
      break;
    case "moveAction":
      sendToAllClients(moveActionMessage(senderWs.id, senderWs.username, senderWs.role, message));
      break;
    case "startGame":
      console.log(`${message}, startgame switch case has been triggered`)
      sendToAllClients(startGameMessage(message));
      startSession();
      break;
    case "initialization":
      onInitializationRequest()
      break;

    case "movementRollResult":
      onCharacterMoveRoll(message.result)
      break;

    case "interruptStartFightAgainstPlayer":
      let player1Id = message.player1ID
      let player2Id = message.player2ID
      onPlayerFightInterrupt(player1Id, player2Id)
      break;

    case "interruptStartFightAgainstRandom":
      let playerId = message.playerID
      let creatureTemplateId = message.creatureTemplateId
      onPVEInterrupt(playerId, creatureTemplateId)
      break;

    case "readyToFight":
      onPlayerReadyToFight()
      break;

    case "creatureAttacks":
      onCreatureAttack(message)
      break;
    
    case "finishedAttack":
      onFinishedAttack(message)
      break;

    case "fightSwitchedTeams":
      onSwitchedTeams()
      break;

    case "interruptSwitch":
      onInterruptedBySwitchTile(message)
      break;

    case "changeDirectionMove":
      onChangeDirectionMove(message)
      break;

    default:
      console.log(`event handling failed, ${message.event} does not exist`)
      break;
  }
}


function handleDisconnection(ws) {
  // Notify other clients about the disconnection
  notifyAllClientsExcept(ws, disconnectMessage(ws.id, ws.username, ws.role));
  console.log(`Notified other clients about the disconnection of client ${ws.id}`);

  delete clients[ws.id]; // Remove client from the list upon disconnection
  console.log(`Client ${ws.id} removed from the clients list`);

  // End the session if no players are left
  if (Object.keys(clients).length === 0) {
    endSession();
  } else {
    availableRoles.push(ws.role); // Make the role available again
    console.log(`Role ${ws.role} made available again`);
  }
}




// ======================== SYSTEM FUNCTIONS =============================================

function onInitializationRequest(){
  console.log("A player has been initialized")
  if(setReady()){
    askToRollMovement();
  }
}

function setReady(){
  clientsReady++
  if(clientsReady == Object.keys(clients).length){
    clientsReady = 0
    return true
  }
  return false
}
function getCurrentClientId(){
  return Object.keys(clients)[currentClientIndex]
}

function iterateCurrentClientIndex(){
  currentClientIndex++;
  if (currentClientIndex >= Object.keys(clients).length) {
    currentClientIndex = 0;
  }
}

function notifyAllClientsExcept(excludedWs, message) {
  console.log(`Notifying all clients except client ${excludedWs.id}`);
  for (let id in clients) {
    if (clients[id] !== excludedWs && clients[id].readyState === WebSocket.OPEN) {
      clients[id].send(message);
    }
  }
}

function notifyAllClients(ws, message) {
  for (let id in clients) {
    handleClientEvent(ws, clients[id], message);
  }
}

function sendToAllClients(message) {
  console.log(`sending message to all clients: ${message}`)
  for (let id in clients){
    clients[id].send(message)
  }
}

function endSession() {
  sessionActive = false;
  availableRoles = [...roles]; // Reset roles for a new session
  currentClientIndex = 0
  clientsReady = 0
  console.log("Session ended and roles reset");
}

function startSession() {
  sessionActive = true;
  console.log("Session started");
}

function sendCurrentPlayers(ws) {
  console.log(`Sending current players to client ${ws.id}`);
  let currentPlayersMessage = currentPlayers(clients, ws.id);
  ws.send(currentPlayersMessage);
}

function connectMessage(id, username, role) {
  console.log(`Creating connect message for client ${id}`);
  return JSON.stringify({
    event: "connect",
    id: id,
    username: username,
    role: role
  });
}

function currentPlayers(clients, excludeId) {
  console.log(`Creating current players message, excluding client ${excludeId}`);
  let currentPlayersMessage = {
    event: "currentPlayers",
    players: []
  };

  for (let id in clients) {
    if (id !== excludeId) {
      currentPlayersMessage.players.push({
        id: clients[id].id,
        username: clients[id].username,
        role: clients[id].role
      });
    }
  }

  return JSON.stringify(currentPlayersMessage);
}

function generalMessage(id, username, role, message) {
  console.log(`Creating general message from client ${id}`);
  return JSON.stringify({
    event: "message",
    username: username,
    id: id,
    role: role,
    message: message.message,
  });
}

function disconnectMessage(id, username, role) {
  console.log(`Creating disconnect message for client ${id}`);
  return JSON.stringify({
    event: "disconnect",
    username: username,
    id: id,
    role: role
  });
}

function endGameMessage(id, username, role, message) {
  console.log(`Creating end game message from client ${id}`);
  return JSON.stringify({
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  });
}

function startGameMessage(message) {
  console.log(`The game has been started at ${message.timeStamp}`);

  listOfClients = []
  for (let id in clients) {
    listOfClients.push({
      id: clients[id].id,
      username: clients[id].username,
      role: clients[id].role
    })
  }

  return JSON.stringify({
    event: message.event,
    timeStamp: message.timeStamp,
    clients: listOfClients
  });
}






// =============================== Battle Messages =============================================================

function sendCreatureAttackRequest(creatureIndex){
  if(currentBattle[0] != ""){ // if it's a player
    let message = createCreatureAttackRequest(creatureIndex)
    console.log(message)
    clients[currentBattle[0]].send(message)
  }
  else {
    message = createCreatureAttackMessage(creatureIndex, creatureIndex, 0, Math.floor(Math.random*7))
    sendToAllClients(message)
  }
}


function createStartFightMessage(fighter1Id, fighter2Id){
  return JSON.stringify({
    event: "startFightBetweenPlayers",
    fighter1:fighter1Id,
    fighter2:fighter2Id
  })
}

function createPVEStartFightMessage(fighterId, creatureTemplateId){
  return JSON.stringify({
    event: "startPVEFight",
    fighter:fighterId,
    creatureTemplate:creatureTemplateId
  })
}

function createCreatureAttackRequest(creatureIndex){
  return JSON.stringify({
    event: "creatureAttackRequest",
    creature:creatureIndex
  })
}

function createCreatureAttackMessageFromMessage(message){
  return JSON.stringify({
    event: message.event,
    attackingCreatureIndex: message.attackingCreatureIndex,
    defendingCreatureIndex: message.defendingCreatureIndex,
    attackMoveIndex: message.attackMoveIndex,
    chanceModifier: message.chanceModifier
  });
}

function createCreatureAttackMessage(attackingCreatureIndex, defendingCreatureIndex, attackMoveIndex, chanceModifier){
  return JSON.stringify({
    event: "creatureAttacks",
    attackingCreatureIndex: attackingCreatureIndex,
    defendingCreatureIndex: defendingCreatureIndex,
    attackMoveIndex: attackMoveIndex,
    chanceModifier: chanceModifier
  });
}

function createSwitchTeamsMessage(){
  return JSON.stringify({
    event: "switchTeams"
  })
}

function createCreatureDiedMessage(){
  return JSON.stringify({
    event: "creatureDied"
  })
}

function createEndBattleMessage(winningCharacterIndex){
  return JSON.stringify({
    event: "endBattle",
    winningCharacterIndex: winningCharacterIndex
  })
}

function sendCreatureDiedMessage(){
  let message = createCreatureDiedMessage()
  sendToAllClients(message)
}

function sendEndBattleMessage(winnerIndex){
  let message = createEndBattleMessage(winnerIndex)
  sendToAllClients(message)
}

function sendSwitchTeamsMessage(){
  sendToAllClients(createSwitchTeamsMessage())
}

function onSwitchedTeams(){
  if(setReady()){
    cycleAttack
  }
}


// === BATTLES AND FIGHTS ===

function onPlayerFightInterrupt(player1Id, player2Id){
creatureIndex = 0
if(setReady()){
  if(Math.floor(Math.random*2)){    // 50% chance that the order gets inverted
    let store = player1Id
    player1Id = player2Id
    player2Id = store
  }
  currentBattle = [player1Id, player2Id]
  sendStartFightSignal(player1Id, player2Id)
}
}

function sendStartFightSignal(player1Id, player2Id){
let message = createStartFightMessage(player1Id, player2Id)
sendToAllClients(message)
}

function onPVEInterrupt(playerID, creatureTemplateId){
creatureIndex = 0
if(setReady()){
  currentBattle = [playerID, ""]
  sendStartPVEFightSignal(playerID, creatureTemplateId)
}
}

function sendStartPVEFightSignal(playerID, creatureTemplateId){
let message = createPVEStartFightMessage(playerID, creatureTemplateId)
sendToAllClients(message)
}

function onPlayerReadyToFight(){
if(setReady()){
  cycleAttack()
}
}

function cycleAttack(){
sendCreatureAttackRequest(creatureIndex)
}



function onCreatureAttack(message){
let modMessage = createCreatureAttackMessageFromMessage(message)
sendToAllClients(modMessage)
}

function onFinishedAttack(message){
if(setReady()){
  // we're going to handle dead creature logic in app
  if(message.teamWonIndex != -1){
    sendEndBattleMessage(message.teamWonIndex)
  }
  else if(message.creatureDied){
    sendCreatureDiedMessage()
  }
  else if(message.hasNextCreature == false){
    sendSwitchTeamsMessage()
    creatureIndex = 0
  }
  else{
    cycleAttack()
    creatureIndex++
  }
}
}



// ========================================= Movement functions and messages ===============================================

function onEndTurn(){
  console.log("A player is now ready for the next turn")
  if(setReady()){
    askToRollMovement();
  }
}

// make player roll dice
function askToRollMovement() {
  console.log("askToRollMovement Has been Called!!!")
  sendRollRequestToClient(getCurrentClientId())
}

function sendRollRequestToClient(id) {
  let message = createRollMovementMessage()
  clients[id].send(message)
}

// make character move
function onCharacterMoveRoll(rollResult) {
  console.log("OnMovementRoll Has been Called!!!")
  sendCharacterMoveMessage(
    getCurrentClientId(),
    rollResult
  )
  iterateCurrentClientIndex()
}

function sendCharacterMoveMessage(clientToMoveId, distance){
  let message = createCharacterMoveMessage(clientToMoveId, distance)
  sendToAllClients(message)
}

function sendStartTurnMessage(clientId) {
  console.log(`Creating start turn message from client ${clientId}`);
  let message = createStartTurnMessage(clientId)
  sendToAllClients(message)
}

function moveActionMessage(id, username, role, message) {
console.log(`Creating move action message from client ${id}`);
return JSON.stringify({
  event: message.event,
  username: username,
  id: id,
  role: role,
  fromPosition: message.fromPosition,
  toPosition: message.toPosition,
  timeStamp: message.timeStamp
});
}

function endTurnMessage(id, username, role, message) {
console.log(`Creating end turn message from client ${id}`);
return JSON.stringify({
  event: message.event,
  username: username,
  id: id,
  role: role,
  timeStamp: message.timeStamp
});
}

function createStartTurnMessage(clientId){
return JSON.stringify({
  event: "startTurn",
  id: clientId
})
}

function createRollMovementMessage(){
return JSON.stringify({
  event: "rollMovementDice",
})
}

function createCharacterMoveMessage(clientId, distance){
return JSON.stringify({
  event: "moveCharacter",
  distance: distance,
  id: clientId
})
}

function onInterruptedBySwitchTile(message){
if(setReady()){
  sendRequestDirection(message.playerID, message.steps)
}
}

function sendRequestDirection(clientId, steps){
let message = directionRequestMessage(clientId, steps)
clients[clientId].send(message)
}

function onChangeDirectionMove(message){
sendDirectionMoveFromMessage(message)
}
function sendDirectionMoveFromMessage(message){
let directionMessage = directionChangeMessage(message.id, message.steps, message.directionIndex)
sendToAllClients(directionMessage)
}



function moveActionMessage(id, username, role, message) {
console.log(`Creating move action message from client ${id}`);
return JSON.stringify({
  event: message.event,
  username: username,
  id: id,
  role: role,
  fromPosition: message.fromPosition,
  toPosition: message.toPosition,
  timeStamp: message.timeStamp
});
}

function endTurnMessage(id, username, role, message) {
console.log(`Creating end turn message from client ${id}`);
return JSON.stringify({
  event: message.event,
  username: username,
  id: id,
  role: role,
  timeStamp: message.timeStamp
});
}

function createStartTurnMessage(clientId){
return JSON.stringify({
  event: "startTurn",
  id: clientId
})
}

function createRollMovementMessage(){
return JSON.stringify({
  event: "rollMovementDice",
})
}

function createCharacterMoveMessage(clientId, distance){
return JSON.stringify({
  event: "moveCharacter",
  distance: distance,
  id: clientId
})
}

function directionRequestMessage(clientId, steps){
return JSON.stringify({
  event: "requestDirection",
  id: clientId,
  steps: steps,
})
}

function directionChangeMessage(clientId, steps, directionIndex){
return JSON.stringify({
  event: "changeDirectionMove",
  id: clientId,
  steps: steps,
  directionIndex: directionIndex
})
}