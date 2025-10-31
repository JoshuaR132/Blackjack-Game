const suits = ["H", "D", "C", "S"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
let deck = [];
let playerHand = [];
let dealerHand = [];

const dealerHandDiv = document.getElementById("dealer-hand");
const playerHandDiv = document.getElementById("player-hand");
const dealerScoreText = document.getElementById("dealer-score");
const playerScoreText = document.getElementById("player-score");
const messageText = document.getElementById("message");

const dealBtn = document.getElementById("deal");
const hitBtn = document.getElementById("hit");
const standBtn = document.getElementById("stand");
const resetBtn = document.getElementById("reset");

// Build and shuffle deck
function createDeck() {
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({ value: v, suit: s });
    }
  }
  shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Draw one card
function drawCard() {
  return deck.pop();
}

// Get value of a hand
function calculateHandValue(hand) {
  let total = 0;
  let aces = 0;
  for (let card of hand) {
    if (["J", "Q", "K"].includes(card.value)) total += 10;
    else if (card.value === "A") {
      aces += 1;
      total += 11;
    } else total += Number(card.value);
  }
  // Adjust for aces
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

// Display hand visually
function renderHand(hand, div, hideFirstCard = false) {
  div.innerHTML = "";
  hand.forEach((card, index) => {
    const img = document.createElement("img");
    if (hideFirstCard && index === 0) {
      img.src = "images/cards/back.png";
    } else {
      img.src = `images/cards/${card.value}${card.suit}.png`;
    }
    div.appendChild(img);
  });
}

// Deal initial cards
function deal() {
  createDeck();
  playerHand = [drawCard(), drawCard()];
  dealerHand = [drawCard(), drawCard()];
  renderHand(playerHand, playerHandDiv);
  renderHand(dealerHand, dealerHandDiv, true);
  playerScoreText.textContent = `Score: ${calculateHandValue(playerHand)}`;
  dealerScoreText.textContent = `Score: ?`;

  messageText.textContent = "";
  dealBtn.disabled = true;
  hitBtn.disabled = false;
  standBtn.disabled = false;
}

// Player hits
function hit() {
  playerHand.push(drawCard());
  renderHand(playerHand, playerHandDiv);
  const playerScore = calculateHandValue(playerHand);
  playerScoreText.textContent = `Score: ${playerScore}`;

  if (playerScore > 21) {
    endGame("You busted! Dealer wins.");
  }
}

// Player stands
function stand() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
  renderHand(dealerHand, dealerHandDiv, false);

  // Dealer plays
  while (calculateHandValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
    renderHand(dealerHand, dealerHandDiv, false);
  }

  const playerScore = calculateHandValue(playerHand);
  const dealerScore = calculateHandValue(dealerHand);
  dealerScoreText.textContent = `Score: ${dealerScore}`;

  if (dealerScore > 21) endGame("Dealer busted! You win!");
  else if (dealerScore === playerScore) endGame("It's a tie!");
  else if (playerScore > dealerScore) endGame("You win!");
  else endGame("Dealer wins!");
}

// End game
function endGame(msg) {
  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = true;
  messageText.textContent = msg;
  renderHand(dealerHand, dealerHandDiv, false);
  dealerScoreText.textContent = `Score: ${calculateHandValue(dealerHand)}`;
}

// Reset
function reset() {
  playerHand = [];
  dealerHand = [];
  playerHandDiv.innerHTML = "";
  dealerHandDiv.innerHTML = "";
  dealerScoreText.textContent = "Score: ?";
  playerScoreText.textContent = "Score: 0";
  messageText.textContent = "";
  dealBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

dealBtn.addEventListener("click", deal);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
resetBtn.addEventListener("click", reset);
