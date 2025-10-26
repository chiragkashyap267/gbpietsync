// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD6X1C8vdv1oG37_QbiBEJl2W9PVERjlDM",
  authDomain: "gbpietsync.firebaseapp.com",
  projectId: "gbpietsync",
  storageBucket: "gbpietsync.firebasestorage.app",
  messagingSenderId: "905784807893",
  appId: "1:905784807893:web:21eeb53380b8962a92ed5c",
  measurementId: "G-45GTJWVMPX",
  databaseURL: "https://gbpietsync-default-rtdb.firebaseio.com"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);