import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  onDisconnect,
  get,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMIKAyf5JFPhGpiB-tuVeGd1tSnaXQUNI",
  authDomain: "pig-game-41ca2.firebaseapp.com",
  databaseURL: "https://pig-game-41ca2-default-rtdb.firebaseio.com",
  projectId: "pig-game-41ca2",
  storageBucket: "pig-game-41ca2.firebasestorage.app",
  messagingSenderId: "551642516001",
  appId: "1:551642516001:web:bf9f7c0d0315fe03ac3160",
  measurementId: "G-98N9SESXKJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("Firebase initialized for project:", firebaseConfig.projectId);

export { db, ref, set, onValue, update, onDisconnect, get, runTransaction };
