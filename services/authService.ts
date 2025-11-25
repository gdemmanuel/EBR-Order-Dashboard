
import firebase from "firebase/compat/app";
import { auth } from "../firebaseConfig";

export const login = async (email: string, pass: string) => {
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error: any) {
        throw error;
    }
};

export const logout = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Error signing out", error);
    }
};

export const subscribeToAuth = (callback: (user: firebase.User | null) => void) => {
    return auth.onAuthStateChanged((user) => {
        callback(user);
    });
};
