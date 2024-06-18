// === TURNS AND MOVEMENT ===

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

  module.exports = {
    onEndTurn,
    askToRollMovement,
    sendRollRequestToClient,
    onCharacterMoveRoll,
    sendCharacterMoveMessage,
    sendStartTurnMessage,
    moveActionMessage,
    endTurnMessage,
    createStartTurnMessage,
    createCharacterMoveMessage,
    createCharacterMoveMessage
  }