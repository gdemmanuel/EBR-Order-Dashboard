
import { 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    getDocs,
    writeBatch
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Order, ApprovalStatus } from "../types";

// Collection References
const ORDERS_COLLECTION = "orders";
const SETTINGS_COLLECTION = "app_settings";
const GENERAL_SETTINGS_DOC = "general";

export interface AppSettings {
    empanadaFlavors: string[];
    fullSizeEmpanadaFlavors: string[];
    sheetUrl: string;
    importedSignatures: string[];
}

// --- Real-time Subscriptions ---

export const subscribeToOrders = (
    onUpdate: (orders: Order[]) => void,
    status: ApprovalStatus = ApprovalStatus.APPROVED,
    onError?: (error: Error) => void
) => {
    const q = query(collection(db, ORDERS_COLLECTION));
    
    return onSnapshot(q, (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((doc) => {
            orders.push(doc.data() as Order);
        });
        onUpdate(orders);
    }, (error) => {
        console.error("Error fetching orders:", error);
        if (onError) onError(error);
    });
};

export const subscribeToSettings = (
    onUpdate: (settings: AppSettings) => void
) => {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data() as AppSettings);
        } else {
            // Initialize defaults if doc doesn't exist
            console.log("Settings doc not found, initializing...");
        }
    });
};

// --- CRUD Operations ---

export const saveOrderToDb = async (order: Order) => {
    try {
        await setDoc(doc(db, ORDERS_COLLECTION, order.id), order);
    } catch (error) {
        console.error("Error saving order:", error);
        throw error;
    }
};

export const saveOrdersBatch = async (orders: Order[]) => {
    const batch = writeBatch(db);
    orders.forEach(order => {
        const ref = doc(db, ORDERS_COLLECTION, order.id);
        batch.set(ref, order);
    });
    await batch.commit();
};

export const deleteOrderFromDb = async (orderId: string) => {
    try {
        await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
};

export const updateSettingsInDb = async (settings: Partial<AppSettings>) => {
    try {
        await setDoc(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), settings, { merge: true });
    } catch (error) {
        console.error("Error updating settings:", error);
    }
};

// --- Migration Helper ---

export const migrateLocalDataToFirestore = async (
    localOrders: Order[],
    localPending: Order[],
    localSettings: AppSettings
) => {
    // 1. Check if DB is empty to avoid overwriting cloud data
    const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    if (!snapshot.empty) {
        console.log("Database not empty, skipping migration.");
        return;
    }

    if (localOrders.length === 0 && localPending.length === 0) {
        console.log("No local data to migrate.");
        return;
    }

    console.log("Migrating local data to Firebase...");
    const batch = writeBatch(db);

    // 2. Add Orders
    [...localOrders, ...localPending].forEach(order => {
        const ref = doc(db, ORDERS_COLLECTION, order.id);
        batch.set(ref, order);
    });

    // 3. Add Settings
    const settingsRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    batch.set(settingsRef, localSettings);

    await batch.commit();
    console.log("Migration complete.");
};
