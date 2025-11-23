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
  totalCost?: number;
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
    unitName: string;
    pricePerUnit: number;
    quantity: number;
    totalCost: number;
    description?: string;
}

export interface Employee {
    id: string;
    name: string;
    hourlyRate: number;
    speedMini: number; // Units per hour
    speedFull: number; // Units per hour
    color: string;
    isActive: boolean;
}

export interface Shift {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    endTime: string;
    hours: number;
    laborCost: number;
}

export interface Flavor {
    name: string;
    visible: boolean;
    description?: string;
    surcharge?: number;
    isSpecial?: boolean;
}

export interface MenuPackage {
    id: string;
    name: string;
    itemType: 'mini' | 'full';
    quantity: number;
    price: number;
    maxFlavors: number;
    increment?: number;
    visible: boolean;
    isSpecial?: boolean;
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
    basePrice: number;
    tiers?: PricingTier[];
}

export interface PricingSettings {
    mini: ProductPricing;
    full: ProductPricing;
    packages: MenuPackage[];
    salsas: SalsaProduct[];
    salsaSmall?: number; 
    salsaLarge?: number;
}