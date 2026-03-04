// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBl00TuQ9zLmtFAgI-oJ3M7kdNscntJRe8",
  authDomain: "padeldb-86184.firebaseapp.com",
  projectId: "padeldb-86184",
  storageBucket: "padeldb-86184.firebasestorage.app",
  messagingSenderId: "209543124184",
  appId: "1:209543124184:web:c366329d52ab63af2f33ad",
  measurementId: "G-WZRG4WWSZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);