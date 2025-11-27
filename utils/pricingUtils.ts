
import { OrderItem, PricingSettings, MenuPackage, Flavor, PricingTier } from '../types';
import { AppSettings } from '../services/dbService';

/**
 * Determines the unit price based on total quantity and defined tiers.
 * If no tier matches, returns basePrice.
 */
const getUnitPrice = (quantity: number, basePrice: number, tiers: PricingTier[] = []) => {
    if (!tiers || tiers.length === 0) return basePrice;
    
    const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    
    const applicableTier = sortedTiers.find(tier => quantity >= tier.minQuantity);
    return applicableTier ? applicableTier.price : basePrice;
};

/**
 * Calculates the best price for a given quantity of items by applying package deals first.
 */
export const calculatePriceForType = (quantity: number, basePrice: number, tiers: PricingTier[] = [], packages: MenuPackage[] = [], type: 'mini' | 'full') => {
    if (quantity <= 0) return 0;

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

    const miniItems = items.filter(i => !i.name.startsWith('Full ') && !salsas.some(s => i.name === s.name));
    const fullItems = items.filter(i => i.name.startsWith('Full ') && !salsas.some(s => i.name === s.name));

    const miniItemsQty = miniItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const fullItemsQty = fullItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    
    let salsaTotal = 0;
    items.forEach(item => {
        const salsaProduct = salsas.find(s => s.name === item.name);
        if (salsaProduct) {
            salsaTotal += (item.quantity || 0) * salsaProduct.price;
        }
    });

    const miniBaseTotal = calculatePriceForType(miniItemsQty, pricing.mini.basePrice, pricing.mini.tiers, pricing.packages, 'mini');
    const fullBaseTotal = calculatePriceForType(fullItemsQty, pricing.full.basePrice, pricing.full.tiers, pricing.packages, 'full');
    
    let surchargeTotal = 0;
    
    miniItems.forEach(item => {
        const flavorDef = miniFlavors.find(f => f.name === item.name);
        if (flavorDef && flavorDef.surcharge) {
            surchargeTotal += (item.quantity * flavorDef.surcharge);
        }
    });

    fullItems.forEach(item => {
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
        if (salsas.some(s => item.name === s.name)) return; 

        const isFull = item.name.startsWith('Full ');
        const cleanName = item.name.replace('Full ', '');
        
        // 1. Disco Cost
        const discosNeededPerItem = isFull 
            ? (settings.prepSettings.discosPer?.full ?? 1) 
            : (settings.prepSettings.discosPer?.mini ?? 1);
            
        const unitDiscoCost = isFull ? settings.discoCosts.full : settings.discoCosts.mini;
        totalCost += item.quantity * discosNeededPerItem * unitDiscoCost;

        // 2. Filling Cost (Legacy or Detailed)
        const fullMultiplier = isFull ? settings.prepSettings.fullSizeMultiplier : 1.0;
        const recipes = settings.prepSettings.recipes || {};
        const flavorRecipe = recipes[cleanName];

        if (flavorRecipe && flavorRecipe.length > 0) {
            // --- NEW RECIPE LOGIC ---
            // Recipe is defined per 20 mini empanadas.
            // Amount Needed = (ItemQty / 20) * AmountFor20 * FullMultiplier
            flavorRecipe.forEach(ri => {
                const ingredient = settings.ingredients?.find(ing => ing.id === ri.ingredientId);
                if (ingredient) {
                    const amountNeeded = (item.quantity / 20) * ri.amountFor20Minis * fullMultiplier;
                    totalCost += amountNeeded * ingredient.cost;
                }
            });
        } else {
            // --- LEGACY LOGIC ---
            const lbsPer20 = settings.prepSettings.lbsPer20[cleanName] || 0;
            const costPerLb = settings.materialCosts[cleanName] || 0;

            if (lbsPer20 > 0 && costPerLb > 0) {
                const lbsNeeded = (item.quantity / 20) * lbsPer20 * fullMultiplier;
                totalCost += lbsNeeded * costPerLb;
            }
        }
    });

    return totalCost;
};
