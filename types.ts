
export enum ContactMethod {
  GF = 'Google Forms',
  IG = 'Instagram',
  FB = 'Facebook',
  PHONE = 'Text/Call',
  UNKNOWN = 'Unknown',
}

export enum FollowUpStatus {
  NEEDED = 'Follow-up Needed',
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
}

export interface MenuPackage {
    id: string;
    name: string;
    itemType: 'mini' | 'full';
    quantity: number;
    price: number;
    maxFlavors: number; // Limit how many distinct flavors customer can pick
    visible: boolean;
}

export interface ProductPricing {
    basePrice: number; // Fallback for single items
}

export interface PricingSettings {
    mini: ProductPricing;
    full: ProductPricing;
    packages: MenuPackage[];
    salsaSmall: number;
    salsaLarge: number;
}
