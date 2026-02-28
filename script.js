"use strict";

import { db, ref, set, onValue } from "./firebase.js";

// Waiting screen
const waitingScreen = document.getElementById("waiting-screen");
const waitingText = document.getElementById("waiting-text");

// Selecting elements
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
const diceOne = document.querySelector(".one");

// Local state
let playerNumber = null; // 0 or 1
let scores = [0, 0];
let currentScore = 0;
let activePlayer = 0;
let playing = true;

// Firebase references
const gameRef = ref(db, "pigGame/state");
const playersRef = ref(db, "pigGame/players");

// Assign player number (first to join = 0, second = 1)
onValue(playersRef, (snapshot) => {
  const players = snapshot.val() || {};

  // Only assign once per browser session
  if (!sessionStorage.getItem("playerAssigned")) {
    if (!players.player0) {
      set(playersRef, { ...players, player0: true });
      playerNumber = 0;
      sessionStorage.setItem("playerAssigned", "0");
      waitingText.textContent = "Waiting for Player 2 to join...";
      waitingScreen.classList.remove("hidden");
    } else if (!players.player1) {
      set(playersRef, { ...players, player1: true });
      playerNumber = 1;
      sessionStorage.setItem("playerAssigned", "1");
      waitingText.textContent = "Waiting for Player 1 to start...";
      waitingScreen.classList.remove("hidden");
    } else {
      alert("Game is full!");
      return;
    }
  } else {
    // Restore player number from session
    playerNumber = Number(sessionStorage.getItem("playerAssigned"));
  }

  // Hide waiting screen when both players are present
  if (players.player0 && players.player1) {
    waitingScreen.classList.add("hidden");
  }
});

// Sync UI from Firebase
onValue(gameRef, (snapshot) => {
  const state = snapshot.val();
  if (!state) return;

  scores = state.scores;
  currentScore = state.currentScore;
  activePlayer = state.activePlayer;
  playing = state.playing;

  // Update UI
  score0El.textContent = scores[0];
  score1El.textContent = scores[1];
  current0El.textContent = activePlayer === 0 ? currentScore : 0;
  current1El.textContent = activePlayer === 1 ? currentScore : 0;

  diceEl.classList.toggle("hidden", !state.dice);
  if (state.dice) diceEl.src = `dice-${state.dice}.png`;

  diceOne.classList.toggle("hidden", state.dice !== 1);

  player0El.classList.toggle("player--active", activePlayer === 0);
  player1El.classList.toggle("player--active", activePlayer === 1);

  // Disable buttons for non-active player
  const isMyTurn = playerNumber === activePlayer;
  btnRoll.disabled = !isMyTurn;
  btnHold.disabled = !isMyTurn;
});

// Push state to Firebase
function syncState(dice = null) {
  set(gameRef, {
    scores,
    currentScore,
    activePlayer,
    playing,
    dice,
  });
}

// Switch player
function switchPlayer() {
  currentScore = 0;
  activePlayer = activePlayer === 0 ? 1 : 0;
  syncState();
}

// Roll dice
btnRoll.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;

  const dice = Math.trunc(Math.random() * 6) + 1;

  if (dice !== 1) {
    currentScore += dice;
  } else {
    scores[activePlayer] = 0;
    switchPlayer();
  }

  syncState(dice);
});

// Hold
btnHold.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;

  scores[activePlayer] += currentScore;

  if (scores[activePlayer] >= 100) {
    playing = false;
  } else {
    switchPlayer();
  }

  syncState();
});

// New game
btnNew.addEventListener("click", () => {
  scores = [0, 0];
  currentScore = 0;
  activePlayer = 0;
  playing = true;

  syncState();
});
