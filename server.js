const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Importing UUID generation function

const wss = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });

let clients = {};

wss.on('connection', function connection(ws) {
  const clientId = uuidv4();
  ws.id = clientId; // Assign a unique id to the WebSocket connection
  clients[clientId] = ws; // Store the connection with its ID

  console.log("Client connected: " + clientId);

  ws.on('message', function incoming(message) {
     message = JSON.parse(message)
     if(message.hasOwnProperty("username")) {
      ws.username = message.username;
     }
     console.log(ws.username)
     message.from = ws.id;
     message = JSON.stringify(message)
     console.log(`Received message ${message} from client ${ws.id}`);
    for (let id in clients) {
      if (clients[id] !== ws && clients[id].readyState === WebSocket.OPEN) {
        clients[id].send(message);
      }
    }
  });

  ws.on('close', () => {
    delete clients[clientId]; // Remove client from the list upon disconnection
    console.log("Client disconnected: " + clientId);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientId} error: ${error}`);
  });
});

console.log("WebSocket server started on ws://localhost:8080");