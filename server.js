const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Importing UUID generation function

const wss = new WebSocket.Server({ port: 8081, host: '0.0.0.0' });

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
        clients[id].send(generalMessage(ws.id, ws.username, message));
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