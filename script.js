"use strict";

import { db, ref, set, onValue, update, onDisconnect } from "./firebase.js";

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

// Local state
let playerNumber = null;
let scores = [0, 0];
let currentScore = 0;
let activePlayer = 0;
let playing = true;

const gameRef = ref(db, "pigGame/state");
const playersRef = ref(db, "pigGame/players");

// --- 1. THE STABILIZED JOINING LOGIC ---

const initConnection = () => {
  const savedID = sessionStorage.getItem("playerAssigned");

  if (savedID !== null) {
    playerNumber = Number(savedID);
    startMultiplayerLogic();
  } else {
    // Look at database ONCE to pick a free slot
    onValue(
      playersRef,
      (snapshot) => {
        if (playerNumber !== null) return;

        const players = snapshot.val() || {};
        if (!players.player0) {
          playerNumber = 0;
          sessionStorage.setItem("playerAssigned", "0");
          update(playersRef, { player0: true });
        } else if (!players.player1) {
          playerNumber = 1;
          sessionStorage.setItem("playerAssigned", "1");
          update(playersRef, { player1: true });
        } else {
          waitingText.textContent = "Game is Full! Reset required.";
          return;
        }

        startMultiplayerLogic();
      },
      { onlyOnce: true },
    );
  }
};

function startMultiplayerLogic() {
  // A. Clean up if tab closes
  onDisconnect(ref(db, `pigGame/players/player${playerNumber}`)).remove();

  // B. Monitor Player Presence (Handles Waiting Screen)
  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};

    // Update Player Name UI
    document.getElementById("name--0").textContent =
      playerNumber === 0 ? "P1 (YOU)" : "Player 1";
    document.getElementById("name--1").textContent =
      playerNumber === 1 ? "P2 (YOU)" : "Player 2";

    // Show/Hide waiting screen based on BOTH players being true
    if (players.player0 === true && players.player1 === true) {
      waitingScreen.classList.add("hidden");
    } else {
      waitingScreen.classList.remove("hidden");
      waitingText.textContent =
        playerNumber === 0
          ? "Waiting for Player 2..."
          : "Waiting for Player 1...";
    }
  });

  // C. Monitor Game State Sync
  onValue(gameRef, (snapshot) => {
    const state = snapshot.val();

    // If game node is deleted (Reset All), force a fresh start
    if (!state && sessionStorage.getItem("playerAssigned") !== null) {
      sessionStorage.clear();
      window.location.reload();
      return;
    }

    if (!state) {
      if (playerNumber === 0) syncState();
      return;
    }

    // Sync local variables with Firebase
    scores = state.scores || [0, 0];
    currentScore = state.currentScore || 0;
    activePlayer = state.activePlayer ?? 0;
    playing = state.playing ?? true;

    // Update UI
    score0El.textContent = scores[0];
    score1El.textContent = scores[1];
    current0El.textContent = activePlayer === 0 ? currentScore : 0;
    current1El.textContent = activePlayer === 1 ? currentScore : 0;

    if (state.dice && playing) {
      diceEl.classList.remove("hidden");
      diceEl.src = `dice-${state.dice}.png`;
    } else {
      diceEl.classList.add("hidden");
    }

    player0El.classList.toggle("player--active", activePlayer === 0);
    player1El.classList.toggle("player--active", activePlayer === 1);

    // Turn Locking Logic
    const isMyTurn = playerNumber === activePlayer && playing;
    btnRoll.disabled = !isMyTurn;
    btnHold.disabled = !isMyTurn;
    btnRoll.style.opacity = isMyTurn ? "1" : "0.3";
    btnHold.style.opacity = isMyTurn ? "1" : "0.3";

    if (!playing) {
      const winner = scores[0] >= 100 ? 0 : 1;
      document
        .querySelector(`.player--${winner}`)
        .classList.add("player--winner");
    } else {
      player0El.classList.remove("player--winner");
      player1El.classList.remove("player--winner");
    }
  });
}

function syncState(dice = null) {
  set(gameRef, { scores, currentScore, activePlayer, playing, dice });
}

// --- 2. GAME ACTIONS ---

btnRoll.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;
  const dice = Math.trunc(Math.random() * 6) + 1;
  if (dice !== 1) {
    currentScore += dice;
  } else {
    currentScore = 0;
    activePlayer = activePlayer === 0 ? 1 : 0;
  }
  syncState(dice);
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

const fullReset = () => {
  // Clear the entire game path in Firebase
  set(ref(db, "pigGame"), null);
  sessionStorage.clear();
  window.location.reload();
};

btnReset.addEventListener("click", fullReset);
btnResetMini.addEventListener("click", fullReset);

// Start the app
initConnection();
