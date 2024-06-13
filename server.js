const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Importing UUID generation function

const wss = new WebSocket.Server({ port: 8081, host: '0.0.0.0' });
console.log("Server is running on port 8081");

let clients = {};
let roles = ["player1", "player2", "player3", "player4"];
let availableRoles = [...roles]; // Clone the roles array to manage availability
let sessionActive = false;

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

  for (let id in clients) {
    if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
      handleClientEvent(ws, clients[id], message);
    }
  }
}

function handleClientEvent(senderWs, clientWs, message) {
  console.log(`Handling event ${message.event} from client ${senderWs.id} to client ${clientWs.id}`);
  switch (message.event) {
    case "endGame":
      clientWs.send(endGameMessage(senderWs.id, senderWs.username, senderWs.role, message));
      endSession(); // End the session when the game ends
      break;
    case "endTurn":
      clientWs.send(endTurnMessage(senderWs.id, senderWs.username, senderWs.role, message));
      break;
    case "moveAction":
      clientWs.send(moveActionMessage(senderWs.id, senderWs.username, senderWs.role, message));
      break;
    case "startGame":
      clientWs.send(startGameMessage(senderWs.id, senderWs.username, senderWs.role, message));
      startSession();
      break;
    default:
      clientWs.send(generalMessage(senderWs.id, senderWs.username, senderWs.role, message));
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

function notifyAllClientsExcept(excludedWs, message) {
  console.log(`Notifying all clients except client ${excludedWs.id}`);
  for (let id in clients) {
    if (clients[id] !== excludedWs && clients[id].readyState === WebSocket.OPEN) {
      clients[id].send(message);
    }
  }
}

function endSession() {
  sessionActive = false;
  availableRoles = [...roles]; // Reset roles for a new session
  console.log("Session ended and roles reset");
}

function startSession() {
  sessionActive = true;
  console.log("Session started");
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

function startGameMessage(id, username, role, message) {
  console.log(`Creating start game message from client ${id}`);
  return JSON.stringify({
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
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
