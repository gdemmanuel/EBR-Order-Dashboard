
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
import { Order, ApprovalStatus, PricingSettings, Flavor, Expense, AppSettings, Shift } from "../types";
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from "../data/mockData";

// Collection References
const ORDERS_COLLECTION = "orders";
const EXPENSES_COLLECTION = "expenses";
const SHIFTS_COLLECTION = "shifts";
const SETTINGS_COLLECTION = "app_settings";
const GENERAL_SETTINGS_DOC = "general";

// Re-export AppSettings for compatibility with other components
export type { AppSettings };

const DEFAULT_SETTINGS: AppSettings = {
    empanadaFlavors: initialEmpanadaFlavors.map(f => ({ name: f, visible: true })),
    fullSizeEmpanadaFlavors: initialFullSizeEmpanadaFlavors.map(f => ({ name: f, visible: true })),
    sheetUrl: '',
    importedSignatures: [],
    pricing: {
        mini: { basePrice: 1.75, tiers: [] },
        full: { basePrice: 3.00, tiers: [] },
        packages: [],
        salsas: [
            { id: 'salsa-verde-sm', name: 'Salsa Verde (4oz)', price: 2.00, visible: true },
            { id: 'salsa-rosada-sm', name: 'Salsa Rosada (4oz)', price: 2.00, visible: true },
            { id: 'salsa-verde-lg', name: 'Salsa Verde (8oz)', price: 4.00, visible: true },
            { id: 'salsa-rosada-lg', name: 'Salsa Rosada (8oz)', price: 4.00, visible: true },
        ]
    },
    prepSettings: {
        lbsPer20: {},
        fullSizeMultiplier: 2.0,
        discosPer: { mini: 1, full: 1 },
        discoPackSize: { mini: 10, full: 10 },
        productionRates: { mini: 40, full: 25 }
    },
    scheduling: {
        enabled: true,
        intervalMinutes: 15,
        startTime: "09:00",
        endTime: "17:00",
        blockedDates: [],
        closedDays: [],
        dateOverrides: {}
    },
    laborWage: 15.00,
    employees: [],
    materialCosts: {},
    discoCosts: { mini: 0.10, full: 0.15 },
    inventory: {},
    expenseCategories: ['Packaging', 'Marketing', 'Rent', 'Utilities', 'Equipment', 'Ingredients', 'Other']
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
        snapshot.forEach((doc) => orders.push(doc.data() as Order));
        onUpdate(orders);
    }, onError);
};

export const subscribeToExpenses = (
    onUpdate: (expenses: Expense[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(collection(db, EXPENSES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const expenses: Expense[] = [];
        snapshot.forEach((doc) => {
            expenses.push(doc.data() as Expense);
        });
        onUpdate(expenses);
    }, onError);
};

export const subscribeToShifts = (
    onUpdate: (shifts: Shift[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(collection(db, SHIFTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const shifts: Shift[] = [];
        snapshot.forEach((doc) => {
            shifts.push(doc.data() as Shift);
        });
        onUpdate(shifts);
    }, onError);
};

export const subscribeToSettings = (
    onUpdate: (settings: AppSettings) => void,
    onError?: (error: Error) => void
) => {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const mergedSettings: AppSettings = {
                ...DEFAULT_SETTINGS,
                ...data,
                pricing: { ...DEFAULT_SETTINGS.pricing, ...(data.pricing || {}) },
                prepSettings: { ...DEFAULT_SETTINGS.prepSettings, ...(data.prepSettings || {}) },
                scheduling: { ...DEFAULT_SETTINGS.scheduling, ...(data.scheduling || {}) },
                expenseCategories: data.expenseCategories || DEFAULT_SETTINGS.expenseCategories,
                employees: data.employees || []
            };
            onUpdate(mergedSettings);
        } else {
            onUpdate(DEFAULT_SETTINGS);
        }
    }, onError);
};

// --- CRUD Operations ---

export const saveOrderToDb = async (order: Order) => {
    await setDoc(doc(db, ORDERS_COLLECTION, order.id), order);
};

export const saveOrdersBatch = async (orders: Order[]) => {
    const batch = writeBatch(db);
    orders.forEach(order => { const ref = doc(db, ORDERS_COLLECTION, order.id); batch.set(ref, order); });
    await batch.commit();
};

export const deleteOrderFromDb = async (orderId: string) => {
    await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
};

export const saveExpenseToDb = async (expense: Expense) => {
    if (!expense.id) expense.id = Date.now().toString();
    await setDoc(doc(db, EXPENSES_COLLECTION, expense.id), expense);
};

export const deleteExpenseFromDb = async (expenseId: string) => {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, expenseId));
};

export const saveShiftToDb = async (shift: Shift) => {
    if (!shift.id) shift.id = Date.now().toString();
    await setDoc(doc(db, SHIFTS_COLLECTION, shift.id), shift);
};

export const deleteShiftFromDb = async (shiftId: string) => {
    await deleteDoc(doc(db, SHIFTS_COLLECTION, shiftId));
};

export const updateSettingsInDb = async (settings: Partial<AppSettings>) => {
    await setDoc(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), settings, { merge: true });
};

export const migrateLocalDataToFirestore = async (localOrders: Order[], localPending: Order[], localSettings: AppSettings) => {
    const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    if (!snapshot.empty) return;
    
    const batch = writeBatch(db);
    [...localOrders, ...localPending].forEach(order => batch.set(doc(db, ORDERS_COLLECTION, order.id), order));
    batch.set(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), localSettings);
    await batch.commit();
};
