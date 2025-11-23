
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
import { Order, ApprovalStatus, PricingSettings, Flavor, Expense, Employee, Shift } from "../types";
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from "../data/mockData";

// Collection References
const ORDERS_COLLECTION = "orders";
const EXPENSES_COLLECTION = "expenses";
const EMPLOYEES_COLLECTION = "employees";
const SHIFTS_COLLECTION = "shifts";
const SETTINGS_COLLECTION = "app_settings";
const GENERAL_SETTINGS_DOC = "general";

export interface AppSettings {
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    sheetUrl: string;
    importedSignatures: string[];
    pricing: PricingSettings;
    prepSettings: {
        lbsPer20: Record<string, number>; 
        fullSizeMultiplier: number; 
        discosPer: { mini: number; full: number; };
        discoPackSize: { mini: number; full: number; };
        productionRates: { mini: number; full: number; };
    };
    scheduling: {
        enabled: boolean;
        intervalMinutes: number;
        startTime: string;
        endTime: string;
        blockedDates: string[];
        closedDays: number[];
        dateOverrides: Record<string, { isClosed: boolean; customHours?: { start: string; end: string; }; }>; 
    };
    laborWage: number; 
    materialCosts: Record<string, number>; 
    discoCosts: { mini: number; full: number; };
    inventory: Record<string, { mini: number; full: number }>;
    expenseCategories: string[];
}

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
        snapshot.forEach((doc) => expenses.push(doc.data() as Expense));
        onUpdate(expenses);
    }, onError);
};

export const subscribeToEmployees = (
    onUpdate: (employees: Employee[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(collection(db, EMPLOYEES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const employees: Employee[] = [];
        snapshot.forEach((doc) => employees.push(doc.data() as Employee));
        onUpdate(employees);
    }, onError);
};

export const subscribeToShifts = (
    onUpdate: (shifts: Shift[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(collection(db, SHIFTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const shifts: Shift[] = [];
        snapshot.forEach((doc) => shifts.push(doc.data() as Shift));
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
            
            // Migration logic for legacy data shapes
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
            
            let safePricing = { ...DEFAULT_SETTINGS.pricing, ...(data.pricing || {}) };
            if (!safePricing.mini.tiers) safePricing.mini.tiers = [];
            if (!safePricing.full.tiers) safePricing.full.tiers = [];

            const mergedSettings: AppSettings = {
                ...DEFAULT_SETTINGS,
                ...data,
                empanadaFlavors: safeMiniFlavors,
                fullSizeEmpanadaFlavors: safeFullFlavors,
                pricing: safePricing,
                prepSettings: { ...DEFAULT_SETTINGS.prepSettings, ...(data.prepSettings || {}) },
                scheduling: { ...DEFAULT_SETTINGS.scheduling, ...(data.scheduling || {}) },
                laborWage: data.laborWage ?? DEFAULT_SETTINGS.laborWage,
                materialCosts: data.materialCosts || DEFAULT_SETTINGS.materialCosts,
                discoCosts: data.discoCosts || DEFAULT_SETTINGS.discoCosts,
                inventory: data.inventory || DEFAULT_SETTINGS.inventory,
                expenseCategories: data.expenseCategories || DEFAULT_SETTINGS.expenseCategories
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
    await setDoc(doc(db, EXPENSES_COLLECTION, expense.id), expense);
};

export const deleteExpenseFromDb = async (expenseId: string) => {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, expenseId));
};

export const saveEmployeeToDb = async (employee: Employee) => {
    await setDoc(doc(db, EMPLOYEES_COLLECTION, employee.id), employee);
};

export const deleteEmployeeFromDb = async (employeeId: string) => {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, employeeId));
};

export const saveShiftToDb = async (shift: Shift) => {
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
    if (localOrders.length === 0 && localPending.length === 0) return;

    const batch = writeBatch(db);
    [...localOrders, ...localPending].forEach(order => batch.set(doc(db, ORDERS_COLLECTION, order.id), order));
    batch.set(doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC), localSettings);
    await batch.commit();
};
