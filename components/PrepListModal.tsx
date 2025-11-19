
import React, { useMemo } from 'react';
import { Order, ApprovalStatus } from '../types';
import { XMarkIcon, ScaleIcon, PrinterIcon } from './icons/Icons';
import { AppSettings } from '../services/dbService';

interface PrepListModalProps {
    orders: Order[];
    settings: AppSettings;
    onClose: () => void;
}

export default function PrepListModal({ orders, settings, onClose }: PrepListModalProps) {
    
    const prepData = useMemo(() => {
        const miniCounts: Record<string, number> = {};
        const fullCounts: Record<string, number> = {};
        
        let totalMiniDiscos = 0;
        let totalFullDiscos = 0;

        orders.forEach(order => {
            order.items.forEach(item => {
                // Skip Salsas
                if (item.name.includes('Salsa')) return;

                const isFull = item.name.startsWith('Full ');
                const cleanName = item.name.replace('Full ', '');
                
                if (isFull) {
                    fullCounts[cleanName] = (fullCounts[cleanName] || 0) + item.quantity;
                    totalFullDiscos += item.quantity;
                } else {
                    miniCounts[cleanName] = (miniCounts[cleanName] || 0) + item.quantity;
                    totalMiniDiscos += item.quantity;
                }
            });
        });

        // Identify all unique flavors found in orders OR in settings
        const allFlavors = new Set([
            ...Object.keys(miniCounts),
            ...Object.keys(fullCounts),
            ...settings.empanadaFlavors.map(f => f.name)
        ]);

        const ingredientRows = Array.from(allFlavors).map(flavor => {
            const miniQty = miniCounts[flavor] || 0;
            const fullQty = fullCounts[flavor] || 0;
            
            const lbsPer20 = settings.prepSettings?.lbsPer20[flavor] || 0;
            const fullMultiplier = settings.prepSettings?.fullSizeMultiplier || 2.0;

            const miniRequired = (miniQty / 20) * lbsPer20;
            const fullRequired = (fullQty / 20) * lbsPer20 * fullMultiplier;
            
            const totalLbs = miniRequired + fullRequired;

            // Only return rows that have orders OR have a configured setting (optional, but cleaner to show only active)
            // Here we filter for active demand
            if (miniQty === 0 && fullQty === 0) return null;

            return {
                flavor,
                miniQty,
                fullQty,
                lbsPer20,
                totalLbs
            };
        }).filter(Boolean) as { flavor: string; miniQty: number; fullQty: number; lbsPer20: number; totalLbs: number }[];

        // Sort by flavor name
        ingredientRows.sort((a, b) => a.flavor.localeCompare(b.flavor));

        return {
            totalMiniDiscos,
            totalFullDiscos,
            ingredientRows
        };

    }, [orders, settings]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center bg-brand-tan/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-orange text-white p-2 rounded-full">
                            <ScaleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-brand-brown">Prep List & Inventory</h2>
                            <p className="text-sm text-gray-500">Calculated from {orders.length} selected orders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 text-brand-brown hover:text-brand-orange border border-brand-tan px-3 py-1.5 rounded-md transition-colors">
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="overflow-y-auto p-6 space-y-8 print:p-0">
                    
                    {/* Discos Section */}
                    <section>
                        <h3 className="text-lg font-bold text-brand-brown mb-3 border-b pb-1">Discos / Shells Required</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                                <span className="text-blue-800 font-medium">Mini Discos</span>
                                <span className="text-2xl font-bold text-blue-900">{prepData.totalMiniDiscos}</span>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex justify-between items-center">
                                <span className="text-purple-800 font-medium">Full-Size Discos</span>
                                <span className="text-2xl font-bold text-purple-900">{prepData.totalFullDiscos}</span>
                            </div>
                        </div>
                    </section>

                    {/* Ingredients Section */}
                    <section>
                        <h3 className="text-lg font-bold text-brand-brown mb-3 border-b pb-1">Material Requirements (Fillings)</h3>
                        
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flavor</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mini Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Full Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (lbs/20 mini)</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-brand-orange uppercase tracking-wider">Total Required</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {prepData.ingredientRows.map((row) => (
                                        <tr key={row.flavor} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.flavor}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.miniQty}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.fullQty}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                                {row.lbsPer20 > 0 ? row.lbsPer20.toFixed(2) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-brand-orange text-right">
                                                {row.lbsPer20 > 0 ? `${row.totalLbs.toFixed(2)} lbs` : <span className="text-xs text-gray-400 font-normal">Rate undefined</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {prepData.ingredientRows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                                                No orders selected or no ingredients found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-right">
                            *Calculations assume Full-Size uses {settings.prepSettings?.fullSizeMultiplier || 2}x the filling of a Mini.
                        </div>
                    </section>
                </div>
            </div>
            
            {/* Print Styles (Hidden usually, active on print) */}
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
                    header button {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
