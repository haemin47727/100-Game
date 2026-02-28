"use strict";

import { db, ref, set, onValue, update } from "./firebase.js";

// Elements
const waitingScreen = document.getElementById("waiting-screen");
const waitingText = document.getElementById("waiting-text");
const player0El = document.querySelector(".player--0");
const player1El = document.querySelector(".player--1");
const score0El = document.querySelector("#score--0");
const score1El = document.getElementById("score--1");
const current0El = document.getElementById("current--0");
const current1El = document.getElementById("current--1");
const diceEl = document.querySelector(".dice");
const btnNew = document.querySelector(".btn--new");
const btnRoll = document.querySelector(".btn--roll");
const btnHold = document.querySelector(".btn--hold");
const btnReset = document.querySelector(".btn--reset");
const btnResetMini = document.querySelector(".btn--reset-mini");
const diceOne = document.querySelector(".one");

// Local state
let playerNumber = null;
let scores = [0, 0];
let currentScore = 0;
let activePlayer = 0;
let playing = true;

const gameRef = ref(db, "pigGame/state");
const playersRef = ref(db, "pigGame/players");

// --- 1. THE PLAYER ASSIGNMENT LOGIC (FIXED) ---
onValue(playersRef, (snapshot) => {
  const players = snapshot.val() || {};
  let assigned = sessionStorage.getItem("playerAssigned");

  if (assigned === null) {
    if (!players.player0) {
      update(playersRef, { player0: true });
      playerNumber = 0;
      sessionStorage.setItem("playerAssigned", "0");
      console.log("Assigned as Player 0");
    } else if (!players.player1) {
      update(playersRef, { player1: true });
      playerNumber = 1;
      sessionStorage.setItem("playerAssigned", "1");
      console.log("Assigned as Player 1");
    }
  } else {
    playerNumber = Number(assigned);
  }

  // Update UI Labels so you can SEE which player you are
  document.getElementById("name--0").textContent =
    playerNumber === 0 ? "P1 (YOU)" : "Player 1";
  document.getElementById("name--1").textContent =
    playerNumber === 1 ? "P2 (YOU)" : "Player 2";

  // Hide waiting screen only if BOTH players are connected
  if (players.player0 && players.player1) {
    waitingScreen.classList.add("hidden");
  } else {
    waitingScreen.classList.remove("hidden");
    waitingText.textContent =
      playerNumber === 0
        ? "Waiting for Player 2..."
        : "Waiting for Player 1...";
  }
});

// --- 2. SYNC STATE ---
onValue(gameRef, (snapshot) => {
  const state = snapshot.val();
  if (!state) {
    if (playerNumber === 0) syncState(); // Player 0 starts the database
    return;
  }

  scores = state.scores || [0, 0];
  currentScore = state.currentScore || 0;
  activePlayer = state.activePlayer ?? 0;
  playing = state.playing ?? true;

  // UI Updates
  score0El.textContent = scores[0];
  score1El.textContent = scores[1];
  current0El.textContent = activePlayer === 0 ? currentScore : 0;
  current1El.textContent = activePlayer === 1 ? currentScore : 0;

  // Dice Display
  if (state.dice && playing) {
    diceEl.classList.remove("hidden");
    diceEl.src = `dice-${state.dice}.png`;
    diceOne.classList.toggle("hidden", state.dice !== 1);
  } else {
    diceEl.classList.add("hidden");
    diceOne.classList.add("hidden");
  }

  // Active Player Highlight
  player0El.classList.toggle("player--active", activePlayer === 0);
  player1El.classList.toggle("player--active", activePlayer === 1);

  // --- BUTTON LOCKING (The fix for Player 2) ---
  if (!playing) {
    const winner = scores[0] >= 100 ? 0 : 1;
    document
      .querySelector(`.player--${winner}`)
      .classList.add("player--winner");
    btnRoll.disabled = true;
    btnHold.disabled = true;
  } else {
    player0El.classList.remove("player--winner");
    player1El.classList.remove("player--winner");

    // IMPORTANT: Check if it's your turn
    const isMyTurn = playerNumber === activePlayer;
    btnRoll.disabled = !isMyTurn;
    btnHold.disabled = !isMyTurn;

    // Change button appearance so you know they are locked
    btnRoll.style.opacity = isMyTurn ? "1" : "0.3";
    btnHold.style.opacity = isMyTurn ? "1" : "0.3";
    btnRoll.style.cursor = isMyTurn ? "pointer" : "not-allowed";
  }
});

function syncState(dice = null) {
  set(gameRef, { scores, currentScore, activePlayer, playing, dice });
}

// --- 3. ACTIONS ---
btnRoll.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;
  const dice = Math.trunc(Math.random() * 6) + 1;
  if (dice !== 1) {
    currentScore += dice;
    syncState(dice);
  } else {
    currentScore = 0;
    activePlayer = activePlayer === 0 ? 1 : 0;
    syncState(1);
  }
});

btnHold.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;
  scores[activePlayer] += currentScore;
  if (scores[activePlayer] >= 100) {
    playing = false;
  } else {
    currentScore = 0;
    activePlayer = activePlayer === 0 ? 1 : 0;
  }
  syncState();
});

btnNew.addEventListener("click", () => {
  scores = [0, 0];
  currentScore = 0;
  activePlayer = 0;
  playing = true;
  syncState(null);
});

// --- 4. THE ULTIMATE RESET ---
const fullReset = () => {
  set(ref(db, "pigGame"), null);
  sessionStorage.clear();
  window.location.reload();
};

btnReset.addEventListener("click", fullReset);
btnResetMini.addEventListener("click", fullReset);
