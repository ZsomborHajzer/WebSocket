const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Importing UUID generation function

const wss = new WebSocket.Server({ port: 8081, host: '0.0.0.0' });
console.log("Server is running on port 8081")

let clients = {};

wss.on('connection', function connection(ws) {
  const clientId = uuidv4();
  ws.id = clientId; // Assign a unique id to the WebSocket connection
  clients[clientId] = ws; // Store the connection with its ID

  for (let id in clients) {
    if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
      clients[id].send(connectMessage(ws.id));
    }
  }

  ws.on('message', function incoming(message) {
    message = JSON.parse(message)
    console.log(message)

    //! When connecting, the client sends a message automatically with a username field set by the client.
    if (message.hasOwnProperty("username")) {
      ws.username = message.username;
      return;
    }

    for (let id in clients) {
      if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {

        /*
        TODO -- Here implement a switch case system in which different message types can be sent between clients. 
        TODO -- The clients should denote the event type as their first parameter and accordingly different message formating functions can be build for each usecase
        */

        switch (message.event) {
          case "endGame":
              clients[id].send(endGameMessage(ws.id, ws.username, message));
              break;
          case "endTurn":
              clients[id].send(endTurnMessage(ws.id, ws.username, message));
              break;
          case "moveAction":
            clients[id].send(moveActionMessage(ws.id, ws.username, message));
              break;
          case "startGame":
              clients[id].send(startGameMessage(ws.id, ws.username, message));
              break;
          default:
            clients[id].send(generalMessage(ws.id, ws.username, message));
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
        clients[id].send(disconnectMessage(ws.id, ws.username));
      }
    }

    delete clients[clientId]; // Remove client from the list upon disconnection
    console.log("Client disconnected: " + clientId);
  });



  ws.on('error', (error) => {
    console.error(`Client ${clientId} error: ${error}`);
  });
});

function connectMessage(id) {
  const connectMessage = {
    event: "connect",
    id: id
  };
  return JSON.stringify(connectMessage)
}

function generalMessage(id, username, message) {
  const generalMessage = {
    event: "message",
    username: username,
    id: id,
    message: message.message,
  };
  return JSON.stringify(generalMessage)
}

function disconnectMessage(id, username) {
  const disconnectMessage = {
    event: "disconnect",
    username: username,
    id: id
  };
  return JSON.stringify(disconnectMessage)
}

function endGameMessage(id, username, message) {
  const endGameMessage = {
    event: message.event,
    username: username,
    id: id,
    timeStamp: message.timeStamp
  }
  return JSON.stringify(endGameMessage)
}

function startGameMessage(id, username, message) {
  const startGameMessage = {
    event: message.event,
    username: username,
    id: id,
    timeStamp: message.timeStamp
  }
  return JSON.stringify(startGameMessage)
}

function moveActionMessage(id, username, message) {
  const moveActionMessage = {
    event: message.event,
    username: username,
    id: id,
    fromPosition: message.fromPosition,
    toPosition: message.toPosition,
    timeStamp: message.timeStamp
  }
  return JSON.stringify(moveActionMessage)
}

function endTurnMessage(id, username, message) {
  const endTurnMessage = {
    event: message.event,
    username: username,
    id: id,
    timeStamp: message.timeStamp
  }
  return JSON.stringify(endTurnMessage)
}