
import { Order, OrderItem, OrderPackageSelection } from '../types';

/**
 * Separates items that belong to structured packages from "loose" items (extras/salsas/single adds).
 * @param order The order object
 * @returns An object containing the list of packages with their items, and a list of loose items.
 */
export function groupOrderItems(order: Order): { packages: OrderPackageSelection[], looseItems: OrderItem[] } {
    const safeItems = Array.isArray(order.items) ? order.items : [];
    
    // If no structure exists, treat everything as loose items
    if (!order.packages || !Array.isArray(order.packages) || order.packages.length === 0) {
        return { packages: [], looseItems: safeItems };
    }

    const packages = order.packages;
    
    // Create a map of all total items in the order
    const itemMap = new Map<string, number>();
    safeItems.forEach(i => {
        if (i && i.name) {
            itemMap.set(i.name, (itemMap.get(i.name) || 0) + (i.quantity || 0));
        }
    });

    // Subtract items that are accounted for in packages
    packages.forEach(pkg => {
        if (pkg && Array.isArray(pkg.items)) {
            pkg.items.forEach(pkgItem => {
                if (pkgItem && pkgItem.name) {
                    const current = itemMap.get(pkgItem.name) || 0;
                    // Subtracting. Note: If data is inconsistent (package has more than total), we floor at 0.
                    itemMap.set(pkgItem.name, Math.max(0, current - (pkgItem.quantity || 0)));
                }
            });
        }
    });

    // Reconstruct loose items list from the remaining counts
    const looseItems: OrderItem[] = [];
    itemMap.forEach((qty, name) => {
        if (qty > 0) {
            looseItems.push({ name, quantity: qty });
        }
    });

    return { packages, looseItems };
}

export const generateOrdersCSV = (orders: Order[]): void => {
    const headers = [
        "Order ID",
        "Pickup Date",
        "Pickup Time",
        "Customer Name",
        "Phone",
        "Email",
        "Items",
        "Total",
        "Collected",
        "Payment Status",
        "Follow Up Status",
        "Delivery",
        "Address",
        "Notes"
    ];

    const rows = orders.map(order => {
        const safeItems = Array.isArray(order.items) ? order.items : [];
        // Flatten items
        const itemsStr = safeItems.map(i => `${i.quantity}x ${i.name}`).join('; ');
        
        // Escape CSV fields
        const escape = (val: string | number | null | undefined) => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        return [
            escape(order.id),
            escape(order.pickupDate),
            escape(order.pickupTime),
            escape(order.customerName),
            escape(order.phoneNumber),
            escape(order.email),
            escape(itemsStr),
            escape(order.amountCharged),
            escape(order.amountCollected),
            escape(order.paymentStatus),
            escape(order.followUpStatus),
            escape(order.deliveryRequired ? 'Yes' : 'No'),
            escape(order.deliveryAddress),
            escape(order.specialInstructions)
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
