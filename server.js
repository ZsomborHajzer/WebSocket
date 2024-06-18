import {
  createStartFightMessage,
  createPVEStartFightMessage,
  createCreatureAttackRequest,
  createCreatureAttackMessageFromMessage,
  createCreatureAttackMessage,
  createSwitchTeamsMessage,
  createCreatureDiedMessage,
  createEndBattleMessage,
  sendCreatureDiedMessage,
  sendEndBattleMessage,
  sendSwitchTeamsMessage,
  onSwitchedTeams,
  onPlayerFightInterrupt,
  sendStartFightSignal,
  onPVEInterrupt,
  sendStartPVEFightSignal,
  onPlayerReadyToFight,
  cycleAttack,
  sendCreatureAttackRequest,
  onCreatureAttack,
  onFinishedAttack
} from './messages/battle_messages';

import {
  onInitializationRequest,
  setReady,
  getCurrentClientId,
  iterateCurrentClientIndex,
  notifyAllClientsExcept,
  notifyAllClients,
  sendToAllClients,
  endSession,
  startSession,
  sendCurrentPlayers,
  connectMessage,
  currentPlayers,
  generalMessage,
  disconnectMessage,
  endGameMessage,
  startGameMessage
} from './messages/system_messages'

import {
  onEndTurn,
  askToRollMovement,
  sendRollRequestToClient,
  onCharacterMoveRoll,
  sendCharacterMoveMessage,
  sendStartTurnMessage
} from './messages/movement_messages'


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

    default:
      console.log(`event handling failed, ${message.event} does not exist`)
      break;
  }
}





// === common ===

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



