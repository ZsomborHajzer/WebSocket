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
  handleClientEvent()
}

function handleClientEvent(senderWs, message) {

  console.log(`Handling event ${message.event} from client ${senderWs.id}`);
  switch (message.event) {
    case "endTurn":
      onEndTurn()
      break;
    case "moveAction":
      clientWs.send(moveActionMessage(senderWs.id, senderWs.username, senderWs.role, message));
      break;
    case "startGame":
      console.log(`${message}, startgame switch case has been triggered`)
      clientWs.send(startGameMessage(message));
      //TODO a function all to see if n initialization messages have been recieved
      startSession();
      break;
    case "initialization":
      onInitializationRequest()
      break;

    case "movementRollResult":
      onCharacterMoveRoll(message.result)

    default:
      clientWs.send(generalMessage(senderWs.id, senderWs.username, senderWs.role, message));
      break;
  }
}

function onInitializationRequest(){
  console.log("A player has been initialized")
  clientsReady++
  console.log(`Clients Initialized = ${clientsReady}, Clients.size = ${Object.keys(clients).length} `)
  if(clientsReady == Object.keys(clients).length){
    clientsReady = 0
    askToRollMovement();
  }
}

function onEndTurn(){
  console.log("A player is now ready for the next turn")
  clientsReady++
  if(clientsReady == Object.keys(clients).length){
    clientsReady = 0
    askToRollMovement()
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

function getCurrentClientId(){
  return Object.keys(clients)[currentClientIndex]
}

function iterateCurrentClientIndex(){
  currentClientIndex++;
  if (currentClientIndex >= Object.keys(clients).length) {
    currentClientIndex = 0;
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

