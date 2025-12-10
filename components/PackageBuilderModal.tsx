
import React, { useState, useMemo } from 'react';
import { MenuPackage, Flavor } from '../types';
import { XMarkIcon, ChevronDownIcon, ArrowUturnLeftIcon, CheckCircleIcon } from './icons/Icons';

interface PackageBuilderModalProps {
    pkg: MenuPackage;
    standardFlavors: Flavor[];
    specialFlavors: Flavor[];
    salsas?: Flavor[];
    onClose: () => void;
    onConfirm: (items: { name: string; quantity: number }[]) => void;
    className?: string;
    scrollable?: boolean; // Control internal scrolling
}

export default function PackageBuilderModal({ 
    pkg, 
    standardFlavors, 
    specialFlavors, 
    salsas = [], 
    onClose, 
    onConfirm, 
    className = "h-auto",
    scrollable = false 
}: PackageBuilderModalProps) {
    const [builderSelections, setBuilderSelections] = useState<{ [flavorName: string]: number }>({});
    const [salsaSelections, setSalsaSelections] = useState<{ [salsaName: string]: number }>({});
    const [flavorCategory, setFlavorCategory] = useState<'standard' | 'special'>('standard');
    
    // Ensure numbers
    const packageQty = Number(pkg.quantity);
    const maxFlavors = Number(pkg.maxFlavors);
    const step = Number(pkg.increment) || 1;

    const activeFlavors = flavorCategory === 'standard' ? standardFlavors : specialFlavors;

    const totalSelected = (Object.values(builderSelections) as number[]).reduce((a, b) => a + b, 0);
    const remaining = packageQty - totalSelected;

    // --- Empanada Logic (Counts towards limit) ---
    const updateBuilderSelection = (flavor: Flavor, change: number) => {
        const flavorName = flavor.name;
        const currentQty = builderSelections[flavorName] || 0;
        const distinctFlavors = Object.keys(builderSelections).filter(k => builderSelections[k] > 0).length;
        
        let actualChange = change;
        const minQty = flavor.minimumQuantity || 0;

        // Logic for adding
        if (change > 0) {
            if (remaining <= 0) return; // Full
            
            // Logic to enforce minimum quantity on first add
            if (currentQty === 0 && minQty > 0) {
                // If adding from 0, must jump to minQty
                actualChange = minQty;
            }

            // Cap change at remaining amount
            if (actualChange > remaining) {
                actualChange = remaining;
            }
            
            // Validating limits BEFORE state update
            // 1. If starting from 0, check flavor slots and if we can fit minQty
            if (currentQty === 0) {
                if (distinctFlavors >= maxFlavors) return; // No flavor slots
                if (minQty > 0 && actualChange < minQty) return; // Can't fit min
            }
        }

        // Logic for removing
        if (change < 0) {
            // Check minimum boundary. If reducing goes below min, drop to 0.
            if (currentQty + change < minQty && minQty > 0) {
                actualChange = -currentQty; // Reset to 0
            } else if (currentQty + change < 0) {
                actualChange = -currentQty;
            }
        }

        if (actualChange === 0) return;

        const newQty = currentQty + actualChange;
        const newSelections = { ...builderSelections, [flavorName]: newQty };
        if (newQty === 0) delete newSelections[flavorName];
        
        setBuilderSelections(newSelections);
    };

    const setBuilderQuantity = (flavor: Flavor, quantity: number) => {
        const flavorName = flavor.name;
        const currentQty = builderSelections[flavorName] || 0;
        const totalOthers = totalSelected - currentQty;
        const distinctFlavors = Object.keys(builderSelections).filter(k => k !== flavorName && builderSelections[k] > 0).length;
        const minQty = flavor.minimumQuantity || 0;

        // Rules
        const maxAvailable = packageQty - totalOthers;
        let finalQty = Math.min(quantity, maxAvailable);
        finalQty = Math.max(0, finalQty);

        if (finalQty > 0 && currentQty === 0 && distinctFlavors >= maxFlavors) {
            return; // New flavor but max distinct reached
        }
        
        // Enforce Min Qty logic only if user isn't clearing it (0 is always allowed)
        if (finalQty > 0 && finalQty < minQty) {
            finalQty = minQty;
            if (finalQty > maxAvailable) finalQty = 0; // Can't fit min
        }

        const newSelections = { ...builderSelections, [flavorName]: finalQty };
        if (finalQty === 0) delete newSelections[flavorName];
        setBuilderSelections(newSelections);
    };

    const fillRemaining = (flavor: Flavor) => {
        const flavorName = flavor.name;
        const currentQty = builderSelections[flavorName] || 0;
        const minQty = flavor.minimumQuantity || 0;

        if (remaining > 0) {
            // Check if adding remaining satisfies minQty condition if current is 0
            if (currentQty === 0 && minQty > 0 && remaining < minQty) {
                return; // Can't fill
            }
            
            const newQty = currentQty + remaining;
            const newSelections = { ...builderSelections, [flavorName]: newQty };
            setBuilderSelections(newSelections);
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
    
    return (
        <div className={`bg-white rounded-xl shadow-lg border border-brand-tan w-full animate-fade-in flex flex-col ${className}`}>
            <header className="p-3 border-b border-gray-200 flex justify-between items-center bg-brand-tan/10 rounded-t-xl flex-shrink-0">
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-brand-brown">Customize {pkg.name}</h3>
                    <p className="text-xs text-gray-500">
                        {remaining === 0 
                            ? <span className="text-green-600 font-bold">Package Full!</span>
                            : <span>Remaining: <span className="font-bold text-brand-orange text-sm">{remaining}</span></span>
                        }
                        <span className="mx-1">•</span> Up to {maxFlavors} flavors
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Top "Add" Button for easy access */}
                    <button 
                        onClick={handleConfirm}
                        disabled={totalSelected !== packageQty}
                        className="bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                    >
                        <CheckCircleIcon className="w-4 h-4" /> Add
                    </button>
                    <button onClick={onClose} className="text-brand-brown hover:text-brand-orange flex items-center gap-1 text-xs font-medium bg-white border border-brand-tan/50 px-2 py-1.5 rounded shadow-sm transition-colors">
                        <ArrowUturnLeftIcon className="w-4 h-4" /> Back
                    </button>
                </div>
            </header>
            
            {/* If scrollable is true, we apply overflow-y-auto. If false (inline), we let it expand naturally. */}
            <div className={`flex-grow ${scrollable ? 'overflow-y-auto' : ''}`}>
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

                    <div className="space-y-0.5 pb-2">
                        {activeFlavors.length === 0 && (
                            <p className="text-sm text-gray-400 italic text-center py-4">No flavors available in this category.</p>
                        )}
                        {activeFlavors
                            .filter(f => f.visible)
                            .map(flavor => {
                                const qty = builderSelections[flavor.name] || 0;
                                const distinctSelected = Object.keys(builderSelections).filter(k => builderSelections[k] > 0).length;
                                const minQty = flavor.minimumQuantity || 0;
                                
                                // Logic for enabling Add (+) Button
                                let canAdd = false;
                                
                                if (qty > 0) {
                                    // CRITICAL FIX: If we already have this flavor, we can ALWAYS add more as long as there is ANY space left.
                                    // We ignore 'step' size check here because the update handler will automatically cap the addition to 'remaining'.
                                    // This prevents the button from disabling when remaining < step (e.g., remaining 10, step 12).
                                    canAdd = remaining > 0; 
                                } else {
                                    // If adding a new flavor:
                                    // 1. Must have a flavor slot available
                                    // 2. Must have enough remaining space to meet the minimum quantity (or step if minQty is 0)
                                    const required = minQty > 0 ? minQty : step;
                                    canAdd = remaining >= required && distinctSelected < maxFlavors;
                                }

                                // Logic for enabling MAX Button
                                // Similar to above, but specific to filling all remaining space
                                let canMax = false;
                                if (remaining > 0) {
                                    if (qty > 0) {
                                        canMax = true;
                                    } else {
                                        // New flavor: must meet minQty AND flavor slot
                                        if (remaining >= minQty && distinctSelected < maxFlavors) {
                                            canMax = true;
                                        }
                                    }
                                }

                                return (
                                    <div key={flavor.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <div className="flex-grow pr-2 min-w-0" onClick={() => canAdd && updateBuilderSelection(flavor, step)}>
                                            <p className="font-medium text-brand-brown text-sm whitespace-normal break-words leading-snug">
                                                {flavor.name} 
                                                {flavor.isSpecial && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">Special</span>}
                                                {minQty > 1 && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">Min {minQty}</span>}
                                                {flavor.surcharge ? <span className="ml-1 text-[10px] text-brand-orange font-bold uppercase tracking-wider">+ Extra Fee</span> : null}
                                            </p>
                                            {flavor.description && <p className="text-[10px] text-gray-500 whitespace-normal break-words leading-tight mt-0.5">{flavor.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* Max Button */}
                                            <button
                                                type="button"
                                                onClick={() => fillRemaining(flavor)}
                                                disabled={!canMax}
                                                className="text-[10px] font-bold text-brand-orange hover:text-brand-brown disabled:opacity-30 mr-1 uppercase tracking-wide bg-brand-orange/10 px-2 py-1 rounded"
                                            >
                                                MAX
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => updateBuilderSelection(flavor, -step)}
                                                disabled={qty === 0}
                                                className="w-8 h-8 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-lg font-bold flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 touch-manipulation"
                                            >
                                                -
                                            </button>
                                            
                                            {/* Editable Input */}
                                            <input
                                                type="number"
                                                min="0"
                                                max={packageQty}
                                                value={qty > 0 ? qty : ''}
                                                placeholder="0"
                                                onChange={(e) => setBuilderQuantity(flavor, parseInt(e.target.value) || 0)}
                                                className="w-10 h-8 text-center font-bold border-gray-300 rounded p-0 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                            />
                                            
                                            <button 
                                                type="button"
                                                onClick={() => updateBuilderSelection(flavor, step)}
                                                disabled={!canAdd}
                                                className="w-8 h-8 rounded-md bg-brand-orange text-white text-lg font-bold flex items-center justify-center hover:bg-brand-orange/90 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
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
                {salsas.length > 0 && !pkg.isPartyPlatter && (
                    <div className="p-3 bg-orange-50/50 border-t border-orange-100 mb-20">
                        <h4 className="font-bold text-brand-brown mb-1 text-sm">Add Dipping Sauces</h4>
                        <div className="space-y-0.5">
                            {salsas.map(salsa => {
                                const qty = salsaSelections[salsa.name] || 0;
                                // @ts-ignore - Handle legacy objects where price might be surcharge, default to 0 to prevent crash
                                const price = (typeof salsa.price === 'number' ? salsa.price : (salsa.surcharge || 0)) || 0;

                                return (
                                    <div key={salsa.name} className="flex items-center justify-between py-2 border-b border-orange-100 last:border-0 hover:bg-orange-50/50 transition-colors">
                                        <div className="flex-grow pr-2">
                                            <p className="font-medium text-brand-brown text-sm">{salsa.name}</p>
                                            <p className="text-[10px] text-brand-orange font-bold">+ ${price.toFixed(2)} ea</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => updateSalsaSelection(salsa.name, -1)}
                                                disabled={qty === 0}
                                                className="w-8 h-8 rounded-md bg-white border border-gray-300 text-gray-600 text-lg font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                            <button 
                                                type="button"
                                                onClick={() => updateSalsaSelection(salsa.name, 1)}
                                                className="w-8 h-8 rounded-md bg-white border border-gray-300 text-brand-orange text-lg font-bold flex items-center justify-center hover:bg-orange-50 touch-manipulation"
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

            {/* Footer - Only sticky if scrollable (modal mode). Otherwise static (inline/iframe mode) to prevent loop. */}
            <footer className={`p-3 border-t border-gray-200 bg-white rounded-b-xl flex-shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] ${scrollable ? 'sticky bottom-0' : 'mt-auto'}`}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">
                        Remaining: <span className="font-bold text-brand-brown">{remaining}</span>
                    </span>
                    <span className={`font-bold text-sm ${totalSelected === packageQty ? 'text-green-600' : 'text-brand-orange'}`}>
                        Selected: {totalSelected} / {packageQty}
                    </span>
                </div>
                <button 
                    onClick={handleConfirm}
                    disabled={totalSelected !== packageQty}
                    className="w-full bg-brand-orange text-white font-bold py-3 rounded-lg shadow-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2 text-base touch-manipulation"
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Add to Order</span>
                </button>
            </footer>
        </div>
    );
}
