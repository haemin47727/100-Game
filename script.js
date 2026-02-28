"use strict";

import { db, ref, set, onValue, update } from "./firebase.js";

// Selecting elements
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

// --- 1. PLAYER ASSIGNMENT ---
onValue(playersRef, (snapshot) => {
  const players = snapshot.val() || {};
  const assigned = sessionStorage.getItem("playerAssigned");

  if (assigned === null) {
    if (!players.player0) {
      update(playersRef, { player0: true });
      playerNumber = 0;
      sessionStorage.setItem("playerAssigned", "0");
    } else if (!players.player1) {
      update(playersRef, { player1: true });
      playerNumber = 1;
      sessionStorage.setItem("playerAssigned", "1");
    } else {
      waitingText.textContent = "Game is full! Try Resetting.";
      return;
    }
  } else {
    playerNumber = Number(assigned);
  }

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
    if (playerNumber === 0) syncState();
    return;
  }

  scores = state.scores;
  currentScore = state.currentScore;
  activePlayer = state.activePlayer;
  playing = state.playing;

  // Update UI
  score0El.textContent = scores[0];
  score1El.textContent = scores[1];
  current0El.textContent = activePlayer === 0 ? currentScore : 0;
  current1El.textContent = activePlayer === 1 ? currentScore : 0;

  // Dice
  if (state.dice && playing) {
    diceEl.classList.remove("hidden");
    diceEl.src = `dice-${state.dice}.png`;
    diceOne.classList.toggle("hidden", state.dice !== 1);
  } else {
    diceEl.classList.add("hidden");
    diceOne.classList.add("hidden");
  }

  // Active State & Winner
  player0El.classList.toggle("player--active", activePlayer === 0);
  player1El.classList.toggle("player--active", activePlayer === 1);

  if (!playing) {
    const winner = scores[0] >= 100 ? 0 : 1;
    document
      .querySelector(`.player--${winner}`)
      .classList.add("player--winner");
    document
      .querySelector(`.player--${winner}`)
      .classList.remove("player--active");
    btnRoll.disabled = true;
    btnHold.disabled = true;
  } else {
    player0El.classList.remove("player--winner");
    player1El.classList.remove("player--winner");
    const isMyTurn = playerNumber === activePlayer;
    btnRoll.disabled = !isMyTurn;
    btnHold.disabled = !isMyTurn;
  }
});

function syncState(dice = null) {
  set(gameRef, { scores, currentScore, activePlayer, playing, dice });
}

// --- 3. GAME ACTIONS ---
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
  syncState();
});

// --- 4. RESET LOGIC ---
const fullReset = () => {
  set(ref(db, "pigGame"), null);
  sessionStorage.clear();
  window.location.reload();
};

btnReset.addEventListener("click", fullReset);
btnResetMini.addEventListener("click", fullReset);
