// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-7KD9S2-c8IK7Pl6C68sWd19leAWAAE8",
  authDomain: "twinmind-test.firebaseapp.com",
  projectId: "twinmind-test",
  storageBucket: "twinmind-test.firebasestorage.app",
  messagingSenderId: "93116964233",
  appId: "1:93116964233:web:6e9ba30f3bf46384a2d558",
  measurementId: "G-XW79KCVJNC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// 🔑 Request calendar access in addition to profile/email
provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

export { auth, provider, signInWithPopup };