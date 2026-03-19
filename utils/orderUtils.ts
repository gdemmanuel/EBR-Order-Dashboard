
import { Order, OrderItem, OrderPackageSelection } from '../types';

/**
 * Separates items that belong to structured packages from "loose" items (extras/salsas/single adds).
 * @param order The order object
 * @returns An object containing the list of packages with their items, and a list of loose items.
 */
export function groupOrderItems(order: Order): { packages: OrderPackageSelection[], looseItems: OrderItem[] } {
    const safeItems = Array.isArray(order.items) ? order.items : [];

    // If structured packages exist, use them
    if (order.packages && Array.isArray(order.packages) && order.packages.length > 0) {
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

    // AUTO-GENERATE packages when no structured data exists
    // Separate items into Full Size empanadas, Mini empanadas, and Extras (salsas, etc.)
    const fullSizeItems: OrderItem[] = [];
    const miniItems: OrderItem[] = [];
    const extraItems: OrderItem[] = []; // Salsas and other non-empanada items

    const salsaKeywords = ['salsa', 'verde', 'rosada', 'roja', 'chipotle', 'aioli'];

    safeItems.forEach(item => {
        if (!item || !item.name) return;

        const lowerName = item.name.toLowerCase();

        // Check if it's a salsa/extra
        const isSalsa = salsaKeywords.some(keyword => lowerName.includes(keyword));
        if (isSalsa) {
            extraItems.push(item);
            return;
        }

        // Check if it's full size
        if (item.name.startsWith('Full ')) {
            fullSizeItems.push(item);
        } else {
            miniItems.push(item);
        }
    });

    const packages: OrderPackageSelection[] = [];

    // Generate "Package of X" for mini empanadas
    if (miniItems.length > 0) {
        const totalMini = miniItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
        packages.push({
            instanceId: `auto-mini-${order.id || Date.now()}`,
            name: `Package of ${totalMini}`,
            items: miniItems
        });
    }

    // Generate "Package of X Full" for full-size empanadas
    if (fullSizeItems.length > 0) {
        const totalFull = fullSizeItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
        packages.push({
            instanceId: `auto-full-${order.id || Date.now()}`,
            name: `Package of ${totalFull} Full`,
            items: fullSizeItems
        });
    }

    return { packages, looseItems: extraItems };
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

/**
 * Escapes a string for safe insertion into an HTML context (e.g. document.write).
 * Prevents XSS when user-supplied values are interpolated into raw HTML strings.
 */
export function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
