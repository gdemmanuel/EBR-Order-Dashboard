
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    User 
} from "firebase/auth";
import { auth } from "../firebaseConfig";

export const login = async (email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
    }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};
