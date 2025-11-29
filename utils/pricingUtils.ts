
import { OrderItem, PricingSettings, MenuPackage } from '../types';

/**
 * Calculates the best price for a given quantity of items by applying package deals first.
 */
export const calculatePriceForType = (quantity: number, basePrice: number, packages: MenuPackage[] = [], type: 'mini' | 'full') => {
    if (quantity <= 0) return 0;

    // Filter packages for this specific item type (mini/full) and sort by quantity descending (largest packages first)
    const sortedPackages = packages
        .filter(p => p.itemType === type)
        .sort((a, b) => b.quantity - a.quantity);
    
    let remainingQty = quantity;
    let totalPrice = 0;

    for (const pkg of sortedPackages) {
        if (pkg.quantity <= 0) continue;
        const numPackages = Math.floor(remainingQty / pkg.quantity);
        if (numPackages > 0) {
            totalPrice += numPackages * pkg.price;
            remainingQty %= pkg.quantity;
        }
    }

    // Remainder at base price
    totalPrice += remainingQty * basePrice;
    return totalPrice;
};

export const calculateOrderTotal = (items: OrderItem[], deliveryFee: number, pricing: PricingSettings) => {
    // 1. Group Items
    const miniItemsQty = items
        .filter(i => !i.name.startsWith('Full ') && !i.name.includes('Salsa'))
        .reduce((sum, i) => sum + (i.quantity || 0), 0);

    const fullItemsQty = items
        .filter(i => i.name.startsWith('Full '))
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
    
    const smallSalsaQty = items
        .filter(i => i.name.includes('Salsa') && i.name.includes('Small'))
        .reduce((sum, i) => sum + (i.quantity || 0), 0);
        
    const largeSalsaQty = items
        .filter(i => i.name.includes('Salsa') && i.name.includes('Large'))
        .reduce((sum, i) => sum + (i.quantity || 0), 0);

    // 2. Calculate Totals using Packages first, then Base Price
    const miniTotal = calculatePriceForType(miniItemsQty, pricing.mini.basePrice, pricing.packages, 'mini');
    const fullTotal = calculatePriceForType(fullItemsQty, pricing.full.basePrice, pricing.packages, 'full');
    
    const salsaTotal = (smallSalsaQty * pricing.salsaSmall) + (largeSalsaQty * pricing.salsaLarge);

    return miniTotal + fullTotal + salsaTotal + (deliveryFee || 0);
};
