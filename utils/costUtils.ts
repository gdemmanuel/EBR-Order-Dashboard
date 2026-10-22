import { AppSettings, ApprovalStatus, Ingredient, Order, WorkShift } from '../types';
import { getHistoricalIngredientPrice } from './pricingUtils';
import { parseOrderDateTime } from './dateUtils';

export type ItemSize = 'mini' | 'full';

export const DEFAULT_TARGET_MARGIN = 50;

// Everyone began logging all shifts on this date (editable in Prep settings)
export const DEFAULT_LABOR_TRACKING_START = '2026-10-10';

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
 * and the rest across empanadas in proportion to their list price. Costs use prices on the order date;
 * labor uses laborPerUnit when given (e.g. actual labor), otherwise the Prep settings estimate.
 */
export const profitByFlavor = (settings: AppSettings, orders: Order[], laborPerUnit?: { mini: number; full: number }): FlavorProfit[] => {
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
            row.laborCost += e.qty * (laborPerUnit ? laborPerUnit[e.size] : laborCostPerUnit(settings, e.size));
        });
    });

    return Array.from(map.values());
};

// --- Actual labor (from logged shifts) ---

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };

/** How many minis one full size is worth in labor, from the default production rates (40 / 25 = 1.6). */
export const fullToMiniRatio = (settings: AppSettings): number => {
    const mini = Number(settings.prepSettings?.productionRates?.mini) || 0;
    const full = Number(settings.prepSettings?.productionRates?.full) || 0;
    return mini > 0 && full > 0 ? mini / full : 2;
};

export interface LaborWeek {
    weekStart: string; // Monday, YYYY-MM-DD
    label: string;
    pay: number;
    hours: number;
    miniEquivalents: number;
    perMini: number | null;
}

export interface ActualLabor {
    tracked: boolean; // false when the period ends before shift tracking started
    start: string; // YYYY-MM-DD actually used (clamped to tracking start)
    end: string;
    trackingStart: string;
    pay: number;
    hours: number;
    minis: number;
    fulls: number;
    miniEquivalents: number;
    perMini: number | null;
    perFull: number | null;
    minisPerHour: number | null;
    weeks: number;
    early: boolean; // too little data to trust yet
    series: LaborWeek[];
}

const MIN_WEEKS = 4;
const MIN_MINI_EQUIVALENTS = 300;

/**
 * Actual labor cost per empanada: pay from logged shifts divided by the empanadas on approved orders
 * picked up in the same dates. Full sizes count as several minis (fullToMiniRatio), the same weighting
 * the estimate uses. Dates before the shift tracking start are left out so untracked periods don't skew it.
 */
export const actualLabor = (settings: AppSettings, orders: Order[], shifts: WorkShift[], start?: string, end?: string): ActualLabor => {
    const trackingStart = settings.prepSettings?.laborTrackingStart || DEFAULT_LABOR_TRACKING_START;
    const today = ymd(new Date());
    const from = [start || trackingStart, trackingStart].sort().pop()!; // later of the two
    const to = [end || today, today].sort()[0]; // earlier of the two
    const ratio = fullToMiniRatio(settings);

    const empty: ActualLabor = {
        tracked: false, start: from, end: to, trackingStart, pay: 0, hours: 0, minis: 0, fulls: 0, miniEquivalents: 0,
        perMini: null, perFull: null, minisPerHour: null, weeks: 0, early: true, series: [],
    };
    if (from > to) return empty;

    const inRange = (date: string) => !!date && date >= from && date <= to;
    const mondayOf = (date: string) => { const d = parseYmd(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
    const weeksMap = new Map<string, { pay: number; hours: number; miniEquivalents: number }>();
    const week = (date: string) => {
        const key = mondayOf(date);
        let w = weeksMap.get(key);
        if (!w) { w = { pay: 0, hours: 0, miniEquivalents: 0 }; weeksMap.set(key, w); }
        return w;
    };

    let pay = 0, hours = 0, minis = 0, fulls = 0;
    shifts.forEach(s => {
        if (!inRange(s.date)) return;
        pay += Number(s.totalPay) || 0;
        hours += Number(s.hours) || 0;
        const w = week(s.date);
        w.pay += Number(s.totalPay) || 0;
        w.hours += Number(s.hours) || 0;
    });

    orders.forEach(o => {
        if (o.approvalStatus !== ApprovalStatus.APPROVED || o.deleted) return;
        const d = parseOrderDateTime(o);
        if (isNaN(d.getTime())) return;
        const date = ymd(d);
        if (!inRange(date)) return;
        let m = 0, f = 0;
        (o.items || []).forEach(i => {
            if (!i || !i.name || isSalsaName(settings, i.name)) return;
            if (i.name.startsWith('Full ')) f += Number(i.quantity) || 0; else m += Number(i.quantity) || 0;
        });
        minis += m;
        fulls += f;
        week(date).miniEquivalents += m + f * ratio;
    });

    const miniEquivalents = minis + fulls * ratio;
    const perMini = miniEquivalents > 0 && pay > 0 ? pay / miniEquivalents : null;
    const days = (parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400000 + 1;
    const weeks = Math.max(0, Math.round((days / 7) * 10) / 10);

    const series: LaborWeek[] = Array.from(weeksMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, w]) => ({
            weekStart,
            label: parseYmd(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            pay: w.pay,
            hours: w.hours,
            miniEquivalents: w.miniEquivalents,
            perMini: w.miniEquivalents > 0 && w.pay > 0 ? w.pay / w.miniEquivalents : null,
        }));

    return {
        tracked: true, start: from, end: to, trackingStart, pay, hours, minis, fulls, miniEquivalents,
        perMini,
        perFull: perMini !== null ? perMini * ratio : null,
        minisPerHour: hours > 0 && miniEquivalents > 0 ? miniEquivalents / hours : null,
        weeks,
        early: weeks < MIN_WEEKS || miniEquivalents < MIN_MINI_EQUIVALENTS,
        series,
    };
};
