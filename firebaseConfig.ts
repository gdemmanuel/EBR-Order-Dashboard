
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC30semIKhwBNBKQsRERZ2apZ6yCIvhgAA",
  authDomain: "ebr-order-app.firebaseapp.com",
  projectId: "ebr-order-app",
  storageBucket: "ebr-order-app.firebasestorage.app",
  messagingSenderId: "1055783880466",
  appId: "1:1055783880466:web:f35dd5cedb77f8588b55cb",
  measurementId: "G-PEDN5J5ELG"
};

// Initialize Firebase (Compat)
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Export Modular Firestore for dbService.ts
// Explicitly passing 'app' ensures it uses the initialized instance, preventing race conditions
export const db = getFirestore(app as any); 

// Export Compat Auth for authService.ts and App.tsx
export const auth = app.auth();

export default app;