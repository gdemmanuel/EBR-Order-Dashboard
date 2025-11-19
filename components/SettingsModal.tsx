
import React, { useState } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from './icons/Icons';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing'>('menu');
    
    // Local state for editing
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<Flavor[]>(settings.fullSizeEmpanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    
    const [newMiniFlavor, setNewMiniFlavor] = useState('');
    const [newFullFlavor, setNewFullFlavor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // New Package State
    const [newPackage, setNewPackage] = useState<Partial<MenuPackage>>({
        itemType: 'mini',
        quantity: 12,
        price: 20,
        maxFlavors: 4,
        visible: true,
        name: ''
    });

    const handleSave = async () => {
        setIsSaving(true);
        await updateSettingsInDb({
            empanadaFlavors,
            fullSizeEmpanadaFlavors,
            pricing
        });
        setIsSaving(false);
        onClose();
    };

    // --- Menu Management Logic ---
    const addFlavor = (type: 'mini' | 'full') => {
        if (type === 'mini' && newMiniFlavor.trim()) {
            setEmpanadaFlavors([...empanadaFlavors, { name: newMiniFlavor.trim(), visible: true }]);
            setNewMiniFlavor('');
        } else if (type === 'full' && newFullFlavor.trim()) {
            setFullSizeEmpanadaFlavors([...fullSizeEmpanadaFlavors, { name: newFullFlavor.trim(), visible: true }]);
            setNewFullFlavor('');
        }
    };

    const toggleFlavorVisibility = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') {
            const updated = [...empanadaFlavors];
            updated[index].visible = !updated[index].visible;
            setEmpanadaFlavors(updated);
        } else {
            const updated = [...fullSizeEmpanadaFlavors];
            updated[index].visible = !updated[index].visible;
            setFullSizeEmpanadaFlavors(updated);
        }
    };

    const removeFlavor = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') {
            setEmpanadaFlavors(empanadaFlavors.filter((_, i) => i !== index));
        } else {
            setFullSizeEmpanadaFlavors(fullSizeEmpanadaFlavors.filter((_, i) => i !== index));
        }
    };

    // --- Package Management Logic ---
    const handleAddPackage = () => {
        if (!newPackage.name || !newPackage.price || !newPackage.quantity) return;
        
        const pkg: MenuPackage = {
            id: Date.now().toString(),
            name: newPackage.name,
            itemType: newPackage.itemType as 'mini' | 'full',
            quantity: Number(newPackage.quantity),
            price: Number(newPackage.price),
            maxFlavors: Number(newPackage.maxFlavors) || Number(newPackage.quantity), // Default to quantity if not set
            visible: true
        };

        setPricing({
            ...pricing,
            packages: [...(pricing.packages || []), pkg]
        });
        
        // Reset form
        setNewPackage({
            itemType: 'mini',
            quantity: 12,
            price: 20,
            maxFlavors: 4,
            visible: true,
            name: ''
        });
    };

    const removePackage = (id: string) => {
        setPricing({
            ...pricing,
            packages: pricing.packages.filter(p => p.id !== id)
        });
    };
    
    const togglePackageVisibility = (id: string) => {
        setPricing({
            ...pricing,
            packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-3xl font-serif text-brand-brown">Store Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'menu' ? 'border-b-2 border-brand-orange text-brand-orange' : 'text-gray-500 hover:text-brand-brown'}`}
                        onClick={() => setActiveTab('menu')}
                    >
                        Menu Management
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'pricing' ? 'border-b-2 border-brand-orange text-brand-orange' : 'text-gray-500 hover:text-brand-brown'}`}
                        onClick={() => setActiveTab('pricing')}
                    >
                        Pricing & Packages
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    {activeTab === 'menu' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Mini Flavors */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-brand-brown mb-4">Mini Empanada Flavors</h3>
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        type="text" 
                                        value={newMiniFlavor}
                                        onChange={(e) => setNewMiniFlavor(e.target.value)}
                                        placeholder="New flavor name"
                                        className="flex-grow rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm"
                                    />
                                    <button onClick={() => addFlavor('mini')} className="bg-brand-orange text-white px-3 rounded-md hover:bg-opacity-90"><PlusIcon className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {empanadaFlavors.map((flavor, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={flavor.visible} 
                                                    onChange={() => toggleFlavorVisibility('mini', idx)}
                                                    className="rounded text-brand-orange focus:ring-brand-orange"
                                                    title="Visible on customer menu"
                                                />
                                                <span className={!flavor.visible ? 'text-gray-400 line-through' : ''}>{flavor.name}</span>
                                            </div>
                                            <button onClick={() => removeFlavor('mini', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Full Size Flavors */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-brand-brown mb-4">Full-Size Empanada Flavors</h3>
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        type="text" 
                                        value={newFullFlavor}
                                        onChange={(e) => setNewFullFlavor(e.target.value)}
                                        placeholder="New flavor name"
                                        className="flex-grow rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm"
                                    />
                                    <button onClick={() => addFlavor('full')} className="bg-brand-orange text-white px-3 rounded-md hover:bg-opacity-90"><PlusIcon className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {fullSizeEmpanadaFlavors.map((flavor, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={flavor.visible} 
                                                    onChange={() => toggleFlavorVisibility('full', idx)}
                                                    className="rounded text-brand-orange focus:ring-brand-orange"
                                                    title="Visible on customer menu"
                                                />
                                                <span className={!flavor.visible ? 'text-gray-400 line-through' : ''}>{flavor.name}</span>
                                            </div>
                                            <button onClick={() => removeFlavor('full', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-8">
                            {/* Packages Section */}
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Package Deals</h3>
                                <p className="text-sm text-gray-600 mb-4">Define standard packages for your customers (e.g., "Dozen Minis").</p>
                                
                                {/* New Package Form */}
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-gray-50 p-4 rounded-md mb-6 items-end border border-gray-200">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                        <input type="text" placeholder="e.g. Party Platter" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                        <select value={newPackage.itemType} onChange={e => setNewPackage({...newPackage, itemType: e.target.value as any})} className="w-full text-sm rounded border-gray-300">
                                            <option value="mini">Mini</option>
                                            <option value="full">Full-Size</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                                        <input type="number" placeholder="12" value={newPackage.quantity} onChange={e => setNewPackage({...newPackage, quantity: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                        <input type="number" placeholder="20.00" value={newPackage.price} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1" title="How many DIFFERENT flavors can they pick?">Max Flavors</label>
                                        <input type="number" placeholder="3" value={newPackage.maxFlavors} onChange={e => setNewPackage({...newPackage, maxFlavors: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div className="md:col-span-6 flex justify-end mt-2">
                                        <button onClick={handleAddPackage} className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded text-sm font-semibold hover:bg-opacity-90">
                                            <PlusIcon className="w-4 h-4" /> Add Package
                                        </button>
                                    </div>
                                </div>

                                {/* Existing Packages List */}
                                <div className="space-y-3">
                                    {pricing.packages?.map((pkg) => (
                                        <div key={pkg.id} className="flex flex-wrap md:flex-nowrap items-center justify-between bg-white p-3 rounded border border-gray-200 shadow-sm gap-4">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={pkg.visible} 
                                                    onChange={() => togglePackageVisibility(pkg.id)}
                                                    className="rounded text-brand-orange focus:ring-brand-orange"
                                                    title="Visible to customers"
                                                />
                                                <div>
                                                    <p className="font-bold text-brand-brown">{pkg.name}</p>
                                                    <p className="text-xs text-gray-500">{pkg.quantity} {pkg.itemType === 'mini' ? 'Minis' : 'Full-Size'} • Max {pkg.maxFlavors} flavors</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold text-lg text-brand-orange">${pkg.price.toFixed(2)}</p>
                                                <button onClick={() => removePackage(pkg.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!pricing.packages || pricing.packages.length === 0) && <p className="text-center text-gray-500 italic py-4">No packages defined. Customers will rely on base pricing.</p>}
                                </div>
                            </div>

                            {/* Salsa Pricing */}
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Salsa Pricing</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Small (4oz)</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input 
                                                type="number" step="0.01"
                                                value={pricing.salsaSmall}
                                                onChange={(e) => setPricing({...pricing, salsaSmall: parseFloat(e.target.value) || 0})}
                                                className="block w-full rounded-md border-gray-300 pl-7 pr-3 focus:border-brand-orange focus:ring-brand-orange sm:text-sm" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Large (8oz)</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input 
                                                type="number" step="0.01"
                                                value={pricing.salsaLarge}
                                                onChange={(e) => setPricing({...pricing, salsaLarge: parseFloat(e.target.value) || 0})}
                                                className="block w-full rounded-md border-gray-300 pl-7 pr-3 focus:border-brand-orange focus:ring-brand-orange sm:text-sm" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {/* Legacy/Base Pricing */}
                             <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-600 text-sm mb-4 uppercase tracking-wide">Fallback / Base Pricing (Single Item)</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mini Base Price</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input type="number" step="0.01" value={pricing.mini.basePrice} onChange={(e) => setPricing({...pricing, mini: { basePrice: parseFloat(e.target.value) || 0 }})} className="block w-full rounded-md border-gray-300 pl-7 pr-3 sm:text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full-Size Base Price</label>
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input type="number" step="0.01" value={pricing.full.basePrice} onChange={(e) => setPricing({...pricing, full: { basePrice: parseFloat(e.target.value) || 0 }})} className="block w-full rounded-md border-gray-300 pl-7 pr-3 sm:text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-6 flex justify-end gap-3 border-t border-brand-tan bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-semibold px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-brand-orange text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all disabled:bg-brand-orange/50">
                        {isSaving ? 'Saving...' : <>Save All Changes <CheckCircleIcon className="w-5 h-5" /></>}
                    </button>
                </footer>
            </div>
        </div>
    );
}
