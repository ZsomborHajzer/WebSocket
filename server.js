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

  handleNewConnection(ws);
  sendCurrentPlayers(ws);

  ws.on('message', function incoming(message) {
    handleMessage(ws, message);
  });

  ws.on('close', () => {
    handleDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientId} error: ${error}`);
  });
});

function handleNewConnection(ws) {
  // Notify the newly connected client about their role
  ws.send(connectMessage(ws.id, ws.username, ws.role));

  // Notify all other clients about the new connection
  notifyAllClientsExcept(ws, connectMessage(ws.id, ws.username, ws.role));
}

function sendCurrentPlayers(ws) {
  // Send information of all previously connected clients to the newly connected client
  ws.send(currentPlayers(clients));
}

function handleMessage(ws, message) {
  message = JSON.parse(message);
  console.log(message);

  if (message.hasOwnProperty("username")) {
    ws.username = message.username;
    ws.send(connectMessage(ws.id, ws.username, ws.role));
    return;
  }

  for (let id in clients) {
    if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
      handleClientEvent(ws, clients[id], message);
    }
  }
}

function handleClientEvent(senderWs, clientWs, message) {
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

  delete clients[ws.id]; // Remove client from the list upon disconnection
  console.log("Client disconnected: " + ws.id);

  // End the session if no players are left
  if (Object.keys(clients).length === 0) {
    endSession();
  }
}

function notifyAllClientsExcept(excludedWs, message) {
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
}

function connectMessage(id, username, role) {
  return JSON.stringify({
    event: "connect",
    id: id,
    username: username,
    role: role
  });
}

function currentPlayers(clients) {
  let currentPlayersMessage = {
    event: "currentPlayers",
    players: []
  };

  for (let id in clients) {
    currentPlayersMessage.players.push({
      id: clients[id].id,
      username: clients[id].username,
      role: clients[id].role
    });
  }

  return JSON.stringify(currentPlayersMessage);
}

function generalMessage(id, username, role, message) {
  return JSON.stringify({
    event: "message",
    username: username,
    id: id,
    role: role,
    message: message.message,
  });
}

function disconnectMessage(id, username, role) {
  return JSON.stringify({
    event: "disconnect",
    username: username,
    id: id,
    role: role
  });
}

function endGameMessage(id, username, role, message) {
  return JSON.stringify({
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  });
}

function startGameMessage(id, username, role, message) {
  return JSON.stringify({
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  });
}

function moveActionMessage(id, username, role, message) {
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
  return JSON.stringify({
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  });
}
