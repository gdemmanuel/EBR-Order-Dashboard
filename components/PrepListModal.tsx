
import React, { useMemo, useState } from 'react';
import { Order, FollowUpStatus, Ingredient } from '../types';
import { XMarkIcon, ScaleIcon, PrinterIcon, ChevronDownIcon } from './icons/Icons';
import { AppSettings } from '../services/dbService';
import { getOrderPlatterSizes } from '../utils/orderUtils';

// Most recent purchase price (by date) from the ingredient's price history, falling back to its current cost.
const getLatestPrice = (ingredient: Ingredient): number => {
    const history = ingredient.priceHistory || [];
    if (history.length === 0) return ingredient.cost || 0;
    const latest = history.reduce((a, b) => (b.date > a.date ? b : a));
    return latest.price;
};

// Show whole numbers as-is and everything else to one decimal place.
const formatQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Ingredient amounts: one decimal place, two for small amounts (e.g. 0.09 gallon)
const formatAmount = (n: number) => (n < 1 ? n.toFixed(2) : n.toFixed(1));

interface PrepListModalProps {
    orders: Order[];
    settings: AppSettings;
    onClose: () => void;
    onUpdateSettings?: (settings: Partial<AppSettings>) => void;
    dateRange?: { start?: string; end?: string };
}

export default function PrepListModal({ orders, settings, onClose, onUpdateSettings, dateRange }: PrepListModalProps) {

    // Local state to manage inventory changes before saving
    const [inventory, setInventory] = useState<Record<string, { mini: number, full: number }>>(settings.inventory || {});
    const [isSaving, setIsSaving] = useState(false);
    const [showAllFlavors, setShowAllFlavors] = useState(false);

    // "Show costs" is remembered on this device; off by default. Costs never print.
    const [showCosts, setShowCosts] = useState<boolean>(() => {
        try { return localStorage.getItem('prepList.showCosts') === '1'; } catch { return false; }
    });
    const toggleShowCosts = (value: boolean) => {
        setShowCosts(value);
        try { localStorage.setItem('prepList.showCosts', value ? '1' : '0'); } catch { /* storage unavailable */ }
    };

    const updateInventory = (flavor: string, type: 'mini' | 'full', value: string) => {
        const numVal = parseInt(value) || 0;
        setInventory(prev => ({
            ...prev,
            [flavor]: {
                ...(prev[flavor] || { mini: 0, full: 0 }),
                [type]: numVal
            }
        }));
    };

    const handleSaveInventory = async () => {
        if (onUpdateSettings) {
            setIsSaving(true);
            await onUpdateSettings({ inventory });
            setIsSaving(false);
        }
    };

    const prepData = useMemo(() => {
        const miniCounts: Record<string, number> = {};
        const fullCounts: Record<string, number> = {};

        let totalMiniOrdered = 0;
        let totalFullOrdered = 0;

        // Party platter trays needed, by size (e.g. 18" / 12")
        const platterCounts: Record<string, number> = {};

        let openOrderCount = 0;

        orders.forEach(order => {
            if (order.followUpStatus === FollowUpStatus.COMPLETED) return;
            openOrderCount++;

            getOrderPlatterSizes(order, settings.pricing?.packages || []).forEach(size => {
                platterCounts[size] = (platterCounts[size] || 0) + 1;
            });

            order.items.forEach(item => {
                if (item.name.includes('Salsa') && !settings.pricing?.salsas?.some(s => s.name === item.name)) {
                    // Only skip if it looks like a salsa but isn't a configured salsa product
                    // Actually, let's just remove the filter entirely so "Extras" show up too if they have recipes.
                }

                const isFull = item.name.startsWith('Full ');
                const cleanName = item.name.replace('Full ', '');

                if (isFull) {
                    fullCounts[cleanName] = (fullCounts[cleanName] || 0) + item.quantity;
                    totalFullOrdered += item.quantity;
                } else {
                    miniCounts[cleanName] = (miniCounts[cleanName] || 0) + item.quantity;
                    totalMiniOrdered += item.quantity;
                }
            });
        });

        // Sort: Regular flavors first, then Special flavors. Within groups, alphabetical.
        const allFlavors = Array.from(new Set([
            ...Object.keys(miniCounts),
            ...Object.keys(fullCounts),
            ...settings.empanadaFlavors.map(f => f.name),
            ...(settings.pricing?.salsas || []).map(s => s.name)
        ])).sort((a, b) => {
            const defA = settings.empanadaFlavors.find(f => f.name === a);
            const defB = settings.empanadaFlavors.find(f => f.name === b);

            const isSpecialA = defA?.isSpecial || false;
            const isSpecialB = defB?.isSpecial || false;

            if (isSpecialA !== isSpecialB) {
                return isSpecialA ? 1 : -1; // Regular (false) before Special (true)
            }
            return a.localeCompare(b);
        });

        let totalEstimatedCost = 0; // Supply Cost (Ingredients + Discos)

        // Track totals AND breakdown by flavor for ingredients
        // Map<IngredientID, { total: number, breakdown: Map<FlavorName, number> }>
        const ingredientAggregates = new Map<string, { total: number, breakdown: Map<string, number> }>();

        // Disco Multipliers & Pack Sizes
        const miniDiscosPer = settings.prepSettings?.discosPer?.mini ?? 1;
        const fullDiscosPer = settings.prepSettings?.discosPer?.full ?? 1;
        const miniPackSize = settings.prepSettings?.discoPackSize?.mini || 10;
        const fullPackSize = settings.prepSettings?.discoPackSize?.full || 10;

        // Salsas are sold per container: no discos, no empanada labor.
        const salsaNames = new Set((settings.pricing?.salsas || []).map(s => s.name));

        // Discos are costed once, from the latest price of the "Discos" inventory ingredient.
        // Recipes also list Discos, so that line is skipped in the recipe loop to avoid counting it twice.
        // Falls back to the manual disco costs in Settings if no Discos ingredient exists.
        const discoIngredient = settings.ingredients?.find(i => /^discos?$/i.test(i.name.trim()));
        const discoUnitCost = discoIngredient
            ? { mini: getLatestPrice(discoIngredient), full: getLatestPrice(discoIngredient) }
            : { mini: settings.discoCosts?.mini || 0, full: settings.discoCosts?.full || 0 };

        const rows = allFlavors.map(flavor => {
            const miniOrd = miniCounts[flavor] || 0;
            const fullOrd = fullCounts[flavor] || 0;

            const stock = inventory[flavor] || { mini: 0, full: 0 };

            // Calculate Net (Positive = Make, Negative = Surplus)
            const miniNet = miniOrd - stock.mini;
            const fullNet = fullOrd - stock.full;

            // Need to Make = Ordered - Stock. Cannot be less than 0 for cost calculations.
            const miniToMake = Math.max(0, miniNet);
            const fullToMake = Math.max(0, fullNet);

            const isSalsa = salsaNames.has(flavor);

            // --- INGREDIENT CALCULATION (New Recipe Logic) ---
            const recipes = settings.prepSettings?.recipes || {};
            const flavorIngredients = recipes[flavor] || [];

            let fillingCost = 0;

            // If we have a detailed recipe, use it
            if (flavorIngredients.length > 0) {
                flavorIngredients.forEach(ing => {
                    if (discoIngredient && ing.ingredientId === discoIngredient.id) return;
                    const ingredientDef = settings.ingredients?.find(i => i.id === ing.ingredientId);
                    if (ingredientDef) {
                        // Salsas/extras are per unit; empanadas are per 20
                        let miniAmount = 0;
                        let fullAmount = 0;

                        if (isSalsa) {
                            // Per Unit Logic
                            // Salsas are tracked in miniToMake (standard unit)
                            miniAmount = miniToMake * ing.amountFor20Minis;
                            fullAmount = 0;
                        } else {
                            // Empanada Logic (Per 20)
                            const fullMultiplier = settings.prepSettings.fullSizeMultiplier || 2.0;
                            miniAmount = (miniToMake / 20) * ing.amountFor20Minis;
                            fullAmount = (fullToMake / 20) * ing.amountFor20Minis * fullMultiplier;
                        }

                        const totalAmount = miniAmount + fullAmount;

                        // Aggregate for Total Ingredients View
                        const currentAgg = ingredientAggregates.get(ing.ingredientId) || { total: 0, breakdown: new Map<string, number>() };

                        // Update Total
                        currentAgg.total += totalAmount;

                        // Update Breakdown
                        const currentBreakdown = currentAgg.breakdown.get(flavor) || 0;
                        currentAgg.breakdown.set(flavor, currentBreakdown + totalAmount);

                        ingredientAggregates.set(ing.ingredientId, currentAgg);

                        // Add to cost
                        fillingCost += totalAmount * getLatestPrice(ingredientDef);
                    }
                });
            } else {
                // --- FALLBACK TO LEGACY LBS/20 LOGIC ---
                const lbsPer20 = settings.prepSettings?.lbsPer20[flavor] || 0;
                const fullMultiplier = settings.prepSettings?.fullSizeMultiplier || 2.0;
                const miniLbs = (miniToMake / 20) * lbsPer20;
                const fullLbs = (fullToMake / 20) * lbsPer20 * fullMultiplier;
                const totalLbs = miniLbs + fullLbs;

                // Use old cost map
                const costPerLb = settings.materialCosts[flavor] || 0;
                fillingCost += totalLbs * costPerLb;
            }

            const miniDiscoCost = isSalsa ? 0 : miniToMake * miniDiscosPer * discoUnitCost.mini;
            const fullDiscoCost = isSalsa ? 0 : fullToMake * fullDiscosPer * discoUnitCost.full;

            const rowCost = fillingCost + miniDiscoCost + fullDiscoCost;
            totalEstimatedCost += rowCost;

            return {
                flavor,
                miniOrd,
                miniStock: stock.mini,
                miniNet,
                miniToMake,
                fullOrd,
                fullStock: stock.full,
                fullNet,
                fullToMake,
                isSalsa,
                hasRecipe: flavorIngredients.length > 0 || (settings.prepSettings?.lbsPer20?.[flavor] || 0) > 0,
                rowCost
            };
        }).filter(Boolean) as any[];

        // Calculate Disco Totals (empanadas only)
        const empanadaRows = rows.filter(r => !r.isSalsa);
        const totalMiniToMake = empanadaRows.reduce((acc, r) => acc + r.miniToMake, 0);
        const totalFullToMake = empanadaRows.reduce((acc, r) => acc + r.fullToMake, 0);

        const totalMiniDiscosNeeded = totalMiniToMake * miniDiscosPer;
        const totalFullDiscosNeeded = totalFullToMake * fullDiscosPer;
        const totalDiscosNeeded = totalMiniDiscosNeeded + totalFullDiscosNeeded;

        // Exact packs used, and whole packs to buy
        const miniPacksExact = totalMiniDiscosNeeded / miniPackSize;
        const fullPacksExact = totalFullDiscosNeeded / fullPackSize;
        const miniPacksNeeded = Math.ceil(miniPacksExact);
        const fullPacksNeeded = Math.ceil(fullPacksExact);
        const totalDiscoCost = totalMiniDiscosNeeded * discoUnitCost.mini + totalFullDiscosNeeded * discoUnitCost.full;

        // --- Labor Calculations ---
        const miniRate = settings.prepSettings?.productionRates?.mini || 40;
        const fullRate = settings.prepSettings?.productionRates?.full || 25;
        const hourlyWage = settings.laborWage || 15;

        const miniHours = miniRate > 0 ? totalMiniToMake / miniRate : 0;
        const fullHours = fullRate > 0 ? totalFullToMake / fullRate : 0;
        const totalHours = miniHours + fullHours;
        const totalLaborCost = totalHours * hourlyWage;

        const totalBatchCost = totalEstimatedCost + totalLaborCost;

        // Resolve Ingredient Aggregates to View Models.
        // Empanada fillings are listed per ingredient with a per-flavor breakdown;
        // salsa ingredients are listed per salsa so they don't mix with fillings.
        const ingredientList: { name: string; amount: number; unit: string; breakdown: { flavor: string; amount: number }[] }[] = [];
        const salsaIngredients = new Map<string, { name: string; amount: number; unit: string }[]>();

        ingredientAggregates.forEach((data, id) => {
            const def = settings.ingredients?.find(i => i.id === id);
            const name = def?.name || 'Unknown Ingredient';
            const unit = def?.unit || 'units';

            const breakdown: { flavor: string; amount: number }[] = [];
            data.breakdown.forEach((amount, flavor) => {
                if (amount <= 0) return;
                if (salsaNames.has(flavor)) {
                    salsaIngredients.set(flavor, [...(salsaIngredients.get(flavor) || []), { name, amount, unit }]);
                } else {
                    breakdown.push({ flavor, amount });
                }
            });

            const amount = breakdown.reduce((sum, b) => sum + b.amount, 0);
            if (amount > 0) {
                ingredientList.push({ name, amount, unit, breakdown: breakdown.sort((a, b) => b.amount - a.amount) });
            }
        });
        ingredientList.sort((a, b) => b.amount - a.amount);

        const salsaCards = rows
            .filter(r => r.isSalsa && r.miniToMake > 0)
            .map(r => ({ flavor: r.flavor, toMake: r.miniToMake, ingredients: salsaIngredients.get(r.flavor) || [] }));

        return {
            rows,
            totalMiniOrdered,
            totalFullOrdered,
            totalMiniToMake,
            totalFullToMake,
            totalMiniDiscosNeeded,
            totalFullDiscosNeeded,
            totalDiscosNeeded,
            platterCounts,
            openOrderCount,
            miniPacksExact,
            fullPacksExact,
            miniPacksNeeded,
            fullPacksNeeded,
            discoUnitCost,
            discoPriceFromInventory: !!discoIngredient,
            totalDiscoCost,
            totalEstimatedCost,
            // Labor Data
            miniRate,
            fullRate,
            hourlyWage,
            totalHours,
            totalLaborCost,
            totalBatchCost,
            ingredientList,
            salsaCards
        };

    }, [orders, settings, inventory]);

    const handlePrint = () => {
        window.print();
    };

    const dateRangeLabel = useMemo(() => {
        if (!dateRange?.start) return "All Upcoming Orders";
        const start = new Date(dateRange.start + 'T00:00:00').toLocaleDateString();
        if (!dateRange.end) return `Orders since ${start}`;
        const end = new Date(dateRange.end + 'T00:00:00').toLocaleDateString();
        return `${start} - ${end}`;
    }, [dateRange]);

    // Table rows: empanadas with orders or stock first; the rest behind "Show N flavors with no orders"
    const empanadaRows = prepData.rows.filter(r => !r.isSalsa);
    const activeRows = empanadaRows.filter(r => r.miniOrd > 0 || r.fullOrd > 0 || r.miniStock > 0 || r.fullStock > 0);
    const idleRows = empanadaRows.filter(r => !activeRows.includes(r));
    const salsaRows = prepData.rows.filter(r => r.isSalsa);
    const sortedActiveRows = [...activeRows].sort((a, b) => (b.miniToMake + b.fullToMake) - (a.miniToMake + a.fullToMake));
    const visibleRows = showAllFlavors ? [...sortedActiveRows, ...idleRows] : sortedActiveRows;

    const totalToMake = prepData.totalMiniToMake + prepData.totalFullToMake;
    const fillingCost = prepData.totalEstimatedCost - prepData.totalDiscoCost;
    const platterEntries = Object.entries(prepData.platterCounts).sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }));

    // Make cell: number to make, extra stock, "done" when stock covers the order, or a dash
    const makeCell = (ordered: number, net: number, color: string) => {
        if (net > 0) return <span className={`font-semibold text-base ${color}`}>{net}</span>;
        if (net < 0) return <span className="text-green-700 text-xs font-medium">+{Math.abs(net)} extra</span>;
        if (ordered > 0) return <span className="text-gray-400 text-xs">done</span>;
        return <span className="text-gray-300">–</span>;
    };

    const stockInput = (flavor: string, type: 'mini' | 'full', value: number, ring: string) => (
        <input
            type="number" min="0"
            value={value}
            onChange={(e) => updateInventory(flavor, type, e.target.value)}
            className={`w-14 h-7 text-right text-xs border-gray-300 rounded px-1.5 ${ring}`}
        />
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="px-6 py-4 border-b border-brand-tan flex justify-between items-center gap-4 bg-brand-cream">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-brand-orange text-white p-2 rounded-full">
                            <ScaleIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-2xl font-serif text-brand-brown leading-tight">Prep &amp; Inventory List</h2>
                            <p className="text-xs text-gray-500">{dateRangeLabel} · {prepData.openOrderCount} open orders · excludes completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 prep-no-print">
                        <label className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                            <input type="checkbox" checked={showCosts} onChange={(e) => toggleShowCosts(e.target.checked)} className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                            Show costs
                        </label>
                        <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 text-brand-brown hover:text-brand-orange border border-brand-tan bg-white px-3 py-1.5 rounded-md transition-colors text-sm">
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        {onUpdateSettings && (
                            <button onClick={handleSaveInventory} disabled={isSaving} className="hidden sm:block bg-brand-orange text-white px-3 py-1.5 rounded-md hover:bg-opacity-90 transition-colors text-sm font-medium disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save stock'}
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="overflow-y-auto p-6 space-y-6 print:p-0">

                    {/* Summary */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">To make</p>
                            <p className="text-2xl font-semibold text-brand-brown">{prepData.totalMiniToMake} <span className="text-xs font-normal text-gray-500">mini</span></p>
                            <p className="text-xs text-gray-500">{prepData.totalFullToMake} full size</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Discos needed</p>
                            <p className="text-2xl font-semibold text-brand-brown">{Math.ceil(prepData.totalMiniDiscosNeeded) + Math.ceil(prepData.totalFullDiscosNeeded)} <span className="text-xs font-normal text-gray-500">discos</span></p>
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                <div className="flex justify-between"><span>Mini: {Math.ceil(prepData.totalMiniDiscosNeeded)}</span><span>{prepData.miniPacksNeeded} {prepData.miniPacksNeeded === 1 ? 'pack' : 'packs'}</span></div>
                                <div className="flex justify-between"><span>Full: {Math.ceil(prepData.totalFullDiscosNeeded)}</span><span>{prepData.fullPacksNeeded} {prepData.fullPacksNeeded === 1 ? 'pack' : 'packs'}</span></div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Labor</p>
                            <p className="text-2xl font-semibold text-brand-brown">{prepData.totalHours.toFixed(1)} <span className="text-xs font-normal text-gray-500">hrs</span></p>
                            <p className="text-xs text-gray-500">{prepData.miniRate}/hr mini · {prepData.fullRate}/hr full</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Orders</p>
                            <p className="text-2xl font-semibold text-brand-brown">{prepData.openOrderCount}</p>
                            <p className="text-xs text-gray-500">{totalToMake} empanadas total</p>
                        </div>
                    </section>

                    {/* Also prep: platters and salsas */}
                    {(platterEntries.length > 0 || salsaRows.some(r => r.miniToMake > 0)) && (
                        <section className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-gray-500">Also prep:</span>
                            {platterEntries.map(([size, count]) => (
                                <span key={size} className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs font-medium">
                                    {count} × {size === 'Unknown size' ? 'platter (size unknown)' : `${size} platter`}
                                </span>
                            ))}
                            {salsaRows.filter(r => r.miniToMake > 0).map(r => (
                                <span key={r.flavor} className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-medium">
                                    {r.miniToMake} {r.flavor}
                                </span>
                            ))}
                        </section>
                    )}

                    {/* Make table */}
                    <section className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="sticky left-0 bg-gray-50"></th>
                                        <th colSpan={3} className="px-2 pt-2 pb-1 text-center text-orange-800 font-semibold border-b-2 border-orange-300">Mini · {prepData.totalMiniToMake} to make</th>
                                        <th colSpan={3} className="px-2 pt-2 pb-1 text-center text-purple-900 font-semibold border-b-2 border-purple-300 bg-purple-50">Full size · {prepData.totalFullToMake} to make</th>
                                    </tr>
                                    <tr className="bg-gray-50 text-xs text-gray-500">
                                        <th className="px-3 py-2 text-left font-medium sticky left-0 bg-gray-50">Flavor</th>
                                        <th className="px-2 py-2 text-right font-medium">Ordered</th>
                                        <th className="px-2 py-2 text-right font-medium">Stock</th>
                                        <th className="px-3 py-2 text-right font-medium">Make</th>
                                        <th className="px-2 py-2 text-right font-medium bg-purple-50">Ordered</th>
                                        <th className="px-2 py-2 text-right font-medium bg-purple-50">Stock</th>
                                        <th className="px-3 py-2 text-right font-medium bg-purple-50">Make</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibleRows.map(row => (
                                        <tr key={row.flavor} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-900 sticky left-0 bg-white">
                                                {row.flavor}
                                                {!row.hasRecipe && (row.miniToMake > 0 || row.fullToMake > 0) && (
                                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">no recipe</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-right tabular-nums">{row.miniOrd || <span className="text-gray-300">–</span>}</td>
                                            <td className="px-2 py-2 text-right">{stockInput(row.flavor, 'mini', row.miniStock, 'focus:ring-orange-400 focus:border-orange-400')}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{makeCell(row.miniOrd, row.miniNet, 'text-orange-800')}</td>
                                            <td className="px-2 py-2 text-right tabular-nums bg-purple-50/60">{row.fullOrd || <span className="text-gray-300">–</span>}</td>
                                            <td className="px-2 py-2 text-right bg-purple-50/60">{stockInput(row.flavor, 'full', row.fullStock, 'focus:ring-purple-400 focus:border-purple-400')}</td>
                                            <td className="px-3 py-2 text-right tabular-nums bg-purple-50/60">{makeCell(row.fullOrd, row.fullNet, 'text-purple-900')}</td>
                                        </tr>
                                    ))}
                                    {salsaRows.map(row => (
                                        <tr key={row.flavor} className="bg-amber-50/40">
                                            <td className="px-3 py-2 text-amber-900 sticky left-0 bg-amber-50">{row.flavor}</td>
                                            <td className="px-2 py-2 text-right tabular-nums">{row.miniOrd || <span className="text-gray-300">–</span>}</td>
                                            <td className="px-2 py-2 text-right">{stockInput(row.flavor, 'mini', row.miniStock, 'focus:ring-amber-400 focus:border-amber-400')}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{makeCell(row.miniOrd, row.miniNet, 'text-amber-800')}</td>
                                            <td colSpan={3} className="px-3 py-2 text-xs text-amber-700 bg-purple-50/60">per container</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50">
                                        <td className="px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-gray-50">Discos</td>
                                        <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-600">
                                            {formatQty(prepData.totalMiniDiscosNeeded)} discos · <span className="font-semibold text-orange-800">buy {prepData.miniPacksNeeded} packs</span>
                                            <span className="text-gray-400"> ({formatQty(Math.round(prepData.miniPacksExact * 10) / 10)} used)</span>
                                        </td>
                                        <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-600 bg-purple-50">
                                            {formatQty(prepData.totalFullDiscosNeeded)} discos · <span className="font-semibold text-purple-900">buy {prepData.fullPacksNeeded} packs</span>
                                            <span className="text-gray-400"> ({formatQty(Math.round(prepData.fullPacksExact * 10) / 10)} used)</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {idleRows.length > 0 && (
                            <button onClick={() => setShowAllFlavors(v => !v)} className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-brand-brown border-t border-gray-100 flex items-center gap-1 prep-no-print">
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAllFlavors ? 'rotate-180' : ''}`} />
                                {showAllFlavors ? 'Hide flavors with no orders' : `Show ${idleRows.length} flavors with no orders`}
                            </button>
                        )}
                    </section>

                    {/* Ingredients */}
                    {(prepData.ingredientList.length > 0 || prepData.salsaCards.length > 0) && (
                        <section>
                            <div className="flex justify-between items-baseline mb-2">
                                <h4 className="font-semibold text-brand-brown">Ingredients needed</h4>
                                <span className="text-xs text-gray-500">mini and full combined, by flavor</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {prepData.ingredientList.map(ing => (
                                    <div key={ing.name} className="border border-gray-200 rounded-xl p-3 bg-white">
                                        <div className="flex justify-between items-baseline text-sm font-semibold text-gray-800">
                                            <span className="truncate" title={ing.name}>{ing.name}</span>
                                            <span className="whitespace-nowrap pl-2">{formatAmount(ing.amount)} {ing.unit}</span>
                                        </div>
                                        <div className="mt-2 space-y-1.5">
                                            {ing.breakdown.map(b => (
                                                <div key={b.flavor} className="grid grid-cols-[1fr_auto] gap-x-2 items-center text-xs text-gray-600">
                                                    <div className="min-w-0">
                                                        <span className="truncate block" title={b.flavor}>{b.flavor}</span>
                                                        <div className="h-1 rounded-full bg-orange-300 mt-0.5" style={{ width: `${Math.max(4, (b.amount / ing.amount) * 100)}%` }} />
                                                    </div>
                                                    <span className="tabular-nums">{formatAmount(b.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {prepData.salsaCards.map(card => (
                                    <div key={card.flavor} className="border border-amber-200 rounded-xl p-3 bg-amber-50">
                                        <div className="flex justify-between items-baseline text-sm font-semibold text-amber-900">
                                            <span className="truncate">{card.flavor}</span>
                                            <span className="pl-2">× {card.toMake}</span>
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-amber-800">
                                            {card.ingredients.length === 0 && <p className="text-amber-700">No recipe set up</p>}
                                            {card.ingredients.map(i => (
                                                <div key={i.name} className="flex justify-between">
                                                    <span className="truncate">{i.name}</span>
                                                    <span className="tabular-nums pl-2">{formatAmount(i.amount)} {i.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Batch cost (optional, never printed) */}
                    {showCosts && (
                        <section className="prep-costs border border-gray-200 rounded-xl p-4 bg-gray-50 max-w-md ml-auto">
                            <h4 className="text-sm font-semibold text-brand-brown mb-2">Batch cost estimate</h4>
                            <div className="grid grid-cols-[1fr_auto] gap-y-1 text-sm text-gray-700">
                                <span>Fillings and salsas</span><span className="text-right tabular-nums">${fillingCost.toFixed(2)}</span>
                                <span>Discos <span className="text-xs text-gray-500">@ ${prepData.discoUnitCost.mini.toFixed(4)} {prepData.discoPriceFromInventory ? '(latest price)' : '(from Settings)'}</span></span><span className="text-right tabular-nums">${prepData.totalDiscoCost.toFixed(2)}</span>
                                <span>Labor <span className="text-xs text-gray-500">{prepData.totalHours.toFixed(1)} hrs @ ${prepData.hourlyWage}/hr</span></span><span className="text-right tabular-nums">${prepData.totalLaborCost.toFixed(2)}</span>
                                <span className="font-semibold border-t border-gray-200 pt-1 mt-1">Total</span><span className="font-semibold text-right tabular-nums border-t border-gray-200 pt-1 mt-1">${prepData.totalBatchCost.toFixed(2)}</span>
                                {totalToMake > 0 && (<><span className="text-xs text-gray-500">Per empanada</span><span className="text-xs text-gray-500 text-right tabular-nums">${(prepData.totalBatchCost / totalToMake).toFixed(2)}</span></>)}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .fixed.inset-0.bg-black {
                        position: absolute;
                        left: 0;
                        top: 0;
                        background: white;
                        padding: 0;
                    }
                    .bg-white.rounded-lg.shadow-2xl {
                        box-shadow: none;
                        border: none;
                        max-width: 100%;
                        width: 100%;
                        max-height: none;
                        visibility: visible;
                    }
                    .bg-white.rounded-lg.shadow-2xl * {
                        visibility: visible;
                    }
                    .bg-white.rounded-lg.shadow-2xl .overflow-y-auto {
                        overflow: visible;
                    }
                    .prep-costs, .prep-no-print {
                        display: none !important;
                    }
                    input[type="number"] {
                        border: none;
                        background: transparent;
                    }
                }
            `}</style>
        </div>
    );
}
