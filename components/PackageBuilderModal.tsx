
import React, { useState } from 'react';
import { MenuPackage, Flavor } from '../types';
import { XMarkIcon } from './icons/Icons';

interface PackageBuilderModalProps {
    pkg: MenuPackage;
    flavors: Flavor[];
    salsas?: Flavor[]; // Salsas passed separately to handle logic differently
    onClose: () => void;
    onConfirm: (items: { name: string; quantity: number }[]) => void;
}

export default function PackageBuilderModal({ pkg, flavors, salsas = [], onClose, onConfirm }: PackageBuilderModalProps) {
    const [builderSelections, setBuilderSelections] = useState<{ [flavorName: string]: number }>({});
    const [salsaSelections, setSalsaSelections] = useState<{ [salsaName: string]: number }>({});
    
    // Default increment to 10 if not set to preserve legacy behavior for existing packages,
    // or utilize the configured increment.
    const step = pkg.increment || 10;

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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <header className="p-5 border-b border-gray-200 flex justify-between items-center bg-brand-tan/10 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-brand-brown">Customize {pkg.name}</h3>
                        <p className="text-sm text-gray-500">
                            Pick {pkg.quantity} empanadas (Up to {pkg.maxFlavors} flavors)
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="overflow-y-auto flex-grow">
                    {/* Empanadas Section */}
                    <div className="p-5">
                        <h4 className="font-bold text-brand-brown mb-3 border-b border-gray-200 pb-1">Select Flavors</h4>
                        <div className="space-y-1">
                            {flavors
                                .filter(f => f.visible)
                                .map(flavor => {
                                    const qty = builderSelections[flavor.name] || 0;
                                    const distinctSelected = Object.keys(builderSelections).filter(k => builderSelections[k] > 0).length;
                                    
                                    // Determine if we can add ANY amount of this flavor
                                    const canAdd = remaining > 0 && (qty > 0 || distinctSelected < pkg.maxFlavors);

                                    return (
                                        <div key={flavor.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                            <div className="flex-grow pr-2">
                                                <p className="font-medium text-brand-brown">{flavor.name}</p>
                                                {flavor.description && <p className="text-xs text-gray-500">{flavor.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Max Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => fillRemaining(flavor.name)}
                                                    disabled={!canAdd}
                                                    className="text-xs font-semibold text-brand-orange hover:text-brand-brown disabled:opacity-30 mr-2 uppercase tracking-wide"
                                                >
                                                    Max
                                                </button>

                                                <button 
                                                    type="button"
                                                    onClick={() => updateBuilderSelection(flavor.name, -step)}
                                                    disabled={qty === 0}
                                                    className="w-10 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-gray-200 disabled:opacity-30"
                                                >
                                                    -{step}
                                                </button>
                                                
                                                {/* Editable Input */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={pkg.quantity}
                                                    value={qty > 0 ? qty : ''}
                                                    placeholder="0"
                                                    onChange={(e) => setBuilderQuantity(flavor.name, parseInt(e.target.value) || 0)}
                                                    className="w-14 text-center font-bold border-gray-200 rounded p-1 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                                />
                                                
                                                <button 
                                                    type="button"
                                                    onClick={() => updateBuilderSelection(flavor.name, step)}
                                                    disabled={!canAdd}
                                                    className="w-10 h-8 rounded-lg bg-brand-orange text-white text-xs font-bold flex items-center justify-center hover:bg-brand-orange/90 disabled:bg-gray-300"
                                                >
                                                    +{step}
                                                </button>
                                            </div>
                                        </div>
                                    );
                            })}
                        </div>
                    </div>

                    {/* Salsas Section */}
                    {salsas.length > 0 && (
                        <div className="p-5 bg-orange-50/50 border-t border-orange-100">
                            <h4 className="font-bold text-brand-brown mb-1">Add Dipping Sauces</h4>
                            <p className="text-xs text-gray-500 mb-3">These are extras and do not count towards your package limit.</p>
                            <div className="space-y-1">
                                {salsas.map(salsa => {
                                    const qty = salsaSelections[salsa.name] || 0;
                                    // @ts-ignore - Handle legacy objects where price might be surcharge, default to 0 to prevent crash
                                    const price = (typeof salsa.price === 'number' ? salsa.price : (salsa.surcharge || 0)) || 0;

                                    return (
                                        <div key={salsa.name} className="flex items-center justify-between py-2 border-b border-orange-100 last:border-0">
                                            <div className="flex-grow pr-2">
                                                <p className="font-medium text-brand-brown text-sm">{salsa.name}</p>
                                                <p className="text-xs text-brand-orange font-bold">+ ${price.toFixed(2)} ea</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button 
                                                    type="button"
                                                    onClick={() => updateSalsaSelection(salsa.name, -1)}
                                                    disabled={qty === 0}
                                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => updateSalsaSelection(salsa.name, 1)}
                                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-brand-orange text-xs font-bold flex items-center justify-center hover:bg-orange-50"
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

                <footer className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-gray-600">
                            Remaining: <span className="font-bold text-brand-brown">{remaining}</span>
                        </span>
                        <span className={`font-bold text-lg ${totalSelected === pkg.quantity ? 'text-green-600' : 'text-brand-orange'}`}>
                            Selected: {totalSelected} / {pkg.quantity}
                        </span>
                    </div>
                    <button 
                        onClick={handleConfirm}
                        disabled={totalSelected !== pkg.quantity}
                        className="w-full bg-brand-orange text-white font-bold py-3 rounded-lg shadow-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
                    >
                        <span>Add to Order</span>
                    </button>
                </footer>
            </div>
        </div>
    );
}
