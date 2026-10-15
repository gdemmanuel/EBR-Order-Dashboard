
import { Order, OrderItem, OrderPackageSelection, MenuPackage } from '../types';

// Party platter tray size by the number of minis in the platter package
const PLATTER_SIZES: Record<number, string> = { 50: '18"', 25: '12"' };

const isPlatterPackageName = (name: string, menuPackages: MenuPackage[]) =>
    menuPackages.some(p => p.isPartyPlatter && p.name === name) || name.toLowerCase().includes('platter');

/**
 * Tray size of each party platter on an order, e.g. ['18"', '12"'].
 * Size comes from the number of minis picked in the platter; for older orders that only stored the
 * package name, it is looked up from the menu when only one platter package has that name.
 */
export function getOrderPlatterSizes(order: Order, menuPackages: MenuPackage[] = []): string[] {
    const packages: OrderPackageSelection[] = order.packages && order.packages.length > 0
        ? order.packages
        : (order.originalPackages || []).map((name, i) => ({ instanceId: `legacy-${i}`, name, items: [] }));

    return packages
        .filter(p => p && p.name && isPlatterPackageName(p.name, menuPackages))
        .map(p => {
            let qty = (p.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
            if (qty === 0) {
                const matches = menuPackages.filter(m => m.isPartyPlatter && m.name === p.name);
                if (matches.length === 1) qty = matches[0].quantity;
            }
            return PLATTER_SIZES[qty] || (qty > 0 ? `${qty}-mini` : 'Unknown size');
        });
}

/** True if the order has a party platter package (or a "party platter" note). */
export function isPartyPlatterOrder(order: Order, menuPackages: MenuPackage[] = []): boolean {
    const hasPlatterPackage = (order.originalPackages || []).some(name => isPlatterPackageName(name, menuPackages));
    const hasPlatterInstruction = (order.specialInstructions || '').toLowerCase().includes('party platter');
    return hasPlatterPackage || hasPlatterInstruction;
}

/**
 * Keeps each package's picked items only while the order still contains them.
 * If the order's items were edited so a package's items are no longer all there,
 * the package stays on the order by name but its item list is cleared.
 */
export function reconcilePackages(packages: OrderPackageSelection[], items: OrderItem[]): OrderPackageSelection[] {
    const remaining = new Map<string, number>();
    items.forEach(i => remaining.set(i.name, (remaining.get(i.name) || 0) + i.quantity));

    return packages.map(pkg => {
        const pkgItems = pkg.items || [];
        const covered = pkgItems.every(pi => (remaining.get(pi.name) || 0) >= pi.quantity);
        if (!covered) return { ...pkg, items: [] };
        pkgItems.forEach(pi => remaining.set(pi.name, (remaining.get(pi.name) || 0) - pi.quantity));
        return pkg;
    });
}

/**
 * Separates items that belong to structured packages from "loose" items (extras/salsas/single adds).
 * @param order The order object
 * @returns An object containing the list of packages with their items, and a list of loose items.
 */
export function groupOrderItems(order: Order): { packages: OrderPackageSelection[], looseItems: OrderItem[] } {
    const safeItems = Array.isArray(order.items) ? order.items : [];

    // If structured packages exist, use them
    if (order.packages && Array.isArray(order.packages) && order.packages.some(p => p && Array.isArray(p.items) && p.items.length > 0)) {
        const packages = order.packages.filter(p => p && Array.isArray(p.items) && p.items.length > 0);

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
