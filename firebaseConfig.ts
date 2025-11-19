import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC30semIKhwBNBKQsRERZ2apZ6yCIvhgAA",
  authDomain: "ebr-order-app.firebaseapp.com",
  projectId: "ebr-order-app",
  storageBucket: "ebr-order-app.firebasestorage.app",
  messagingSenderId: "1055783880466",
  appId: "1:1055783880466:web:f35dd5cedb77f8588b55cb",
  measurementId: "G-PEDN5J5ELG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
