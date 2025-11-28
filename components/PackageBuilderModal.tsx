
import React, { useState, useMemo } from 'react';
import { MenuPackage, Flavor } from '../types';
import { XMarkIcon, ChevronDownIcon, ArrowUturnLeftIcon } from './icons/Icons';

interface PackageBuilderModalProps {
    pkg: MenuPackage;
    standardFlavors: Flavor[];
    specialFlavors: Flavor[];
    salsas?: Flavor[];
    onClose: () => void;
    onConfirm: (items: { name: string; quantity: number }[]) => void;
}

export default function PackageBuilderModal({ pkg, standardFlavors, specialFlavors, salsas = [], onClose, onConfirm }: PackageBuilderModalProps) {
    const [builderSelections, setBuilderSelections] = useState<{ [flavorName: string]: number }>({});
    const [salsaSelections, setSalsaSelections] = useState<{ [salsaName: string]: number }>({});
    const [flavorCategory, setFlavorCategory] = useState<'standard' | 'special'>('standard');
    
    // Default increment to 10 if not set to preserve legacy behavior for existing packages,
    // or utilize the configured increment.
    const step = pkg.increment || 1;

    const activeFlavors = flavorCategory === 'standard' ? standardFlavors : specialFlavors;

    // --- Empanada Logic (Counts towards limit) ---
    const updateBuilderSelection = (flavorName: string, change: number) => {
        const currentQty = builderSelections[flavorName] || 0;
        const totalSelected = (Object.values(builderSelections) as number[]).reduce((a, b) => a + b, 0);
        const distinctFlavors = Object.keys(builderSelections).filter(k => builderSelections[k] > 0).length;
        const remaining = pkg.quantity - totalSelected;
        
        let actualChange = change;

        // Logic for adding
        if (change > 0) {
            if (remaining === 0) return; // Full
            
            // Check flavor limit (only if this is a NEW flavor for this selection)
            if (currentQty === 0 && distinctFlavors >= pkg.maxFlavors) return; 

            // Cap change at remaining amount (e.g., if +10 but only 4 left, add 4)
            if (actualChange > remaining) {
                actualChange = remaining;
            }
        }

        // Logic for removing
        if (change < 0) {
            // Don't go below 0
            if (currentQty + change < 0) {
                actualChange = -currentQty;
            }
        }

        if (actualChange === 0) return;

        const newQty = currentQty + actualChange;
        const newSelections = { ...builderSelections, [flavorName]: newQty };
        if (newQty === 0) delete newSelections[flavorName];
        
        setBuilderSelections(newSelections);
    };

    const setBuilderQuantity = (flavorName: string, quantity: number) => {
        const currentQty = builderSelections[flavorName] || 0;
        const totalOthers = (Object.values(builderSelections) as number[]).reduce((a, b) => a + b, 0) - currentQty;
        const distinctFlavors = Object.keys(builderSelections).filter(k => k !== flavorName && builderSelections[k] > 0).length;

        // Rules
        const maxAvailable = pkg.quantity - totalOthers;
        let finalQty = Math.min(quantity, maxAvailable);
        finalQty = Math.max(0, finalQty);

        if (finalQty > 0 && currentQty === 0 && distinctFlavors >= pkg.maxFlavors) {
            return; // New flavor but max distinct reached
        }

        const newSelections = { ...builderSelections, [flavorName]: finalQty };
        if (finalQty === 0) delete newSelections[flavorName];
        setBuilderSelections(newSelections);
    };

    const fillRemaining = (flavorName: string) => {
        const totalSelected = (Object.values(builderSelections) as number[]).reduce((a, b) => a + b, 0);
        const remaining = pkg.quantity - totalSelected;
        if (remaining > 0) {
            updateBuilderSelection(flavorName, remaining);
        }
    };

    // --- Salsa Logic (Independent of limit) ---
    const updateSalsaSelection = (salsaName: string, change: number) => {
        const currentQty = salsaSelections[salsaName] || 0;
        const newQty = Math.max(0, currentQty + change);
        
        const newSelections = { ...salsaSelections, [salsaName]: newQty };
        if (newQty === 0) delete newSelections[salsaName];
        setSalsaSelections(newSelections);
    };

    const handleConfirm = () => {
        const empanadaItems = Object.entries(builderSelections).map(([name, quantity]) => ({ name, quantity: quantity as number }));
        const salsaItems = Object.entries(salsaSelections).map(([name, quantity]) => ({ name, quantity: quantity as number }));
        onConfirm([...empanadaItems, ...salsaItems]);
    };

    const totalSelected = (Object.values(builderSelections) as number[]).reduce((a, b) => a + b, 0);
    const remaining = pkg.quantity - totalSelected;
    
    return (
        <div className="bg-white rounded-xl shadow-lg border border-brand-tan w-full animate-fade-in flex flex-col h-full">
            <header className="p-3 border-b border-gray-200 flex justify-between items-center bg-brand-tan/10 rounded-t-xl flex-shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-brand-brown">Customize {pkg.name}</h3>
                    <p className="text-xs text-gray-500">
                        Pick {pkg.quantity} empanadas (Up to {pkg.maxFlavors} flavors)
                    </p>
                </div>
                <button onClick={onClose} className="text-brand-brown hover:text-brand-orange flex items-center gap-1 text-sm font-medium bg-white border border-brand-tan/50 px-2 py-1 rounded shadow-sm transition-colors">
                    <ArrowUturnLeftIcon className="w-4 h-4" /> Back
                </button>
            </header>
            
            <div className="flex-grow">
                {/* Empanadas Section */}
                <div className="p-3">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                        <h4 className="font-bold text-brand-brown text-sm">Select Flavors</h4>
                        
                        {/* Category Dropdown */}
                        <select 
                            value={flavorCategory} 
                            onChange={(e) => setFlavorCategory(e.target.value as 'standard'|'special')}
                            className="text-xs border-gray-300 rounded-md focus:ring-brand-orange focus:border-brand-orange bg-gray-50 py-1 pl-2 pr-7 font-medium text-gray-700 h-8"
                        >
                            <option value="standard">Standard Flavors</option>
                            <option value="special">Specialty Flavors</option>
                        </select>
                    </div>

                    <div className="space-y-0.5">
                        {activeFlavors.length === 0 && (
                            <p className="text-sm text-gray-400 italic text-center py-4">No flavors available in this category.</p>
                        )}
                        {activeFlavors
                            .filter(f => f.visible)
                            .map(flavor => {
                                const qty = builderSelections[flavor.name] || 0;
                                const distinctSelected = Object.keys(builderSelections).filter(k => builderSelections[k] > 0).length;
                                
                                // Determine if we can add ANY amount of this flavor
                                const canAdd = remaining > 0 && (qty > 0 || distinctSelected < pkg.maxFlavors);

                                return (
                                    <div key={flavor.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex-grow pr-2 min-w-0">
                                            <p className="font-medium text-brand-brown text-sm truncate">
                                                {flavor.name} 
                                                {flavor.isSpecial && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">Special</span>}
                                            </p>
                                            {flavor.description && <p className="text-[10px] text-gray-500 truncate">{flavor.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* Max Button */}
                                            <button
                                                type="button"
                                                onClick={() => fillRemaining(flavor.name)}
                                                disabled={!canAdd}
                                                className="text-[10px] font-bold text-brand-orange hover:text-brand-brown disabled:opacity-30 mr-1 uppercase tracking-wide bg-brand-orange/10 px-1.5 py-0.5 rounded"
                                            >
                                                Max
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => updateBuilderSelection(flavor.name, -step)}
                                                disabled={qty === 0}
                                                className="w-7 h-7 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:bg-gray-200 disabled:opacity-30"
                                            >
                                                -
                                            </button>
                                            
                                            {/* Editable Input */}
                                            <input
                                                type="number"
                                                min="0"
                                                max={pkg.quantity}
                                                value={qty > 0 ? qty : ''}
                                                placeholder="0"
                                                onChange={(e) => setBuilderQuantity(flavor.name, parseInt(e.target.value) || 0)}
                                                className="w-10 h-7 text-center font-bold border-gray-300 rounded p-0 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                            />
                                            
                                            <button 
                                                type="button"
                                                onClick={() => updateBuilderSelection(flavor.name, step)}
                                                disabled={!canAdd}
                                                className="w-7 h-7 rounded-md bg-brand-orange text-white text-sm font-bold flex items-center justify-center hover:bg-brand-orange/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                        })}
                    </div>
                </div>

                {/* Salsas Section */}
                {salsas.length > 0 && (
                    <div className="p-3 bg-orange-50/50 border-t border-orange-100">
                        <h4 className="font-bold text-brand-brown mb-1 text-sm">Add Dipping Sauces</h4>
                        <div className="space-y-0.5">
                            {salsas.map(salsa => {
                                const qty = salsaSelections[salsa.name] || 0;
                                // @ts-ignore - Handle legacy objects where price might be surcharge, default to 0 to prevent crash
                                const price = (typeof salsa.price === 'number' ? salsa.price : (salsa.surcharge || 0)) || 0;

                                return (
                                    <div key={salsa.name} className="flex items-center justify-between py-1.5 border-b border-orange-100 last:border-0 hover:bg-orange-50/50 transition-colors">
                                        <div className="flex-grow pr-2">
                                            <p className="font-medium text-brand-brown text-sm">{salsa.name}</p>
                                            <p className="text-[10px] text-brand-orange font-bold">+ ${price.toFixed(2)} ea</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => updateSalsaSelection(salsa.name, -1)}
                                                disabled={qty === 0}
                                                className="w-7 h-7 rounded-md bg-white border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                            <button 
                                                type="button"
                                                onClick={() => updateSalsaSelection(salsa.name, 1)}
                                                className="w-7 h-7 rounded-md bg-white border border-gray-300 text-brand-orange text-sm font-bold flex items-center justify-center hover:bg-orange-50"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <footer className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">
                        Remaining: <span className="font-bold text-brand-brown">{remaining}</span>
                    </span>
                    <span className={`font-bold text-sm ${totalSelected === pkg.quantity ? 'text-green-600' : 'text-brand-orange'}`}>
                        Selected: {totalSelected} / {pkg.quantity}
                    </span>
                </div>
                <button 
                    onClick={handleConfirm}
                    disabled={totalSelected !== pkg.quantity}
                    className="w-full bg-brand-orange text-white font-bold py-2.5 rounded-lg shadow-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2 text-sm"
                >
                    <span>Add to Order</span>
                </button>
            </footer>
        </div>
    );
}
