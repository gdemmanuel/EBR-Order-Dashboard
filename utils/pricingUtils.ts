
import { OrderItem, PricingSettings, PricingTier } from '../types';

export const calculatePriceForType = (quantity: number, basePrice: number, tiers: PricingTier[] = []) => {
    if (quantity <= 0) return 0;

    // Sort tiers by quantity descending (largest packages first)
    const sortedTiers = [...tiers].sort((a, b) => b.quantity - a.quantity);
    
    let remainingQty = quantity;
    let totalPrice = 0;

    for (const tier of sortedTiers) {
        if (tier.quantity <= 0) continue;
        const numPackages = Math.floor(remainingQty / tier.quantity);
        if (numPackages > 0) {
            totalPrice += numPackages * tier.price;
            remainingQty %= tier.quantity;
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

    // 2. Calculate Totals using Pricing Logic
    const miniTotal = calculatePriceForType(miniItemsQty, pricing.mini.basePrice, pricing.mini.tiers);
    const fullTotal = calculatePriceForType(fullItemsQty, pricing.full.basePrice, pricing.full.tiers);
    const salsaTotal = (smallSalsaQty * pricing.salsaSmall) + (largeSalsaQty * pricing.salsaLarge);

    return miniTotal + fullTotal + salsaTotal + (deliveryFee || 0);
};
