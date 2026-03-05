"use strict";

import {
  db,
  ref,
  set,
  onValue,
  update,
  onDisconnect,
  runTransaction,
} from "./firebase.js";

// Elements
const waitingScreen = document.getElementById("waiting-screen");
const waitingText = document.getElementById("waiting-text");
const oinkEl = document.getElementById("oink-message"); // New Element
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
// const btnReset = document.querySelector(".btn--reset");

// Local state
let playerNumber = null;
let scores = [0, 0];
let currentScore = 0;
let activePlayer = 0;
let playing = true;

const gameRef = ref(db, "pigGame/state");
const playersRef = ref(db, "pigGame/players");

// --- 1. JOIN LOGIC ---
const startApp = async () => {
  const savedID = sessionStorage.getItem("playerAssigned");
  if (savedID !== null) {
    playerNumber = Number(savedID);
    startMultiplayer();
  } else {
    try {
      const result = await runTransaction(playersRef, (currentData) => {
        if (currentData === null) currentData = {};
        if (!currentData.player0) {
          currentData.player0 = true;
          return currentData;
        } else if (!currentData.player1) {
          currentData.player1 = true;
          return currentData;
        } else return;
      });
      if (result.committed) {
        const players = result.snapshot.val();
        playerNumber = players.player1 && players.player0 ? 1 : 0;
        sessionStorage.setItem("playerAssigned", playerNumber.toString());
        if (playerNumber === 0) await resetGameState();
        startMultiplayer();
      }
    } catch (e) {
      console.error(e);
    }
  }
};

async function resetGameState() {
  await set(gameRef, {
    scores: [0, 0],
    currentScore: 0,
    activePlayer: 0,
    playing: true,
    message: "",
    dice: null,
  });
}

// --- 2. MULTIPLAYER SYNC ---
function startMultiplayer() {
  onDisconnect(ref(db, `pigGame/players/player${playerNumber}`)).remove();

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    document.getElementById("name--0").textContent =
      playerNumber === 0 ? "P1 (YOU)" : "P1";
    document.getElementById("name--1").textContent =
      playerNumber === 1 ? "P2 (YOU)" : "P2";

    // Waiting screen ONLY shows if a player is missing
    if (players.player0 && players.player1) {
      waitingScreen.classList.add("hidden");
    } else {
      waitingScreen.classList.remove("hidden");
      waitingText.textContent = "Waiting for Opponent...";
    }
  });

  onValue(gameRef, (snapshot) => {
    const state = snapshot.val();
    if (!state) return;

    scores = state.scores || [0, 0];
    currentScore = state.currentScore || 0;
    activePlayer = state.activePlayer ?? 0;
    playing = state.playing ?? true;

    score0El.textContent = scores[0];
    score1El.textContent = scores[1];
    current0El.textContent = activePlayer === 0 ? currentScore : 0;
    current1El.textContent = activePlayer === 1 ? currentScore : 0;

    // Dice logic
    if (state.dice && playing) {
      diceEl.classList.remove("hidden");
      diceEl.src = `dice-${state.dice}.png`;
    } else diceEl.classList.add("hidden");

    // "Oink" Message Logic (Small text under dice)
    if (state.message) {
      oinkEl.classList.remove("hidden");
      oinkEl.innerHTML = state.message;
      // Clear the message after 3 seconds
      if (playerNumber === 0) {
        setTimeout(() => update(gameRef, { message: "" }), 3000);
      }
    } else {
      oinkEl.classList.add("hidden");
    }

    player0El.classList.toggle("player--active", activePlayer === 0);
    player1El.classList.toggle("player--active", activePlayer === 1);

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
      waitingScreen.classList.remove("hidden");
      waitingText.innerHTML = `Player ${winner + 1} Wins!<br><span style="font-size: 1.5rem">Press "New Game" to play again</span>`;
    } else {
      player0El.classList.remove("player--winner");
      player1El.classList.remove("player--winner");
    }
  });
}

function syncState(dice = null, extra = {}) {
  set(gameRef, { scores, currentScore, activePlayer, playing, dice, ...extra });
}

// --- 3. ACTIONS ---
btnRoll.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;
  const dice = Math.trunc(Math.random() * 6) + 1;

  if (dice !== 1) {
    currentScore += dice;
    syncState(dice);
  } else {
    // Greedy Penalty: Reset total score to 0 and switch turn
    scores[activePlayer] = 0;
    currentScore = 0;
    const nextPlayer = activePlayer === 0 ? 1 : 0;
    syncState(dice, {
      activePlayer: nextPlayer,
      message: "Oink 🐷 You rolled a 1! You greedy pig!",
    });
  }
});

btnHold.addEventListener("click", () => {
  if (!playing || playerNumber !== activePlayer) return;
  scores[activePlayer] += currentScore;
  if (scores[activePlayer] >= 100) {
    playing = false;
    syncState(null);
  } else {
    currentScore = 0;
    const nextPlayer = activePlayer === 0 ? 1 : 0;
    syncState(null, { activePlayer: nextPlayer });
  }
});

btnNew.addEventListener("click", () => resetGameState());

// btnReset.addEventListener("click", () => {
//   set(ref(db, "pigGame"), null);
//   sessionStorage.clear();
//   window.location.reload();
// });

startApp();
