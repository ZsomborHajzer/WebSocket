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
    availableRoles = [...roles]; // Reset roles for a new session
    sessionActive = true;
  }

  ws.role = availableRoles.shift(); // Assign the next available role
  clients[clientId] = ws; // Store the connection with its ID and role

  // Notify the newly connected client about their role
  ws.send(connectMessage(ws.id, ws.role));

  // Notify all other clients about the new connection
  for (let id in clients) {
    if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
      clients[id].send(connectMessage(ws.id, ws.role));
    }
  }

  ws.on('message', function incoming(message) {
    message = JSON.parse(message);
    console.log(message);

    if (message.hasOwnProperty("username")) {
      ws.username = message.username;
      return;
    }

    for (let id in clients) {
      if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
        switch (message.event) {
          case "endGame":
            clients[id].send(endGameMessage(ws.id, ws.username, ws.role, message));
            endSession(); // End the session when the game ends
            break;
          case "endTurn":
            clients[id].send(endTurnMessage(ws.id, ws.username, ws.role, message));
            break;
          case "moveAction":
            clients[id].send(moveActionMessage(ws.id, ws.username, ws.role, message));
            break;
          case "startGame":
            clients[id].send(startGameMessage(ws.id, ws.username, ws.role, message));
            break;
          default:
            clients[id].send(generalMessage(ws.id, ws.username, ws.role, message));
            break;
        }
        return;
      }
    }
  });

  ws.on('close', () => {
    //! When someone disconnects the others get info about it
    for (let id in clients) {
      if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
        clients[id].send(disconnectMessage(ws.id, ws.username, ws.role));
      }
    }

    // Mark the role as available again
    availableRoles.push(ws.role);
    delete clients[clientId]; // Remove client from the list upon disconnection
    console.log("Client disconnected: " + clientId);

    // End the session if no players are left
    if (Object.keys(clients).length === 0) {
      endSession();
    }
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientId} error: ${error}`);
  });
});

function endSession() {
  sessionActive = false;
  availableRoles = [...roles]; // Reset roles for a new session
  console.log("Session ended and roles reset");
}

function connectMessage(id, role) {
  const connectMessage = {
    event: "connect",
    id: id,
    role: role
  };
  return JSON.stringify(connectMessage);
}

function generalMessage(id, username, role, message) {
  const generalMessage = {
    event: "message",
    username: username,
    id: id,
    role: role,
    message: message.message,
  };
  return JSON.stringify(generalMessage);
}

function disconnectMessage(id, username, role) {
  const disconnectMessage = {
    event: "disconnect",
    username: username,
    id: id,
    role: role
  };
  return JSON.stringify(disconnectMessage);
}

function endGameMessage(id, username, role, message) {
  const endGameMessage = {
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  };
  return JSON.stringify(endGameMessage);
}

function startGameMessage(id, username, role, message) {
  const startGameMessage = {
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  };
  return JSON.stringify(startGameMessage);
}

function moveActionMessage(id, username, role, message) {
  const moveActionMessage = {
    event: message.event,
    username: username,
    id: id,
    role: role,
    fromPosition: message.fromPosition,
    toPosition: message.toPosition,
    timeStamp: message.timeStamp
  };
  return JSON.stringify(moveActionMessage);
}

function endTurnMessage(id, username, role, message) {
  const endTurnMessage = {
    event: message.event,
    username: username,
    id: id,
    role: role,
    timeStamp: message.timeStamp
  };
  return JSON.stringify(endTurnMessage);
}
