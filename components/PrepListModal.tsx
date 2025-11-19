
import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { XMarkIcon, ScaleIcon, PrinterIcon, CurrencyDollarIcon } from './icons/Icons';
import { AppSettings } from '../services/dbService';

interface PrepListModalProps {
    orders: Order[];
    settings: AppSettings;
    onClose: () => void;
    onUpdateSettings?: (settings: Partial<AppSettings>) => void;
}

export default function PrepListModal({ orders, settings, onClose, onUpdateSettings }: PrepListModalProps) {
    
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

        const allFlavors = Array.from(new Set([
            ...Object.keys(miniCounts),
            ...Object.keys(fullCounts),
            ...settings.empanadaFlavors.map(f => f.name)
        ])).sort();

        let totalEstimatedCost = 0;

        const rows = allFlavors.map(flavor => {
            const miniOrd = miniCounts[flavor] || 0;
            const fullOrd = fullCounts[flavor] || 0;
            
            const stock = inventory[flavor] || { mini: 0, full: 0 };
            
            // Need to Make = Ordered - Stock. Cannot be less than 0.
            const miniToMake = Math.max(0, miniOrd - stock.mini);
            const fullToMake = Math.max(0, fullOrd - stock.full);

            // Calculate Meat Requirements based on "To Make"
            const lbsPer20 = settings.prepSettings?.lbsPer20[flavor] || 0;
            const fullMultiplier = settings.prepSettings?.fullSizeMultiplier || 2.0;

            const miniLbs = (miniToMake / 20) * lbsPer20;
            const fullLbs = (fullToMake / 20) * lbsPer20 * fullMultiplier;
            const totalLbs = miniLbs + fullLbs;

            // Calculate Costs
            const costPerLb = settings.materialCosts[flavor] || 0;
            const fillingCost = totalLbs * costPerLb;
            
            const miniDiscoCost = miniToMake * (settings.discoCosts?.mini || 0);
            const fullDiscoCost = fullToMake * (settings.discoCosts?.full || 0);
            
            const rowCost = fillingCost + miniDiscoCost + fullDiscoCost;
            totalEstimatedCost += rowCost;

            // Only return rows that have action (order, stock, or making)
            if (miniOrd === 0 && fullOrd === 0 && stock.mini === 0 && stock.full === 0) return null;

            return {
                flavor,
                miniOrd,
                miniStock: stock.mini,
                miniToMake,
                fullOrd,
                fullStock: stock.full,
                fullToMake,
                lbsPer20,
                totalLbs,
                rowCost
            };
        }).filter(Boolean) as any[];

        // Calculate Disco Totals (To Make)
        const totalMiniToMake = rows.reduce((acc, r) => acc + r.miniToMake, 0);
        const totalFullToMake = rows.reduce((acc, r) => acc + r.fullToMake, 0);

        return {
            rows,
            totalMiniOrdered,
            totalFullOrdered,
            totalMiniToMake,
            totalFullToMake,
            totalEstimatedCost
        };

    }, [orders, settings, inventory]);

    const handlePrint = () => {
        window.print();
    };

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
                            <p className="text-sm text-gray-500">Adjust Inventory to see what needs to be made.</p>
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
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">Discos to Prep</h4>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-bold text-blue-900">{prepData.totalMiniToMake} <span className="text-sm font-normal text-blue-700">Mini</span></p>
                                    <p className="text-2xl font-bold text-purple-900">{prepData.totalFullToMake} <span className="text-sm font-normal text-purple-700">Full</span></p>
                                </div>
                            </div>
                        </div>
                        
                         <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-green-800 uppercase mb-1">Est. Supply Cost (Batch)</h4>
                            <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                                <p className="text-3xl font-bold text-green-900">${prepData.totalEstimatedCost.toFixed(2)}</p>
                            </div>
                            <p className="text-xs text-green-700 mt-1">Based on "To Make" qty & current material costs.</p>
                        </div>

                         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col justify-center items-start">
                             <p className="text-sm text-amber-900 font-medium">Update Inventory counts in the table below to calculate exactly what needs to be made.</p>
                        </div>
                    </section>

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
                                        
                                        {/* Material Columns */}
                                        <th className="px-3 py-3 text-right text-gray-600">Rate<br/>(lbs/20)</th>
                                        <th className="px-3 py-3 text-right font-bold text-brand-orange">Filling<br/>Needed</th>
                                        <th className="px-3 py-3 text-right text-green-700">Est.<br/>Cost</th>
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
                                        <td className="px-3 py-3 text-right text-gray-400">-</td>
                                        <td className="px-3 py-3 text-right text-gray-400">-</td>
                                        <td className="px-3 py-3 text-right text-green-700">
                                            ${((prepData.totalMiniToMake * (settings.discoCosts?.mini||0)) + (prepData.totalFullToMake * (settings.discoCosts?.full||0))).toFixed(2)}
                                        </td>
                                    </tr>

                                    {prepData.rows.map((row) => (
                                        <tr key={row.flavor} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white">{row.flavor}</td>
                                            
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
                                            <td className="px-2 py-2 text-center font-bold text-blue-700 bg-blue-50/30 border-r border-gray-100">{row.miniToMake}</td>

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
                                            <td className="px-2 py-2 text-center font-bold text-purple-700 bg-purple-50/30 border-r border-gray-100">{row.fullToMake}</td>

                                            {/* Materials */}
                                            <td className="px-3 py-2 text-right text-gray-500 text-xs">
                                                {row.lbsPer20 > 0 ? row.lbsPer20.toFixed(2) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-brand-orange">
                                                {row.totalLbs > 0 ? `${row.totalLbs.toFixed(2)} lbs` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right text-green-700 font-medium">
                                                {row.rowCost > 0 ? `$${row.rowCost.toFixed(2)}` : '-'}
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
