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

  export {
    onEndTurn,
    askToRollMovement,
    sendRollRequestToClient,
    onCharacterMoveRoll,
    sendCharacterMoveMessage,
    sendStartTurnMessage
  }