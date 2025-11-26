
import { 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    getDocs,
    writeBatch,
    FirestoreError
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Order, ApprovalStatus, PricingSettings, Flavor, Expense, AppSettings, WorkShift, FollowUpStatus } from "../types";
import { initialEmpanadaFlavors, initialFullSizeEmpanadaFlavors } from "../data/mockData";

// Collection References
const ORDERS_COLLECTION = "orders";
const EXPENSES_COLLECTION = "expenses";
const SETTINGS_COLLECTION = "app_settings";
const GENERAL_SETTINGS_DOC = "general";

// Re-export AppSettings for compatibility with other components
export type { AppSettings };

const DEFAULT_SETTINGS: AppSettings = {
    motd: '',
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
    messageTemplates: {
        followUpNeeded: "Hi {firstName}! This is Rose from Empanadas by Rose. Thank you for placing an order. Please confirm your order for {deliveryType} on {date} at {time} as follows:\n{totals}\n{items}",
        pendingConfirmation: "Perfect! The total is ${total}. Cash on {deliveryType}, please. I'll see you on {date} at {time}.\nThank you for your order!",
        confirmed: "Your order is confirmed! See you on {date} at {time}. Total: ${total}. Address: {deliveryAddress}.",
        processing: "Hi {firstName}! Just wanted to let you know we've started preparing your order for {date}. We'll see you soon!",
        completed: "Thank you for your order, {firstName}! We hope you enjoy the empanadas."
    },
    laborWage: 15.00,
    materialCosts: {},
    discoCosts: { mini: 0.10, full: 0.15 },
    inventory: {},
    expenseCategories: ['Packaging', 'Marketing', 'Rent', 'Utilities', 'Equipment', 'Ingredients', 'Other'],
    employees: [],
    statusColors: {
        [FollowUpStatus.NEEDED]: '#fef3c7', // amber-100
        [FollowUpStatus.PENDING]: '#eff6ff', // blue-50
        [FollowUpStatus.CONFIRMED]: '#dbeafe', // blue-100
        [FollowUpStatus.PROCESSING]: '#e0e7ff', // indigo-100
        [FollowUpStatus.COMPLETED]: '#dcfce7', // green-100
    }
};

// --- Real-time Subscriptions ---

export const subscribeToOrders = (
    onUpdate: (orders: Order[]) => void,
    status: ApprovalStatus = ApprovalStatus.APPROVED,
    onError?: (error: FirestoreError) => void
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
    onError?: (error: FirestoreError) => void
) => {
    // Fetch all expenses, but filter OUT 'Labor' items so they don't duplicate in the expense list
    // (We handle them separately in subscribeToShifts)
    const q = query(collection(db, EXPENSES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const expenses: Expense[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as Expense;
            if (data.category !== 'Labor') {
                expenses.push(data);
            }
        });
        onUpdate(expenses);
    }, onError);
};

export const subscribeToShifts = (
    onUpdate: (shifts: WorkShift[]) => void,
    onError?: (error: FirestoreError) => void
) => {
    // Fetch 'Labor' expenses and convert them back to WorkShift objects
    const q = query(collection(db, EXPENSES_COLLECTION), where("category", "==", "Labor"));
    return onSnapshot(q, (snapshot) => {
        const shifts: WorkShift[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as Expense;
            try {
                // Parse the metadata stored in description
                const meta = data.description ? JSON.parse(data.description) : {};
                shifts.push({
                    id: data.id,
                    employeeId: meta.employeeId || '',
                    employeeName: data.vendor, // We store employee name in vendor field
                    date: data.date,
                    startTime: meta.startTime || '00:00',
                    endTime: meta.endTime || '00:00',
                    hours: data.quantity,
                    hourlyWage: data.pricePerUnit,
                    totalPay: data.totalCost,
                    notes: meta.notes || ''
                });
            } catch (e) {
                // Fallback if description is not valid JSON
                 shifts.push({
                    id: data.id,
                    employeeId: '',
                    employeeName: data.vendor, 
                    date: data.date,
                    startTime: '00:00',
                    endTime: '00:00',
                    hours: data.quantity,
                    hourlyWage: data.pricePerUnit,
                    totalPay: data.totalCost,
                    notes: data.description || ''
                });
            }
        });
        onUpdate(shifts);
    }, onError);
};

export const subscribeToSettings = (
    onUpdate: (settings: AppSettings) => void,
    onError?: (error: FirestoreError) => void
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
                messageTemplates: { ...DEFAULT_SETTINGS.messageTemplates, ...(data.messageTemplates || {}) },
                expenseCategories: data.expenseCategories || DEFAULT_SETTINGS.expenseCategories,
                employees: data.employees || DEFAULT_SETTINGS.employees,
                statusColors: { ...DEFAULT_SETTINGS.statusColors, ...(data.statusColors || {}) }
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

export const saveShiftToDb = async (shift: WorkShift) => {
    // Convert Shift to Expense format to avoid new collection permissions
    const metaData = JSON.stringify({
        startTime: shift.startTime,
        endTime: shift.endTime,
        employeeId: shift.employeeId,
        notes: shift.notes
    });

    const shiftExpense: Expense = {
        id: shift.id,
        date: shift.date,
        category: 'Labor',
        vendor: shift.employeeName,
        item: 'Shift Work',
        unitName: 'hours',
        pricePerUnit: shift.hourlyWage,
        quantity: shift.hours,
        totalCost: shift.totalPay,
        description: metaData
    };

    await setDoc(doc(db, EXPENSES_COLLECTION, shift.id), shiftExpense);
};

export const deleteShiftFromDb = async (shiftId: string) => {
    // Shifts are stored in expenses collection now
    await deleteDoc(doc(db, EXPENSES_COLLECTION, shiftId));
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
