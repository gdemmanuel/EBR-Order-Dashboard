
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

export interface Order {
  id: string;
  pickupDate: string;
  pickupTime: string;
  customerName: string;
  contactMethod: string;
  phoneNumber: string | null;
  items: OrderItem[];
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
}

export interface MenuPackage {
    id: string;
    name: string;
    itemType: 'mini' | 'full';
    quantity: number;
    price: number;
    maxFlavors: number; // Limit how many distinct flavors customer can pick
    increment?: number; // Step size for buttons (e.g. 1, 5, 10). Defaults to 1.
    visible: boolean;
    isSpecial?: boolean; // Belongs in "Specials/Platters" section
}

export interface SalsaProduct {
    id: string;
    name: string;
    price: number;
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
    // Deprecated but kept for type safety during migration if needed, though we will migrate away from them
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
        productionRates: { mini: number; full: number; }; // Global defaults
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
    laborWage: number; // Global default
    materialCosts: Record<string, number>; 
    discoCosts: { mini: number; full: number; };
    inventory: Record<string, { mini: number; full: number }>;
    expenseCategories: string[];
    employees: Employee[];
}
