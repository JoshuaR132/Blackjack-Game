
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
  // guard: reshuffle if deck empty
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
let currentPlayerIndex = 0; // 0 -> player1, 1 -> player2
let players = [
  { hand: [], bankroll: 500, bet: 0, stats: { wins:0, losses:0, ties:0 } },
  { hand: [], bankroll: 500, bet: 0, stats: { wins:0, losses:0, ties:0 } }
];
let dealer = { hand: [] };
let roundActive = false;
let dealingQueue = Promise.resolve();

// ---------------------------
// Persistence
// ---------------------------
// ---------------------------
// Persistence
// ---------------------------
function loadState(){
  try{
    const raw = localStorage.getItem("blackjack_state_v1");
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed.players) players = parsed.players;
    if(parsed.dealer) dealer = parsed.dealer;
    if(parsed.playerCount) playerCount = parsed.playerCount;
  }catch(e){ console.warn("Could not parse saved state", e); }
  updateDisplays();
}
function saveState(){
  const copy = { players, dealer, playerCount };
  try{ localStorage.setItem("blackjack_state_v1", JSON.stringify(copy)); }
  catch(e){ console.warn("Could not save state", e); }
}

// ---------------------------
// UI helpers & animations
// ---------------------------
function updateDisplays(){
  if(p1BankDisplay) p1BankDisplay.textContent = `£${players[0].bankroll}`;
  if(p2BankDisplay) p2BankDisplay.textContent = `£${players[1].bankroll}`;
  if(winsText) winsText.textContent = players[currentPlayerIndex].stats.wins;
  if(lossesText) lossesText.textContent = players[currentPlayerIndex].stats.losses;
  if(tiesText) tiesText.textContent = players[currentPlayerIndex].stats.ties;
}

function clearHandsUI(){
  dealerHandDiv.innerHTML = "";
  player1HandDiv.innerHTML = "";
  player2HandDiv.innerHTML = "";
}

// append real card image (non-animated)
function appendCardImageTo(div, card, hide=false){
  const img = document.createElement("img");
  img.src = hide ? "images/cards/back.png" : cardFilename(card);
  img.alt = `${card.value}${card.suit}`;
  img.classList.add("dealt");
  div.appendChild(img);
  setTimeout(()=>img.classList.remove("dealt"), 220);
  playSound("deal");
}

// animate a card from deck element to a target hand element (then attach real card)
function animateDeal(card, targetHandDiv, hide=false){
  const img = document.createElement("img");
  img.src = "images/cards/back.png";
  img.className = "moving-clone";
  document.body.appendChild(img);

  const deckRect = deckDivRect();
  const destRect = handDestRect(targetHandDiv);

  img.style.left = deckRect.left + "px";
  img.style.top = deckRect.top + "px";
  img.style.width = deckRect.width + "px";
  img.style.height = deckRect.height + "px";
  img.style.transform = "rotate(-6deg)";

  requestAnimationFrame(() => {
    const dx = destRect.left + (destRect.width - deckRect.width)/2;
    const dy = destRect.top + (destRect.height - deckRect.height)/2;
    img.style.transform = "translate(" + (dx - deckRect.left) + "px," + (dy - deckRect.top) + "px) rotate(0deg) scale(1)";
    img.style.opacity = "1";
  });

  return new Promise(res => {
    setTimeout(()=>{
      if(img.parentElement) document.body.removeChild(img);
      appendCardImageTo(targetHandDiv, card, hide);
      playSound("deal");
      res();
    }, 460);
  });
}

function deckDivRect(){ return deckDiv.getBoundingClientRect(); }
function handDestRect(div){ return div.getBoundingClientRect(); }

// chip animation: animate small chip element from chip button to pot
function animateChip(fromEl, value){
  playSound("chip");
  const chipClone = document.createElement("div");
  chipClone.className = "moving-clone chip-clone";
  chipClone.textContent = value;
  document.body.appendChild(chipClone);

  const fromRect = fromEl.getBoundingClientRect();
  const potRect = potDiv.getBoundingClientRect();

  chipClone.style.left = (fromRect.left) + "px";
  chipClone.style.top = (fromRect.top) + "px";
  chipClone.style.width = fromRect.width + "px";
  chipClone.style.height = fromRect.height + "px";

  requestAnimationFrame(() => {
    const dx = potRect.left + (potRect.width - fromRect.width)/2;
    const dy = potRect.top + (potRect.height - fromRect.height)/2;
    chipClone.style.transform = `translate(${dx-fromRect.left}px,${dy-fromRect.top}px) scale(0.9)`;
  });

  setTimeout(()=>{ chipClone.remove(); }, 520);
}

// payout animation from pot to player bank display
function animatePayout(toEl, value){
  const chipClone = document.createElement("div");
  chipClone.className = "moving-clone chip-clone";
  chipClone.textContent = value;
  document.body.appendChild(chipClone);

  const potRect = potDiv.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  chipClone.style.left = (potRect.left) + "px";
  chipClone.style.top = (potRect.top) + "px";

  requestAnimationFrame(() => {
    const dx = toRect.left + (toRect.width - potRect.width)/2;
    const dy = toRect.top + (toRect.height - potRect.height)/2;
    chipClone.style.transform = `translate(${dx-potRect.left}px,${dy-potRect.top}px) scale(0.85)`;
  });

  setTimeout(()=>{ chipClone.remove(); }, 600);
}

// ---------------------------
// Betting & controls
// ---------------------------
function placeBetForActivePlayer(amount, sourceEl){
  if(roundActive) { showMessage("Round in progress — cannot bet now."); return; }
  const pl = players[currentPlayerIndex];
  if(amount > pl.bankroll){ showMessage("You don't have enough for that bet."); return; }
  pl.bet += amount;
  pl.bankroll -= amount;
  animateChip(sourceEl, amount);
  updatePotUI();
  updateDisplays();
  saveState();
  showMessage(`Player ${currentPlayerIndex+1} bet £${pl.bet}. Click Deal when ready.`);
}

function updatePotUI(){
  const totalPot = players.reduce((s,p)=>s+p.bet,0);
  potDiv.textContent = totalPot > 0 ? `£${totalPot}` : "";
}

// ---------------------------
// Game flow: dealing, hit/stand, dealer AI
// ---------------------------
function resetRoundState(){
  players.forEach(p => { p.hand = []; p.bet = 0; });
  dealer.hand = [];
  roundActive = false;
  currentPlayerIndex = 0;
  clearHandsUI();
  updateDisplays();
  updatePotUI();
  if(dealerScoreText) dealerScoreText.textContent = "Score: ?";
  if(p1ScoreText) p1ScoreText.textContent = "Score: 0";
  if(p2ScoreText) p2ScoreText.textContent = "Score: 0";
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
  if(nextPlayerBtn) nextPlayerBtn.disabled = true;
  if(resetBtn) resetBtn.disabled = true;
  if(dealBtn) dealBtn.disabled = false;
  showMessage("Place your bet to begin.");
  saveState();
}

async function deal(){
  // require at least one player's bet
  const anyBet = players.slice(0,playerCount).some(p=>p.bet>0);
  if(!anyBet){ showMessage("Place a bet first."); return; }
  if(dealBtn) dealBtn.disabled = true;
  roundActive = true;
  createDeck();

  // clear hands and UI
  dealer.hand = [];
  players.forEach((p,i)=>{ p.hand = []; if(i>=playerCount) p.bet = 0; });

  clearHandsUI();
  updatePotUI();

  // initial deal order: player1, player2 (if present), dealer, repeat
  const dealOrder = [];
  for(let r=0;r<2;r++){
    for(let p=0;p<playerCount;p++) dealOrder.push({type:"player", playerIndex:p});
    dealOrder.push({type:"dealer"});
  }

  for(const step of dealOrder){
    if(step.type==="player"){
      const card = draw(); players[step.playerIndex].hand.push(card);
      const targetDiv = step.playerIndex===0 ? player1HandDiv : player2HandDiv;
      await animateDeal(card, targetDiv, false);
      await sleep(80);
      const sc = calcHandValue(players[step.playerIndex].hand);
      if(step.playerIndex===0 && p1ScoreText) p1ScoreText.textContent = `Score: ${sc}`;
      else if(p2ScoreText) p2ScoreText.textContent = `Score: ${sc}`;
    } else {
      const card = draw(); dealer.hand.push(card);
      const hideFirst = dealer.hand.length===1;
      await animateDeal(card, dealerHandDiv, hideFirst);
      await sleep(80);
    }
  }

  currentPlayerIndex = 0;
  enablePlayerControlsFor(currentPlayerIndex);
  if(resetBtn) resetBtn.disabled = false;
  if(nextPlayerBtn) nextPlayerBtn.disabled = playerCount<2;
  showMessage(`Player ${currentPlayerIndex+1}'s turn — Hit or Stand.`);
  saveState();
}

function enablePlayerControlsFor(index){
  const pl = players[index];
  const sc = calcHandValue(pl.hand);
  if(hitBtn) hitBtn.disabled = sc>21;
  if(standBtn) standBtn.disabled = sc>21;
  if(winsText) winsText.textContent = pl.stats.wins;
  if(lossesText) lossesText.textContent = pl.stats.losses;
  if(tiesText) tiesText.textContent = pl.stats.ties;
}

// hit for current player
async function hit(){
  if(!roundActive) return;
  const pl = players[currentPlayerIndex];
  const card = draw();
  pl.hand.push(card);
  const targetDiv = currentPlayerIndex===0 ? player1HandDiv : player2HandDiv;
  await animateDeal(card, targetDiv, false);
  const sc = calcHandValue(pl.hand);
  if(currentPlayerIndex===0 && p1ScoreText) p1ScoreText.textContent = `Score: ${sc}`;
  else if(p2ScoreText) p2ScoreText.textContent = `Score: ${sc}`;

  if(sc>21){
    showMessage(`Player ${currentPlayerIndex+1} busted!`);
    if(hitBtn) hitBtn.disabled = true;
    if(standBtn) standBtn.disabled = true;
  } else {
    showMessage(`Player ${currentPlayerIndex+1} — Score: ${sc}.`);
  }
  saveState();
}

async function stand(){
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
  showMessage(`Player ${currentPlayerIndex+1} stands on ${calcHandValue(players[currentPlayerIndex].hand)}.`);
  if(playerCount===2 && currentPlayerIndex===0){
    if(nextPlayerBtn) nextPlayerBtn.disabled = false;
    showMessage("Click Next Player to continue with Player 2.");
  } else {
    await dealerPlayAndResolve();
  }
  saveState();
}

if(nextPlayerBtn) nextPlayerBtn.addEventListener("click", ()=>{
  currentPlayerIndex = 1;
  enablePlayerControlsFor(currentPlayerIndex);
  nextPlayerBtn.disabled = true;
  showMessage(`Player ${currentPlayerIndex+1}'s turn — Hit or Stand.`);
});

async function dealerPlayAndResolve(){
  // reveal dealer's hidden card (re-render dealer hand with reveal)
  dealerHandDiv.innerHTML = "";
  dealer.hand.forEach(c=> appendCardImageTo(dealerHandDiv, c, false));
  let dealerScore = calcHandValue(dealer.hand);
  dealerScoreText.textContent = `Score: ${dealerScore}`;
  // dealer hits until 17+
  while(dealerScore < 17){
    await sleep(380);
    const c = draw();
    dealer.hand.push(c);
    await animateDeal(c, dealerHandDiv, false);
    dealerScore = calcHandValue(dealer.hand);
    dealerScoreText.textContent = `Score: ${dealerScore}`;
  }

  // evaluate each player
  for(let pi=0; pi<playerCount; pi++){
    const pl = players[pi];
    const pScore = calcHandValue(pl.hand);
    const dScore = dealerScore;
    let resultText;
    if(pScore>21){
      resultText = "bust";
      pl.stats.losses++;
    } else if(dScore>21){
      resultText = "dealer-bust";
      pl.stats.wins++;
      pl.bankroll += pl.bet * 2; // win pays 1:1 plus original stake
      // payout animation
      const bankEl = pi===0 ? p1BankDisplay : p2BankDisplay;
      animatePayout(bankEl, pl.bet*2);
    } else if(pScore === dScore){
      resultText = "push";
      pl.stats.ties++;
      pl.bankroll += pl.bet; // return stake
      animatePayout(pi===0 ? p1BankDisplay : p2BankDisplay, pl.bet);
    } else if(pScore > dScore){
      resultText = "win";
      pl.stats.wins++;
      pl.bankroll += pl.bet * 2; // 1:1 payout
      animatePayout(pi===0 ? p1BankDisplay : p2BankDisplay, pl.bet*2);
    } else {
      resultText = "lose";
      pl.stats.losses++;
      // bet already deducted
    }
  }

  // reset bets
  players.forEach((p,i)=> p.bet = 0);

  // show summary
  const messages = players.slice(0,playerCount).map((p,i)=>{
    const s = calcHandValue(p.hand);
    const d = calcHandValue(dealer.hand);
    let r = "Loss";
    if(s>21) r = "Busted";
    else if(d>21) r = "Dealer busted — Win";
    else if(s===d) r = "Tie";
    else if(s>d) r = "Win";
    else r = "Loss";
    return `P${i+1}: ${s} — ${r}`;
  });
  showMessage(`Round over. Dealer: ${calcHandValue(dealer.hand)}. Results: ${messages.join(" | ")}`);

  // UI updates
  updateDisplays();
  updatePotUI();
  roundActive = false;
  resetBtn.disabled = false;
  hitBtn.disabled = true; standBtn.disabled = true;
  saveState();
}

// Reset for next round (keeps bankroll/stats)
resetBtn.addEventListener("click", ()=>{ resetRoundState(); });

// Deal/hit/stand bindings
dealBtn.addEventListener("click", ()=> deal());
hitBtn.addEventListener("click", ()=> hit());
standBtn.addEventListener("click", ()=> stand());

// player count change
playerCountSelect.addEventListener("change", (e)=>{
  playerCount = Number(e.target.value);
  player2Area.classList.toggle("hidden", playerCount<2);
  resetRoundState();
  saveState();
});

// Clear saved storage
clearStorageBtn.addEventListener("click", ()=>{
  if(confirm("Clear saved bankrolls & stats? This cannot be undone.")){
    localStorage.removeItem("blackjack_state_v1");
    location.reload();
  }
});

// Chip buttons live in DOM — delegated handler (single listener)
document.addEventListener("click", (e)=>{
  const chip = e.target.closest ? e.target.closest('.chip') : (e.target.matches && e.target.matches('.chip') ? e.target : null);
  if(!chip) return;
  const val = Number(chip.dataset.value);
  if(Number.isNaN(val)) return;
  placeBetForActivePlayer(val, chip);
});

// small helper
function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }
function showMessage(txt){ messageText.textContent = txt; }

// initialize
createDeck();
loadState();
resetRoundState();

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

function playSound(name) {
  const s = sounds[name];
  if (!s) return;
  s.currentTime = 0; // restart sound if it's already playing
  s.play().catch(() => {}); // ignore autoplay restrictions
}

