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


  module.exports = {
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
  };