
import React, { useMemo, useState } from 'react';
import { Order, FollowUpStatus } from '../types';
import { XMarkIcon, ScaleIcon, PrinterIcon, CurrencyDollarIcon, ClockIcon } from './icons/Icons';
import { AppSettings } from '../services/dbService';

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

        orders.forEach(order => {
            if (order.followUpStatus === FollowUpStatus.COMPLETED) return;

            order.items.forEach(item => {
                if (item.name.includes('Salsa')) return;

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
            ...settings.empanadaFlavors.map(f => f.name)
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
        const ingredientAggregates = new Map<string, number>(); // Ingredient ID -> Total Amount needed

        // Disco Multipliers & Pack Sizes
        const miniDiscosPer = settings.prepSettings?.discosPer?.mini ?? 1;
        const fullDiscosPer = settings.prepSettings?.discosPer?.full ?? 1;
        const miniPackSize = settings.prepSettings?.discoPackSize?.mini || 10;
        const fullPackSize = settings.prepSettings?.discoPackSize?.full || 10;

        const rows = allFlavors.map(flavor => {
            const miniOrd = miniCounts[flavor] || 0;
            const fullOrd = fullCounts[flavor] || 0;
            
            const stock = inventory[flavor] || { mini: 0, full: 0 };
            
            // Need to Make = Ordered - Stock. Cannot be less than 0.
            const miniToMake = Math.max(0, miniOrd - stock.mini);
            const fullToMake = Math.max(0, fullOrd - stock.full);

            // Surplus = Stock - Ordered. Cannot be less than 0.
            const miniSurplus = Math.max(0, stock.mini - miniOrd);
            const fullSurplus = Math.max(0, stock.full - fullOrd);

            // --- INGREDIENT CALCULATION (New Recipe Logic) ---
            const recipes = settings.prepSettings?.recipes || {};
            const flavorIngredients = recipes[flavor] || [];
            
            let fillingCost = 0;

            // If we have a detailed recipe, use it
            if (flavorIngredients.length > 0) {
                flavorIngredients.forEach(ing => {
                    const ingredientDef = settings.ingredients?.find(i => i.id === ing.ingredientId);
                    if (ingredientDef) {
                        // Logic: Amount per 20 minis
                        // Mini Total Amount = (MiniToMake / 20) * AmountFor20
                        // Full Total Amount = (FullToMake / 20) * AmountFor20 * FullSizeMultiplier
                        const fullMultiplier = settings.prepSettings.fullSizeMultiplier || 2.0;
                        
                        const miniAmount = (miniToMake / 20) * ing.amountFor20Minis;
                        const fullAmount = (fullToMake / 20) * ing.amountFor20Minis * fullMultiplier;
                        const totalAmount = miniAmount + fullAmount;

                        // Aggregate for Total Ingredients View
                        const currentAgg = ingredientAggregates.get(ing.ingredientId) || 0;
                        ingredientAggregates.set(ing.ingredientId, currentAgg + totalAmount);

                        // Add to cost
                        fillingCost += totalAmount * ingredientDef.cost;
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
            
            const miniDiscoCost = miniToMake * miniDiscosPer * (settings.discoCosts?.mini || 0);
            const fullDiscoCost = fullToMake * fullDiscosPer * (settings.discoCosts?.full || 0);
            
            const rowCost = fillingCost + miniDiscoCost + fullDiscoCost;
            totalEstimatedCost += rowCost;

            return {
                flavor,
                miniOrd,
                miniStock: stock.mini,
                miniToMake,
                miniSurplus,
                fullOrd,
                fullStock: stock.full,
                fullToMake,
                fullSurplus,
                rowCost
            };
        }).filter(Boolean) as any[];

        // Calculate Disco Totals
        const totalMiniToMake = rows.reduce((acc, r) => acc + r.miniToMake, 0);
        const totalFullToMake = rows.reduce((acc, r) => acc + r.fullToMake, 0);
        
        const totalMiniDiscosNeeded = totalMiniToMake * miniDiscosPer;
        const totalFullDiscosNeeded = totalFullToMake * fullDiscosPer;
        const totalDiscosNeeded = totalMiniDiscosNeeded + totalFullDiscosNeeded;

        const miniPacksNeeded = Math.ceil(totalMiniDiscosNeeded / miniPackSize);
        const fullPacksNeeded = Math.ceil(totalFullDiscosNeeded / fullPackSize);

        // --- Labor Calculations ---
        const miniRate = settings.prepSettings?.productionRates?.mini || 40;
        const fullRate = settings.prepSettings?.productionRates?.full || 25;
        const hourlyWage = settings.laborWage || 15;

        const miniHours = miniRate > 0 ? totalMiniToMake / miniRate : 0;
        const fullHours = fullRate > 0 ? totalFullToMake / fullRate : 0;
        const totalHours = miniHours + fullHours;
        const totalLaborCost = totalHours * hourlyWage;

        const totalBatchCost = totalEstimatedCost + totalLaborCost;

        // Resolve Ingredient Aggregates to View Models
        const ingredientList = Array.from(ingredientAggregates.entries()).map(([id, amount]) => {
            const def = settings.ingredients?.find(i => i.id === id);
            return {
                name: def?.name || 'Unknown Ingredient',
                amount,
                unit: def?.unit || 'units',
                cost: amount * (def?.cost || 0)
            };
        }).sort((a, b) => b.cost - a.cost);

        return {
            rows,
            totalMiniOrdered,
            totalFullOrdered,
            totalMiniToMake,
            totalFullToMake,
            totalMiniDiscosNeeded,
            totalFullDiscosNeeded,
            totalDiscosNeeded,
            miniPacksNeeded,
            fullPacksNeeded,
            totalEstimatedCost,
            // Labor Data
            miniRate,
            fullRate,
            hourlyWage,
            totalHours,
            totalLaborCost,
            totalBatchCost,
            ingredientList
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center bg-brand-tan/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-orange text-white p-2 rounded-full">
                            <ScaleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-brand-brown">Prep & Inventory List</h2>
                            <p className="text-sm text-gray-500 font-medium">{dateRangeLabel} <span className="font-normal text-gray-400 mx-1">|</span> <span className="font-normal">Excludes completed orders</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {onUpdateSettings && (
                            <button onClick={handleSaveInventory} disabled={isSaving} className="hidden sm:block bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Inventory'}
                            </button>
                        )}
                        <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 text-brand-brown hover:text-brand-orange border border-brand-tan px-3 py-1.5 rounded-md transition-colors">
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="overflow-y-auto p-6 space-y-8 print:p-0">
                    
                    {/* Summary Section */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* 1. Discos */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Total Discos</h4>
                            <div className="flex justify-between items-end">
                                <div className="w-full">
                                    <div className="flex justify-between items-center border-b border-blue-200 pb-1 mb-1">
                                        <span className="text-blue-700 text-sm">Mini:</span>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-blue-900 block">{prepData.totalMiniDiscosNeeded}</span>
                                            <span className="text-[10px] text-blue-600 block">({prepData.miniPacksNeeded} pks)</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-purple-700 text-sm">Full:</span>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-purple-900 block">{prepData.totalFullDiscosNeeded}</span>
                                            <span className="text-[10px] text-purple-600 block">({prepData.fullPacksNeeded} pks)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* 2. Supply Cost */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-green-800 uppercase mb-1">Est. Supply Cost</h4>
                            <div className="flex items-center gap-2 mb-2">
                                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                                <p className="text-2xl font-bold text-green-900">${prepData.totalEstimatedCost.toFixed(2)}</p>
                            </div>
                            <p className="text-[10px] text-green-700 leading-tight">Includes meat, ingredients, and disco costs.</p>
                        </div>

                        {/* 3. Labor Cost */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-yellow-800 uppercase mb-1">Est. Labor Cost</h4>
                            <div className="flex items-center gap-2 mb-1">
                                <ClockIcon className="w-5 h-5 text-yellow-600" />
                                <p className="text-2xl font-bold text-yellow-900">${prepData.totalLaborCost.toFixed(2)}</p>
                            </div>
                            <div className="text-xs text-yellow-800 flex justify-between border-t border-yellow-200 pt-1">
                                <span>{prepData.totalHours.toFixed(1)} hrs</span>
                                <span>@ ${prepData.hourlyWage}/hr</span>
                            </div>
                        </div>

                        {/* 4. Total Batch Cost */}
                         <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col justify-center items-center">
                             <h4 className="text-xs font-bold text-gray-600 uppercase mb-1">Total Batch Cost</h4>
                             <p className="text-3xl font-bold text-brand-brown">${prepData.totalBatchCost.toFixed(2)}</p>
                             <p className="text-xs text-gray-500 mt-1">Supplies + Labor</p>
                        </div>
                    </section>

                    {/* Ingredient Breakdown (New Section) */}
                    {prepData.ingredientList.length > 0 && (
                        <section className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 className="font-bold text-orange-900 mb-3">Ingredient Requirements (Aggregated)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {prepData.ingredientList.map((ing, idx) => (
                                    <div key={idx} className="bg-white p-2 rounded shadow-sm border border-orange-100">
                                        <span className="block text-xs font-bold text-gray-700 mb-1 truncate" title={ing.name}>{ing.name}</span>
                                        <div className="flex justify-between items-end">
                                            <span className="text-lg font-bold text-brand-orange leading-none">{ing.amount.toFixed(1)}</span>
                                            <span className="text-xs text-gray-500">{ing.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Main Table */}
                    <section>
                        <div className="overflow-x-auto border rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left font-bold text-gray-700 sticky left-0 bg-gray-50">Flavor</th>
                                        
                                        {/* Mini Columns */}
                                        <th className="px-2 py-3 text-center bg-blue-50/50 border-l border-blue-100">Mini<br/>Order</th>
                                        <th className="px-2 py-3 text-center bg-blue-50/50 w-20">Mini<br/>Stock</th>
                                        <th className="px-2 py-3 text-center bg-blue-100/50 font-bold text-blue-900 border-r border-blue-100">Mini<br/>Make</th>

                                        {/* Full Columns */}
                                        <th className="px-2 py-3 text-center bg-purple-50/50">Full<br/>Order</th>
                                        <th className="px-2 py-3 text-center bg-purple-50/50 w-20">Full<br/>Stock</th>
                                        <th className="px-2 py-3 text-center bg-purple-100/50 font-bold text-purple-900 border-r border-purple-100">Full<br/>Make</th>
                                        
                                        {/* Cost Column Removed */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {/* Explicit Discos Row */}
                                    <tr className="bg-gray-50 font-semibold">
                                        <td className="px-3 py-3 sticky left-0 bg-gray-50">Discos / Shells</td>
                                        <td className="px-2 py-3 text-center text-gray-500">-</td>
                                        <td className="px-2 py-3 text-center text-gray-500">-</td>
                                        <td className="px-2 py-3 text-center text-blue-900 bg-blue-50">{prepData.totalMiniToMake}</td>
                                        <td className="px-2 py-3 text-center text-gray-500">-</td>
                                        <td className="px-2 py-3 text-center text-gray-500">-</td>
                                        <td className="px-2 py-3 text-center text-purple-900 bg-purple-50">{prepData.totalFullToMake}</td>
                                    </tr>

                                    {prepData.rows.map((row) => (
                                        <tr key={row.flavor} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white">
                                                {row.flavor}
                                                {/* Optional: Add marker for Special flavors? The sort puts them at bottom now. */}
                                            </td>
                                            
                                            {/* Mini */}
                                            <td className="px-2 py-2 text-center border-l border-gray-100">{row.miniOrd}</td>
                                            <td className="px-2 py-2 text-center">
                                                <input 
                                                    type="number" min="0" 
                                                    value={row.miniStock} 
                                                    onChange={(e) => updateInventory(row.flavor, 'mini', e.target.value)}
                                                    className="w-16 text-center text-xs border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 p-1"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center border-r border-gray-100 bg-blue-50/30">
                                                {row.miniToMake > 0 ? (
                                                    <span className="font-bold text-blue-700">{row.miniToMake}</span>
                                                ) : row.miniSurplus > 0 ? (
                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200" title="Surplus">+{row.miniSurplus}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>

                                            {/* Full */}
                                            <td className="px-2 py-2 text-center">{row.fullOrd}</td>
                                            <td className="px-2 py-2 text-center">
                                                <input 
                                                    type="number" min="0" 
                                                    value={row.fullStock} 
                                                    onChange={(e) => updateInventory(row.flavor, 'full', e.target.value)}
                                                    className="w-16 text-center text-xs border-gray-300 rounded shadow-sm focus:ring-purple-500 focus:border-purple-500 p-1"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center border-r border-purple-100 bg-purple-50/30">
                                                {row.fullToMake > 0 ? (
                                                    <span className="font-bold text-purple-700">{row.fullToMake}</span>
                                                ) : row.fullSurplus > 0 ? (
                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200" title="Surplus">+{row.fullSurplus}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
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
                        visibility: visible;
                    }
                    .bg-white.rounded-lg.shadow-2xl * {
                        visibility: visible;
                    }
                    header button, input[type="number"] {
                        border: none;
                        background: transparent;
                        /* Hide inputs visually but keep value? Or simplify for print. */
                    }
                }
            `}</style>
        </div>
    );
}