import { AppSettings, Ingredient, Order } from '../types';
import { getHistoricalIngredientPrice } from './pricingUtils';
import { parseOrderDateTime } from './dateUtils';

export type ItemSize = 'mini' | 'full';

export const DEFAULT_TARGET_MARGIN = 50;

const isDiscoIngredient = (i: Ingredient) => /^discos?$/i.test(i.name.trim());

export const getDiscoIngredient = (settings: AppSettings) => settings.ingredients?.find(isDiscoIngredient);

export const isSalsaName = (settings: AppSettings, name: string) =>
    (settings.pricing?.salsas || []).some(s => s.name === name);

/** True when the flavor has at least one recipe ingredient besides discos. */
export const hasRecipe = (settings: AppSettings, flavor: string) =>
    ((settings.prepSettings?.recipes || {})[flavor] || []).some(ri => {
        const ing = settings.ingredients?.find(i => i.id === ri.ingredientId);
        return ing && !isDiscoIngredient(ing);
    });

/**
 * Supply cost of one empanada (or one salsa) on a given date: recipe fillings plus discos,
 * using the ingredient prices in effect on that date and today's recipe amounts.
 */
export const supplyCostPerUnit = (settings: AppSettings, flavor: string, size: ItemSize, date?: Date): number => {
    const recipe = (settings.prepSettings?.recipes || {})[flavor] || [];
    const fillings = recipe.reduce((sum, ri) => {
        const ing = settings.ingredients?.find(i => i.id === ri.ingredientId);
        if (!ing || isDiscoIngredient(ing)) return sum;
        return sum + (ri.amountFor20Minis || 0) * getHistoricalIngredientPrice(ing, date);
    }, 0);

    if (isSalsaName(settings, flavor)) return fillings; // recipe is per container

    const multiplier = size === 'full' ? (Number(settings.prepSettings?.fullSizeMultiplier) || 2) : 1;
    const disco = getDiscoIngredient(settings);
    const discoPrice = disco
        ? getHistoricalIngredientPrice(disco, date)
        : (size === 'full' ? settings.discoCosts?.full : settings.discoCosts?.mini) || 0;
    const discosPer = Number(size === 'full' ? settings.prepSettings?.discosPer?.full : settings.prepSettings?.discosPer?.mini) || 0;

    return (fillings / 20) * multiplier + discosPer * discoPrice;
};

/** Estimated labor cost of one empanada, from the default wage and production rates in Prep settings. */
export const laborCostPerUnit = (settings: AppSettings, size: ItemSize): number => {
    const wage = Number(settings.laborWage) || 0;
    const rate = Number(size === 'full' ? settings.prepSettings?.productionRates?.full : settings.prepSettings?.productionRates?.mini) || 0;
    return rate > 0 ? wage / rate : 0;
};

/** List price of one empanada of a flavor before volume discounts (base price plus surcharge). */
export const listPrice = (settings: AppSettings, flavor: string, size: ItemSize): number => {
    const salsa = (settings.pricing?.salsas || []).find(s => s.name === flavor);
    if (salsa) return salsa.price || 0;
    const def = settings.empanadaFlavors?.find(f => f.name === flavor);
    const base = Number(size === 'full' ? settings.pricing?.full?.basePrice : settings.pricing?.mini?.basePrice) || 0;
    const surcharge = Number(size === 'full' ? def?.fullSurcharge : def?.surcharge) || 0;
    return base + surcharge;
};

/**
 * Lowest price per empanada a customer can pay for a flavor: the cheapest of the volume tiers and
 * the regular (non-platter, non-special) packages for that size, plus the flavor surcharge.
 */
export const lowestPrice = (settings: AppSettings, flavor: string, size: ItemSize): number => {
    const product = size === 'full' ? settings.pricing?.full : settings.pricing?.mini;
    const candidates = [Number(product?.basePrice) || 0, ...(product?.tiers || []).map(t => Number(t.price) || 0)];
    (settings.pricing?.packages || [])
        .filter(p => p.itemType === size && !p.isPartyPlatter && !p.isSpecial && p.visible !== false && p.quantity > 0)
        .forEach(p => candidates.push(p.price / p.quantity));
    const lowest = Math.min(...candidates.filter(c => c > 0));
    const def = settings.empanadaFlavors?.find(f => f.name === flavor);
    const surcharge = Number(size === 'full' ? def?.fullSurcharge : def?.surcharge) || 0;
    return (Number.isFinite(lowest) ? lowest : 0) + surcharge;
};

const parseItem = (name: string): { flavor: string; size: ItemSize } =>
    name.startsWith('Full ') ? { flavor: name.replace('Full ', ''), size: 'full' } : { flavor: name, size: 'mini' };

export interface FlavorProfit {
    flavor: string;
    isSalsa: boolean;
    miniSold: number;
    fullSold: number;
    revenue: number;
    supplyCost: number;
    laborCost: number;
    hasRecipe: boolean;
}

/**
 * Revenue, cost and units per flavor across orders.
 * Each order's charge (less delivery fee) is split across its items: salsas at their menu price,
 * and the rest across empanadas in proportion to their list price. Costs use prices on the order date.
 */
export const profitByFlavor = (settings: AppSettings, orders: Order[]): FlavorProfit[] => {
    const map = new Map<string, FlavorProfit>();
    const get = (flavor: string) => {
        let row = map.get(flavor);
        if (!row) {
            row = { flavor, isSalsa: isSalsaName(settings, flavor), miniSold: 0, fullSold: 0, revenue: 0, supplyCost: 0, laborCost: 0, hasRecipe: hasRecipe(settings, flavor) };
            map.set(flavor, row);
        }
        return row;
    };

    orders.forEach(order => {
        const date = parseOrderDateTime(order);
        const orderDate = isNaN(date.getTime()) ? undefined : date;
        const items = (order.items || []).filter(i => i && i.name && i.quantity > 0);
        let toAllocate = Math.max(0, (Number(order.amountCharged) || 0) - (Number(order.deliveryFee) || 0));

        // Salsas first, at menu price (capped at what's left)
        items.filter(i => isSalsaName(settings, i.name)).forEach(i => {
            const row = get(i.name);
            const revenue = Math.min(toAllocate, i.quantity * listPrice(settings, i.name, 'mini'));
            toAllocate -= revenue;
            row.miniSold += i.quantity;
            row.revenue += revenue;
            row.supplyCost += i.quantity * supplyCostPerUnit(settings, i.name, 'mini', orderDate);
        });

        const empanadas = items.filter(i => !isSalsaName(settings, i.name)).map(i => ({ ...parseItem(i.name), qty: i.quantity }));
        const totalWeight = empanadas.reduce((sum, e) => sum + e.qty * (listPrice(settings, e.flavor, e.size) || 1), 0);

        empanadas.forEach(e => {
            const row = get(e.flavor);
            const weight = e.qty * (listPrice(settings, e.flavor, e.size) || 1);
            row.revenue += totalWeight > 0 ? toAllocate * (weight / totalWeight) : 0;
            if (e.size === 'full') row.fullSold += e.qty; else row.miniSold += e.qty;
            row.supplyCost += e.qty * supplyCostPerUnit(settings, e.flavor, e.size, orderDate);
            row.laborCost += e.qty * laborCostPerUnit(settings, e.size);
        });
    });

    return Array.from(map.values());
};
