// ---------------------------
// Basic deck & helpers
// ---------------------------
const suits = ["H","D","C","S"];
const values = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
let deck = [];

function createDeck(){
  deck = [];
  for(const s of suits){
    for(const v of values){
      deck.push({ value: v, suit: s });
    }
  }
  shuffle(deck);
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}
function draw(){
  if(deck.length === 0){
    createDeck();
    showMessage("Reshuffling deck...");
  }
  return deck.pop();
}
function cardFilename(c){ return `images/cards/${c.value}${c.suit}.png`; }
function cardValue(c){
  if(["J","Q","K"].includes(c.value)) return 10;
  if(c.value==="A") return 11;
  return Number(c.value);
}
function calcHandValue(hand){
  let total = 0, aces = 0;
  for(const c of hand){
    if(c.value==="A"){ aces++; total += 11; }
    else if(["J","Q","K"].includes(c.value)) total += 10;
    else total += Number(c.value);
  }
  while(total>21 && aces>0){ total -= 10; aces--; }
  return total;
}

// ---------------------------
// DOM elements
// ---------------------------
const dealerHandDiv = document.getElementById("dealer-hand");
const player1HandDiv = document.getElementById("player1-hand");
const player2HandDiv = document.getElementById("player2-hand");

const dealerScoreText = document.getElementById("dealer-score");
const p1ScoreText = document.getElementById("player1-score");
const p2ScoreText = document.getElementById("player2-score");

const dealBtn = document.getElementById("deal");
const hitBtn = document.getElementById("hit");
const standBtn = document.getElementById("stand");
const resetBtn = document.getElementById("reset");
const nextPlayerBtn = document.getElementById("next-player");

const messageText = document.getElementById("message");
const potDiv = document.getElementById("pot");
const deckDiv = document.getElementById("deck");
const playerCountSelect = document.getElementById("player-count");
const player2Area = document.getElementById("player2-area");
const p1BankDisplay = document.getElementById("p1-bank");
const p2BankDisplay = document.getElementById("p2-bank");

const winsText = document.getElementById("wins");
const lossesText = document.getElementById("losses");
const tiesText = document.getElementById("ties");
const clearStorageBtn = document.getElementById("clear-storage");

// ---------------------------
// Game state
// ---------------------------
let playerCount = Number(playerCountSelect ? playerCountSelect.value : 1);
let currentPlayerIndex = 0;
let players = [
  { hand: [], bankroll: 500, bet: 0, stats: { wins:0, losses:0, ties:0 }, done: false },
  { hand: [], bankroll: 500, bet: 0, stats: { wins:0, losses:0, ties:0 }, done: false }
];
let dealer = { hand: [] };
let roundActive = false;

// ---------------------------
// Persistence
// ---------------------------
function loadState(){
  try{
    const raw = localStorage.getItem("blackjack_state_v1");
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed.players) {
      players = parsed.players.map(p => ({
        hand: [],
        bankroll: typeof p.bankroll === 'number' ? p.bankroll : 500,
        bet: 0,
        stats: p.stats || { wins:0, losses:0, ties:0 },
        done: false
      }));
    }
    if(parsed.dealer) dealer = parsed.dealer;
    if(parsed.playerCount) playerCount = parsed.playerCount;
  }catch(e){ console.warn("Could not parse saved state", e); }
  updateDisplays();
}
function saveState(){
  try{
    localStorage.setItem("blackjack_state_v1", JSON.stringify({ players, dealer, playerCount }));
  }catch(e){ console.warn("Could not save state", e); }
}

// ---------------------------
// UI helpers & animations
// ---------------------------
function updateDisplays(){
  p1BankDisplay.textContent = `£${players[0].bankroll}`;
  p2BankDisplay.textContent = `£${players[1].bankroll}`;
  winsText.textContent = players[currentPlayerIndex].stats.wins;
  lossesText.textContent = players[currentPlayerIndex].stats.losses;
  tiesText.textContent = players[currentPlayerIndex].stats.ties;
}

function clearHandsUI(){
  dealerHandDiv.innerHTML = "";
  player1HandDiv.innerHTML = "";
  player2HandDiv.innerHTML = "";
}

function appendCardImageTo(div, card, hide=false){
  const img = document.createElement("img");
  img.src = hide ? "images/cards/back.png" : cardFilename(card);
  img.alt = `${card.value}${card.suit}`;
  img.classList.add("dealt");
  div.appendChild(img);
  setTimeout(()=>img.classList.remove("dealt"), 220);
  playSound("deal");
}

function animateDeal(card, targetHandDiv, hide=false){
  const img = document.createElement("img");
  img.src = "images/cards/back.png";
  img.className = "moving-clone";
  document.body.appendChild(img);

  const deckRect = deckDiv.getBoundingClientRect();
  const destRect = targetHandDiv.getBoundingClientRect();

  img.style.left = deckRect.left + "px";
  img.style.top = deckRect.top + "px";
  img.style.width = deckRect.width + "px";
  img.style.height = deckRect.height + "px";

  requestAnimationFrame(() => {
    const dx = destRect.left + (destRect.width - deckRect.width)/2;
    const dy = destRect.top + (destRect.height - deckRect.height)/2;
    img.style.transform = `translate(${dx - deckRect.left}px, ${dy - deckRect.top}px) rotate(0deg) scale(1)`;
  });

  return new Promise(res => {
    setTimeout(()=>{
      document.body.removeChild(img);
      appendCardImageTo(targetHandDiv, card, hide);
      playSound("deal");
      res();
    }, 450);
  });
}

function animateChip(fromEl, value){
  playSound("chip");
  const chipClone = document.createElement("div");
  chipClone.className = "moving-clone chip-clone";
  chipClone.textContent = value;
  document.body.appendChild(chipClone);

  const fromRect = fromEl.getBoundingClientRect();
  const potRect = potDiv.getBoundingClientRect();

  chipClone.style.left = fromRect.left + "px";
  chipClone.style.top = fromRect.top + "px";

  requestAnimationFrame(() => {
    const dx = potRect.left + (potRect.width - fromRect.width)/2;
    const dy = potRect.top + (potRect.height - fromRect.height)/2;
    chipClone.style.transform = `translate(${dx-fromRect.left}px,${dy-fromRect.top}px) scale(0.9)`;
  });

  setTimeout(()=>chipClone.remove(), 500);
}

function animatePayout(toEl, value){
  const chipClone = document.createElement("div");
  chipClone.className = "moving-clone chip-clone";
  chipClone.textContent = value;
  document.body.appendChild(chipClone);

  const potRect = potDiv.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  chipClone.style.left = potRect.left + "px";
  chipClone.style.top = potRect.top + "px";

  requestAnimationFrame(() => {
    const dx = toRect.left + (toRect.width - potRect.width)/2;
    const dy = toRect.top + (toRect.height - potRect.height)/2;
    chipClone.style.transform = `translate(${dx-potRect.left}px,${dy-potRect.top}px) scale(0.85)`;
  });

  setTimeout(()=>chipClone.remove(), 600);
}

// ---------------------------
// Betting & controls
// ---------------------------
function placeBetForPlayer(index, amount, sourceEl){
  if(roundActive){ showMessage("Round in progress — cannot bet now."); return; }
  const pl = players[index];
  if(amount > pl.bankroll){ showMessage("Not enough balance."); return; }
  pl.bet += amount;
  pl.bankroll -= amount;
  animateChip(sourceEl, amount);
  updatePotUI();
  updateDisplays();
  saveState();
  showMessage(`Player ${index+1} bet £${pl.bet}. Click Deal when ready.`);
}
function updatePotUI(){
  const totalPot = players.reduce((s,p)=>s+p.bet,0);
  potDiv.textContent = totalPot ? `£${totalPot}` : "";
}

// ---------------------------
// Game flow
// ---------------------------
function resetRoundState(){
  players.forEach(p => { p.hand = []; p.bet = 0; p.done = false; });
  dealer.hand = [];
  roundActive = false;
  currentPlayerIndex = 0;
  clearHandsUI();
  updateDisplays();
  updatePotUI();
  dealerScoreText.textContent = "Score: ?";
  p1ScoreText.textContent = "Score: 0";
  p2ScoreText.textContent = "Score: 0";
  hitBtn.disabled = true;
  standBtn.disabled = true;
  nextPlayerBtn.disabled = playerCount<2;
  resetBtn.disabled = true;
  dealBtn.disabled = false;
  showMessage("Place your bets!");
  saveState();
}

async function deal(){
  const anyBet = players.slice(0,playerCount).some(p=>p.bet>0);
  if(!anyBet){ showMessage("Place a bet first."); return; }
  dealBtn.disabled = true;
  roundActive = true;
  createDeck();
  dealer.hand = [];
  players.forEach(p => { p.hand=[]; p.done=false; });

  clearHandsUI();
  updatePotUI();

  const dealOrder = [];
  for(let r=0;r<2;r++){
    for(let p=0;p<playerCount;p++) dealOrder.push({type:"player", index:p});
    dealOrder.push({type:"dealer"});
  }

  for(const step of dealOrder){
    if(step.type==="player"){
      const card = draw();
      players[step.index].hand.push(card);
      const target = step.index===0 ? player1HandDiv : player2HandDiv;
      await animateDeal(card, target);
      const sc = calcHandValue(players[step.index].hand);
      (step.index===0 ? p1ScoreText : p2ScoreText).textContent = `Score: ${sc}`;
    } else {
      const card = draw();
      dealer.hand.push(card);
      const hide = dealer.hand.length===1;
      await animateDeal(card, dealerHandDiv, hide);
    }
  }

  currentPlayerIndex = 0;
  enablePlayerControlsFor(currentPlayerIndex);
  resetBtn.disabled = false;
  nextPlayerBtn.disabled = playerCount<2;
  showMessage(`Player 1's turn — Hit or Stand.`);
  saveState();
}

function enablePlayerControlsFor(i){
  hitBtn.disabled = false;
  standBtn.disabled = false;
  winsText.textContent = players[i].stats.wins;
  lossesText.textContent = players[i].stats.losses;
  tiesText.textContent = players[i].stats.ties;
}

async function hit(){
  if(!roundActive) return;
  const pl = players[currentPlayerIndex];
  const card = draw();
  pl.hand.push(card);
  await animateDeal(card, currentPlayerIndex===0 ? player1HandDiv : player2HandDiv);
  const sc = calcHandValue(pl.hand);
  (currentPlayerIndex===0 ? p1ScoreText : p2ScoreText).textContent = `Score: ${sc}`;

  if(sc>21){
    showMessage(`Player ${currentPlayerIndex+1} busts!`);
    pl.done = true;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    if(allPlayersDone()) await dealerPlayAndResolve();
    else if(playerCount===2 && currentPlayerIndex===0){
      currentPlayerIndex=1;
      enablePlayerControlsFor(1);
      showMessage(`Player 2's turn — Hit or Stand.`);
    }
  }
  saveState();
}

async function stand(){
  players[currentPlayerIndex].done = true;
  showMessage(`Player ${currentPlayerIndex+1} stands.`);
  hitBtn.disabled = true;
  standBtn.disabled = true;

  if(playerCount===2 && currentPlayerIndex===0){
    currentPlayerIndex=1;
    enablePlayerControlsFor(1);
    showMessage(`Player 2's turn — Hit or Stand.`);
  } else if(allPlayersDone()){
    await dealerPlayAndResolve();
  }
  saveState();
}

function allPlayersDone(){
  return players.slice(0,playerCount).every(p=>p.done);
}

async function dealerPlayAndResolve(){
  dealerHandDiv.innerHTML = "";
  dealer.hand.forEach(c => appendCardImageTo(dealerHandDiv, c));
  let dScore = calcHandValue(dealer.hand);
  dealerScoreText.textContent = `Score: ${dScore}`;

  while(dScore < 17){
    await sleep(400);
    const c = draw();
    dealer.hand.push(c);
    await animateDeal(c, dealerHandDiv);
    dScore = calcHandValue(dealer.hand);
    dealerScoreText.textContent = `Score: ${dScore}`;
  }

  for(let i=0;i<playerCount;i++){
    const pl = players[i];
    const pScore = calcHandValue(pl.hand);
    if(pScore>21){ pl.stats.losses++; playSound("lose"); continue; }
    if(dScore>21 || pScore>dScore){ pl.stats.wins++; pl.bankroll+=pl.bet*2; animatePayout(i===0?p1BankDisplay:p2BankDisplay,pl.bet*2); playSound("win"); }
    else if(pScore===dScore){ pl.stats.ties++; pl.bankroll+=pl.bet; animatePayout(i===0?p1BankDisplay:p2BankDisplay,pl.bet); playSound("tie"); }
    else { pl.stats.losses++; playSound("lose"); }
  }

  players.forEach(p=>p.bet=0);
  updateDisplays();
  updatePotUI();
  showMessage("Round over! Click Reset for the next round.");
  roundActive=false;
  resetBtn.disabled=false;
  saveState();
}

// ---------------------------
// Misc
// ---------------------------
nextPlayerBtn.addEventListener("click", ()=>{
  if(!roundActive){
    currentPlayerIndex = currentPlayerIndex===0?1:0;
    showMessage(`Player ${currentPlayerIndex+1} betting now.`);
    updateDisplays();
  }
});

resetBtn.addEventListener("click", resetRoundState);
dealBtn.addEventListener("click", deal);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
playerCountSelect.addEventListener("change", e=>{
  playerCount=Number(e.target.value);
  player2Area.classList.toggle("hidden",playerCount<2);
  resetRoundState();
  saveState();
});
clearStorageBtn.addEventListener("click", ()=>{
  if(confirm("Clear saved data?")){ localStorage.removeItem("blackjack_state_v1"); location.reload(); }
});
document.addEventListener("click", e=>{
  const chip = e.target.closest(".chip");
  if(!chip) return;
  const val = Number(chip.dataset.value);
  let targetIndex = currentPlayerIndex;
  if(playerCount===2 && player2Area.contains(chip)) targetIndex=1;
  placeBetForPlayer(targetIndex,val,chip);
});
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function showMessage(t){ messageText.textContent=t; }

// ---------------------------
// Sound Effects 🎵
// ---------------------------
const sounds = {
  deal: new Audio("sounds/deal.wav"),
  chip: new Audio("sounds/chip.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav"),
  tie: new Audio("sounds/tie.wav"),
  click: new Audio("sounds/click.wav")
};
function playSound(name){
  const s = sounds[name];
  if(!s) return;
  s.currentTime=0;
  s.play().catch(()=>{});
}

// Init
createDeck();
loadState();
resetRoundState();