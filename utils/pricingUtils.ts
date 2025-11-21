
import { OrderItem, PricingSettings, MenuPackage, Flavor, PricingTier } from '../types';
import { AppSettings } from '../services/dbService';

/**
 * Determines the unit price based on total quantity and defined tiers.
 * If no tier matches, returns basePrice.
 */
const getUnitPrice = (quantity: number, basePrice: number, tiers: PricingTier[] = []) => {
    if (!tiers || tiers.length === 0) return basePrice;
    
    // Find the highest tier that matches the quantity
    // Sort tiers by minQuantity descending to find the highest applicable threshold first
    const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    
    const applicableTier = sortedTiers.find(tier => quantity >= tier.minQuantity);
    return applicableTier ? applicableTier.price : basePrice;
};

/**
 * Calculates the best price for a given quantity of items by applying package deals first.
 */
export const calculatePriceForType = (quantity: number, basePrice: number, tiers: PricingTier[] = [], packages: MenuPackage[] = [], type: 'mini' | 'full') => {
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

    // Remainder pricing:
    // We determine the "Base Price" based on the TOTAL quantity ordered (tiered logic),
    // but apply it only to the remaining units that weren't in a package.
    const currentUnitPrice = getUnitPrice(quantity, basePrice, tiers);
    
    totalPrice += remainingQty * currentUnitPrice;
    return totalPrice;
};

export const calculateOrderTotal = (
    items: OrderItem[], 
    deliveryFee: number, 
    pricing: PricingSettings,
    miniFlavors: Flavor[] = [],
    fullFlavors: Flavor[] = []
) => {
    const salsas = pricing.salsas || [];

    // 1. Group Items
    // Mini & Full items are those not in the salsa list
    const miniItems = items.filter(i => !i.name.startsWith('Full ') && !salsas.some(s => i.name === s.name));
    const fullItems = items.filter(i => i.name.startsWith('Full ') && !salsas.some(s => i.name === s.name));

    const miniItemsQty = miniItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const fullItemsQty = fullItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    
    // Calculate Salsa Total explicitly from the dynamic list
    let salsaTotal = 0;
    items.forEach(item => {
        const salsaProduct = salsas.find(s => s.name === item.name);
        if (salsaProduct) {
            salsaTotal += (item.quantity || 0) * salsaProduct.price;
        }
    });

    // 2. Calculate Base Totals using Packages first, then Base/Tiered Price
    const miniBaseTotal = calculatePriceForType(miniItemsQty, pricing.mini.basePrice, pricing.mini.tiers, pricing.packages, 'mini');
    const fullBaseTotal = calculatePriceForType(fullItemsQty, pricing.full.basePrice, pricing.full.tiers, pricing.packages, 'full');
    
    // 3. Calculate Surcharges
    let surchargeTotal = 0;
    
    // Check Mini Items
    miniItems.forEach(item => {
        const flavorDef = miniFlavors.find(f => f.name === item.name);
        if (flavorDef && flavorDef.surcharge) {
            surchargeTotal += (item.quantity * flavorDef.surcharge);
        }
    });

    // Check Full Items
    fullItems.forEach(item => {
        // Strip "Full " prefix to match flavor definition if needed
        const flavorDef = fullFlavors.find(f => f.name === item.name);
        if (flavorDef && flavorDef.surcharge) {
            surchargeTotal += (item.quantity * flavorDef.surcharge);
        }
    });

    return miniBaseTotal + fullBaseTotal + salsaTotal + surchargeTotal + (deliveryFee || 0);
};

/**
 * Calculates the Supply Cost (Expense) for an order based on material definitions.
 */
export const calculateSupplyCost = (
    items: OrderItem[], 
    settings: AppSettings
): number => {
    let totalCost = 0;
    const salsas = settings.pricing.salsas || [];

    items.forEach(item => {
        if (salsas.some(s => item.name === s.name)) return; // Skip salsas for ingredient calculation for now

        const isFull = item.name.startsWith('Full ');
        const cleanName = item.name.replace('Full ', '');
        
        // 1. Disco Cost
        // Look up discos per empanada setting, defaulting to 1 if not set
        const discosNeededPerItem = isFull 
            ? (settings.prepSettings.discosPer?.full ?? 1) 
            : (settings.prepSettings.discosPer?.mini ?? 1);
            
        const unitDiscoCost = isFull ? settings.discoCosts.full : settings.discoCosts.mini;
        
        totalCost += item.quantity * discosNeededPerItem * unitDiscoCost;

        // 2. Filling Cost
        // Logic: (Qty / 20) * LbsPer20 * CostPerLb
        // Full size multiplier applies to the *amount* of filling
        const lbsPer20 = settings.prepSettings.lbsPer20[cleanName] || 0;
        const costPerLb = settings.materialCosts[cleanName] || 0;
        const multiplier = isFull ? settings.prepSettings.fullSizeMultiplier : 1.0;

        if (lbsPer20 > 0 && costPerLb > 0) {
            const lbsNeeded = (item.quantity / 20) * lbsPer20 * multiplier;
            totalCost += lbsNeeded * costPerLb;
        }
    });

    return totalCost;
};
