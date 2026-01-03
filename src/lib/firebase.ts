import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyARNT75KzjORIc3qNRS4sci30AXv8yCPrE",
  authDomain: "lche-fb.firebaseapp.com",
  databaseURL: "https://lche-fb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lche-fb",
  storageBucket: "lche-fb.firebasestorage.app",
  messagingSenderId: "902847364716",
  appId: "1:902847364716:web:6c6be6a2d2f8edeaa02249",
  measurementId: "G-F0VZRQBZ4Q"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
