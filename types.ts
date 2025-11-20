
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
  CONTACTED = 'Contacted',
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

export interface Flavor {
    name: string;
    visible: boolean;
    description?: string;
    surcharge?: number; // Additional cost per unit
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
}

export interface SalsaProduct {
    id: string;
    name: string;
    price: number;
    visible: boolean;
}

export interface ProductPricing {
    basePrice: number; // Fallback for single items
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
