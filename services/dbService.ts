
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
import { Order, ApprovalStatus, PricingSettings, Flavor } from "../types";
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from "../data/mockData";

// Collection References
const ORDERS_COLLECTION = "orders";
const SETTINGS_COLLECTION = "app_settings";
const GENERAL_SETTINGS_DOC = "general";

export interface AppSettings {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    sheetUrl: string;
    importedSignatures: string[];
    pricing: PricingSettings;
    prepSettings: {
        lbsPer20: Record<string, number>; // Key: Flavor Name, Value: Lbs required for 20 mini empanadas
        fullSizeMultiplier: number; // How much bigger is a full size? Default 2.0
    };
    materialCosts: Record<string, number>; // Key: Flavor Name, Value: Cost per lb
    discoCosts: {
        mini: number;
        full: number;
    };
    inventory: Record<string, { mini: number; full: number }>; // Key: Flavor Name, Value: counts
}

const DEFAULT_SETTINGS: AppSettings = {
    empanadaFlavors: initialEmpanadaFlavors.map(f => ({ name: f, visible: true })),
    fullSizeEmpanadaFlavors: initialFullSizeEmpanadaFlavors.map(f => ({ name: f, visible: true })),
    sheetUrl: '',
    importedSignatures: [],
    pricing: {
        mini: { basePrice: 1.75 },
        full: { basePrice: 3.00 },
        packages: [],
        salsaSmall: 2.00,
        salsaLarge: 4.00
    },
    prepSettings: {
        lbsPer20: {},
        fullSizeMultiplier: 2.0
    },
    materialCosts: {},
    discoCosts: { mini: 0.10, full: 0.15 },
    inventory: {}
};

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
    onUpdate: (settings: AppSettings) => void,
    onError?: (error: Error) => void
) => {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Migration Logic: Handle legacy string arrays for flavors
            let safeMiniFlavors: Flavor[] = DEFAULT_SETTINGS.empanadaFlavors;
            if (data.empanadaFlavors && Array.isArray(data.empanadaFlavors)) {
                if (data.empanadaFlavors.length > 0 && typeof data.empanadaFlavors[0] === 'string') {
                    safeMiniFlavors = (data.empanadaFlavors as unknown as string[]).map(f => ({ name: f, visible: true }));
                } else {
                    safeMiniFlavors = data.empanadaFlavors as Flavor[];
                }
            }

            let safeFullFlavors: Flavor[] = DEFAULT_SETTINGS.fullSizeEmpanadaFlavors;
            if (data.fullSizeEmpanadaFlavors && Array.isArray(data.fullSizeEmpanadaFlavors)) {
                if (data.fullSizeEmpanadaFlavors.length > 0 && typeof data.fullSizeEmpanadaFlavors[0] === 'string') {
                    safeFullFlavors = (data.fullSizeEmpanadaFlavors as unknown as string[]).map(f => ({ name: f, visible: true }));
                } else {
                    safeFullFlavors = data.fullSizeEmpanadaFlavors as Flavor[];
                }
            }

            const mergedSettings: AppSettings = {
                ...DEFAULT_SETTINGS,
                ...data,
                empanadaFlavors: safeMiniFlavors,
                fullSizeEmpanadaFlavors: safeFullFlavors,
                pricing: {
                    ...DEFAULT_SETTINGS.pricing,
                    ...(data.pricing || {})
                },
                prepSettings: {
                    ...DEFAULT_SETTINGS.prepSettings,
                    ...(data.prepSettings || {})
                },
                materialCosts: data.materialCosts || DEFAULT_SETTINGS.materialCosts,
                discoCosts: data.discoCosts || DEFAULT_SETTINGS.discoCosts,
                inventory: data.inventory || DEFAULT_SETTINGS.inventory
            };
            
            onUpdate(mergedSettings);
        } else {
            // Initialize defaults if doc doesn't exist
            console.log("Settings doc not found, initializing defaults...");
            onUpdate(DEFAULT_SETTINGS);
        }
    }, (error) => {
        console.error("Error fetching settings:", error);
        if (onError) onError(error);
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
        throw error;
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
    // Ensure we migrate pricing or default if not present locally
    const settingsToSave = {
        ...DEFAULT_SETTINGS,
        ...localSettings,
        pricing: localSettings.pricing || DEFAULT_SETTINGS.pricing,
        prepSettings: localSettings.prepSettings || DEFAULT_SETTINGS.prepSettings,
        materialCosts: localSettings.materialCosts || DEFAULT_SETTINGS.materialCosts,
        discoCosts: localSettings.discoCosts || DEFAULT_SETTINGS.discoCosts,
        inventory: localSettings.inventory || DEFAULT_SETTINGS.inventory
    };
    
    batch.set(settingsRef, settingsToSave);

    await batch.commit();
    console.log("Migration complete.");
};
