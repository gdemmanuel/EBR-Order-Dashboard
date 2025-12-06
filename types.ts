
export enum ContactMethod {
  GF = 'Google Forms',
  IG = 'Instagram',
  FB = 'Facebook',
  PHONE = 'Text/Call',
  UNKNOWN = 'Unknown',
}

export enum FollowUpStatus {
  NEEDED = 'Follow-up Needed',
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
}

export enum ApprovalStatus {
  PENDING = 'Pending Approval',
  APPROVED = 'Approved',
  DENIED = 'Denied',
  CANCELLED = 'Cancelled',
}

export interface OrderItem {
  name: string;
  quantity: number;
}

export interface OrderPackageSelection {
    instanceId: string; // Unique ID for this specific package instance in the order
    name: string;
    items: OrderItem[];
}

export interface Order {
  id: string;
  pickupDate: string;
  pickupTime: string;
  customerName: string;
  contactMethod: string;
  phoneNumber: string | null;
  email?: string | null; // Added email field
  items: OrderItem[];
  // New field to track which packages were ordered for reporting
  originalPackages?: string[]; 
  // New field to store the full structure of selected packages and their specific items
  packages?: OrderPackageSelection[];
  totalFullSize: number;
  totalMini: number;
  amountCharged: number;
  totalCost?: number; // Calculated supply cost at the time of order
  deliveryRequired: boolean;
  deliveryFee: number;
  amountCollected: number | null;
  paymentMethod: string | null;
  deliveryAddress: string | null;
  followUpStatus: FollowUpStatus;
  paymentStatus: PaymentStatus;
  specialInstructions: string | null;
  approvalStatus: ApprovalStatus;
  hasPrinted?: boolean; // Track if ticket has been printed
  
  // Soft Delete Flags
  deleted?: boolean;
  deletedAt?: string;
}

export interface DeletedOrder extends Order {
    deletedAt: string; // ISO Date string
}

export interface Expense {
    id: string;
    date: string;
    category: string;
    vendor: string;
    item: string;
    unitName: string; // e.g. 'lbs', 'box', 'unit'
    pricePerUnit: number;
    quantity: number;
    totalCost: number;
    description?: string; // Optional notes
}

export interface Flavor {
    name: string;
    visible: boolean;
    description?: string;
    surcharge?: number; // Additional cost per unit
    isSpecial?: boolean; // Belongs in "Specials" section
    minimumQuantity?: number; // Minimum items required to order this flavor
}

export interface MenuPackage {
    id: string;
    name: string;
    description?: string; // Optional description
    itemType: 'mini' | 'full';
    quantity: number;
    price: number;
    maxFlavors: number; // Limit how many distinct flavors customer can pick
    increment?: number; // Step size for buttons (e.g. 1, 5, 10). Defaults to 1.
    visible: boolean;
    isSpecial?: boolean; // Belongs in "Specials" section
    isPartyPlatter?: boolean; // Belongs in "Party Platters" section and triggers highlighting
}

export interface SalsaProduct {
    id: string;
    name: string;
    price: number;
    description?: string; // Optional description
    visible: boolean;
}

export interface PricingTier {
    minQuantity: number;
    price: number;
}

export interface ProductPricing {
    basePrice: number; // Fallback for single items
    tiers?: PricingTier[]; // Volume discounts (e.g. 40+ items = cheaper price)
}

export interface PricingSettings {
    mini: ProductPricing;
    full: ProductPricing;
    packages: MenuPackage[];
    salsas: SalsaProduct[];
    // Deprecated but kept for type safety during migration if needed
    salsaSmall?: number; 
    salsaLarge?: number;
}

export interface Employee {
    id: string;
    name: string;
    hourlyWage: number;
    productionRates: {
        mini: number; // Empanadas per hour
        full: number; // Empanadas per hour
    };
    isActive: boolean;
}

export interface WorkShift {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM (24h)
    endTime: string; // HH:MM (24h)
    hours: number;
    hourlyWage: number;
    totalPay: number;
    notes?: string;
}

export interface IngredientPriceEntry {
    date: string; // YYYY-MM-DD
    price: number;
    sourceExpenseId?: string;
}

export interface Ingredient {
    id: string;
    name: string;
    cost: number; // Current/Latest cost per unit
    unit: string; // e.g. lbs, oz, ct
    priceHistory?: IngredientPriceEntry[];
}

export interface RecipeIngredient {
    ingredientId: string;
    amountFor20Minis: number;
}

export interface AppSettings {
    motd: string; // Message of the Day
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    sheetUrl: string;
    importedSignatures: string[];
    pricing: PricingSettings;
    ingredients?: Ingredient[]; // Master list of ingredients
    prepSettings: {
        lbsPer20: Record<string, number>; // Legacy: simple weight per 20
        recipes?: Record<string, RecipeIngredient[]>; // New: Detailed recipes
        fullSizeMultiplier: number; 
        discosPer: { mini: number; full: number; };
        discoPackSize: { mini: number; full: number; };
        productionRates: { mini: number; full: number; }; // Global defaults
    };
    scheduling: {
        enabled: boolean;
        intervalMinutes: number;
        startTime: string;
        endTime: string;
        blockedDates: string[];
        closedDays: number[];
        dateOverrides: Record<string, { isClosed: boolean; isFull?: boolean; customHours?: { start: string; end: string; }; }>; 
    };
    messageTemplates: {
        followUpNeeded: string;
        pendingConfirmation: string;
        confirmed?: string;
        processing?: string;
        completed?: string;
    };
    laborWage: number; // Global default
    materialCosts: Record<string, number>; // Legacy: cost per lb
    discoCosts: { mini: number; full: number; };
    inventory: Record<string, { mini: number; full: number }>;
    expenseCategories: string[];
    employees: Employee[];
    statusColors?: Record<string, string>;
}
