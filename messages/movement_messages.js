// === TURNS AND MOVEMENT ===

const { sendToAllClients, setReady } = require("./system_messages");

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

function onInterruptedBySwitchTile(message){
  if(setReady()){
    sendRequestDirection(message.clientId, message.steps)
  }
}

function sendRequestDirection(clientId, steps){
  let message = directionRequestMessage(clientId, steps)
  clients[clientId].send(message)
}

function onChangeDirectionMove(message){
  sendDirectionMoveFromMessage(message)
}
function sendDirectionMoveFromMessage(message){
  let directionMessage = directionChangeMessage(message.clientId, message.steps, message.directionIndex)
  sendToAllClients(directionMessage)
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

function directionRequestMessage(clientId, steps){
  return JSON.stringify({
    event: "requestDirection",
    id: clientId,
    steps: steps,
  })
}

function directionChangeMessage(clientId, steps, directionIndex){
  return JSON.stringify({
    event: "changeDirectionMove",
    id: clientId,
    steps: steps,
    directionIndex: directionIndex
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
    directionRequestMessage,
    directionChangeMessage,
    onInterruptedBySwitchTile,
    sendRequestDirection,
    onChangeDirectionMove,
    sendDirectionMoveFromMessage
  }