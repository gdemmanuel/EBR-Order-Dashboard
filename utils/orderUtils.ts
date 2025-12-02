
import { Order, OrderItem, OrderPackageSelection } from '../types';

/**
 * Separates items that belong to structured packages from "loose" items (extras/salsas/single adds).
 * @param order The order object
 * @returns An object containing the list of packages with their items, and a list of loose items.
 */
export function groupOrderItems(order: Order): { packages: OrderPackageSelection[], looseItems: OrderItem[] } {
    // If no structure exists, treat everything as loose items
    if (!order.packages || order.packages.length === 0) {
        return { packages: [], looseItems: order.items };
    }

    const packages = order.packages;
    
    // Create a map of all total items in the order
    const itemMap = new Map<string, number>();
    order.items.forEach(i => itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity));

    // Subtract items that are accounted for in packages
    packages.forEach(pkg => {
        pkg.items.forEach(pkgItem => {
            const current = itemMap.get(pkgItem.name) || 0;
            // Subtracting. Note: If data is inconsistent (package has more than total), we floor at 0.
            itemMap.set(pkgItem.name, Math.max(0, current - pkgItem.quantity));
        });
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
