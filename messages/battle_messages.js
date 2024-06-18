
function createStartFightMessage(fighter1Id, fighter2Id){
    return JSON.stringify({
      event: "startFightBetweenPlayers",
      fighter1:fighter1Id,
      fighter2:fighter2Id
    })
  }
  
  function createPVEStartFightMessage(fighterId, creatureTemplateId){
    return JSON.stringify({
      event: "startPVEFight",
      fighter:fighterId,
      creatureTemplate:creatureTemplateId
    })
  }
  
  function createCreatureAttackRequest(creatureIndex){
    return JSON.stringify({
      event: "creatureAttackRequest",
      creature:creatureIndex
    })
  }
  
  function createCreatureAttackMessageFromMessage(message){
    return JSON.stringify({
      event: message.event,
      attackingCreatureIndex: message.attackingCreatureIndex,
      defendingCreatureIndex: message.defendingCreatureIndex,
      attackMoveIndex: message.attackMoveIndex,
      chanceModifier: message.chanceModifier
    });
  }
  
  function createCreatureAttackMessage(attackingCreatureIndex, defendingCreatureIndex, attackMoveIndex, chanceModifier){
    return JSON.stringify({
      event: "creatureAttacks",
      attackingCreatureIndex: attackingCreatureIndex,
      defendingCreatureIndex: defendingCreatureIndex,
      attackMoveIndex: attackMoveIndex,
      chanceModifier: chanceModifier
    });
  }
  
  function createSwitchTeamsMessage(){
    return JSON.stringify({
      event: "switchTeams"
    })
  }
  
  function createCreatureDiedMessage(){
    return JSON.stringify({
      event: "creatureDied"
    })
  }
  
  function createEndBattleMessage(winningCharacterIndex){
    return JSON.stringify({
      event: "endBattle",
      winningCharacterIndex: winningCharacterIndex
    })
  }

  function sendCreatureDiedMessage(){
    let message = createCreatureDiedMessage()
    sendToAllClients(message)
  }
  
  function sendEndBattleMessage(winnerIndex){
    let message = createEndBattleMessage(winnerIndex)
    sendToAllClients(message)
  }
  
  function sendSwitchTeamsMessage(){
    sendToAllClients(createSwitchTeamsMessage())
  }
  
  function onSwitchedTeams(){
    if(setReady()){
      cycleAttack
    }
  }


  // === BATTLES AND FIGHTS ===

function onPlayerFightInterrupt(player1Id, player2Id){
  creatureIndex = 0
  if(setReady()){
    if(Math.floor(Math.random*2)){    // 50% chance that the order gets inverted
      let store = player1Id
      player1Id = player2Id
      player2Id = store
    }
    currentBattle = [player1Id, player2Id]
    sendStartFightSignal(player1Id, player2Id)
  }
}

function sendStartFightSignal(player1Id, player2Id){
  let message = createStartFightMessage(player1Id, player2Id)
  sendToAllClients(message)
}

function onPVEInterrupt(playerID, creatureTemplateId){
  creatureIndex = 0
  if(setReady()){
    currentBattle = [playerID, ""]
    sendStartPVEFightSignal(playerID, creatureTemplateId)
  }
}

function sendStartPVEFightSignal(playerID, creatureTemplateId){
  let message = createPVEStartFightMessage(playerID, creatureTemplateId)
  sendToAllClients(message)
}

function onPlayerReadyToFight(){
  if(setReady()){
    cycleAttack()
  }
}

function cycleAttack(){
  sendCreatureAttackRequest(creatureIndex)
}

function sendCreatureAttackRequest(creatureIndex){
  if(currentBattle[0] != ""){ // if it's a player
    let message = createCreatureAttackRequest(creatureIndex)
    console.log(message)
    clients[currentBattle[0]].send(message)
  }
  else {
    message = createCreatureAttackMessage(creatureIndex, creatureIndex, 0, Math.floor(Math.random*7))
    sendToAllClients(message)
  }
}

function onCreatureAttack(message){
  let modMessage = createCreatureAttackMessageFromMessage(message)
  sendToAllClients(modMessage)
}

function onFinishedAttack(message){
  if(setReady()){
    // we're going to handle dead creature logic in app
    if(message.teamWonIndex != -1){
      sendEndBattleMessage(message.teamWonIndex)
    }
    else if(message.creatureDied){
      sendCreatureDiedMessage()
    }
    else if(message.hasNextCreature == false){
      sendSwitchTeamsMessage()
      creatureIndex = 0
    }
    else{
      cycleAttack()
      creatureIndex++
    }
  }
}

module.exports = {
    createStartFightMessage,
    createPVEStartFightMessage,
    createCreatureAttackRequest,
    createCreatureAttackMessageFromMessage,
    createCreatureAttackMessage,
    createSwitchTeamsMessage,
    createCreatureDiedMessage,
    createEndBattleMessage,
    sendCreatureDiedMessage,
    sendEndBattleMessage,
    sendSwitchTeamsMessage,
    onSwitchedTeams,

    onPlayerFightInterrupt,
    sendStartFightSignal,
    onPVEInterrupt,
    sendStartPVEFightSignal,
    onPlayerReadyToFight,
    cycleAttack,
    sendCreatureAttackRequest,
    onCreatureAttack,
    onFinishedAttack
  };
