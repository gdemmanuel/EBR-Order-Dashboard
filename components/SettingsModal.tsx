
import React, { useState } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, PricingTier } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon } from './icons/Icons';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing'>('menu');
    const [empanadaFlavors, setEmpanadaFlavors] = useState(settings.empanadaFlavors);
    const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState(settings.fullSizeEmpanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing || {
        mini: { basePrice: 1.75, tiers: [] },
        full: { basePrice: 3.00, tiers: [] },
        salsaSmall: 2.00,
        salsaLarge: 4.00
    });
    
    const [newMiniFlavor, setNewMiniFlavor] = useState('');
    const [newFullFlavor, setNewFullFlavor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const addFlavor = (type: 'mini' | 'full') => {
        if (type === 'mini' && newMiniFlavor.trim()) {
            setEmpanadaFlavors([...empanadaFlavors, newMiniFlavor.trim()]);
            setNewMiniFlavor('');
        } else if (type === 'full' && newFullFlavor.trim()) {
            setFullSizeEmpanadaFlavors([...fullSizeEmpanadaFlavors, newFullFlavor.trim()]);
            setNewFullFlavor('');
        }
    };

    const removeFlavor = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') {
            setEmpanadaFlavors(empanadaFlavors.filter((_, i) => i !== index));
        } else {
            setFullSizeEmpanadaFlavors(fullSizeEmpanadaFlavors.filter((_, i) => i !== index));
        }
    };

    const addTier = (type: 'mini' | 'full') => {
        const newTier: PricingTier = { quantity: 12, price: 0 };
        setPricing({
            ...pricing,
            [type]: {
                ...pricing[type],
                tiers: [...pricing[type].tiers, newTier]
            }
        });
    };

    const updateTier = (type: 'mini' | 'full', index: number, field: keyof PricingTier, value: number) => {
        const newTiers = [...pricing[type].tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setPricing({
            ...pricing,
            [type]: { ...pricing[type], tiers: newTiers }
        });
    };

    const removeTier = (type: 'mini' | 'full', index: number) => {
        setPricing({
            ...pricing,
            [type]: {
                ...pricing[type],
                tiers: pricing[type].tiers.filter((_, i) => i !== index)
            }
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
                                <ul className="space-y-2 max-h-64 overflow-y-auto">
                                    {empanadaFlavors.map((flavor, idx) => (
                                        <li key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                            <span>{flavor}</span>
                                            <button onClick={() => removeFlavor('mini', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                        </li>
                                    ))}
                                </ul>
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
                                <ul className="space-y-2 max-h-64 overflow-y-auto">
                                    {fullSizeEmpanadaFlavors.map((flavor, idx) => (
                                        <li key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                            <span>{flavor}</span>
                                            <button onClick={() => removeFlavor('full', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Mini Pricing */}
                                <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                    <h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Mini Empanadas Pricing</h3>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (Single Item)</label>
                                        <div className="relative rounded-md shadow-sm max-w-[150px]">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input 
                                                type="number" step="0.01"
                                                value={pricing.mini.basePrice}
                                                onChange={(e) => setPricing({...pricing, mini: {...pricing.mini, basePrice: parseFloat(e.target.value) || 0}})}
                                                className="block w-full rounded-md border-gray-300 pl-7 pr-3 focus:border-brand-orange focus:ring-brand-orange sm:text-sm" 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Package Deals (Quantity Tiers)</label>
                                            <button onClick={() => addTier('mini')} className="text-xs text-brand-orange hover:underline flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Add Deal</button>
                                        </div>
                                        <div className="space-y-2">
                                            {pricing.mini.tiers.map((tier, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                                                    <span className="text-sm text-gray-600">Buy</span>
                                                    <input type="number" value={tier.quantity} onChange={(e) => updateTier('mini', idx, 'quantity', parseInt(e.target.value))} className="w-16 h-8 text-sm rounded border-gray-300" />
                                                    <span className="text-sm text-gray-600">for</span>
                                                    <div className="relative w-20">
                                                        <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                                                        <input type="number" value={tier.price} onChange={(e) => updateTier('mini', idx, 'price', parseFloat(e.target.value))} className="w-full h-8 text-sm pl-5 rounded border-gray-300" />
                                                    </div>
                                                    <button onClick={() => removeTier('mini', idx)} className="text-red-400 hover:text-red-600 ml-auto"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            {pricing.mini.tiers.length === 0 && <p className="text-xs text-gray-400 italic">No package deals set.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Full Pricing */}
                                <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                    <h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Full-Size Empanadas Pricing</h3>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (Single Item)</label>
                                        <div className="relative rounded-md shadow-sm max-w-[150px]">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                            <input 
                                                type="number" step="0.01"
                                                value={pricing.full.basePrice}
                                                onChange={(e) => setPricing({...pricing, full: {...pricing.full, basePrice: parseFloat(e.target.value) || 0}})}
                                                className="block w-full rounded-md border-gray-300 pl-7 pr-3 focus:border-brand-orange focus:ring-brand-orange sm:text-sm" 
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Package Deals (Quantity Tiers)</label>
                                            <button onClick={() => addTier('full')} className="text-xs text-brand-orange hover:underline flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Add Deal</button>
                                        </div>
                                        <div className="space-y-2">
                                            {pricing.full.tiers.map((tier, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                                                    <span className="text-sm text-gray-600">Buy</span>
                                                    <input type="number" value={tier.quantity} onChange={(e) => updateTier('full', idx, 'quantity', parseInt(e.target.value))} className="w-16 h-8 text-sm rounded border-gray-300" />
                                                    <span className="text-sm text-gray-600">for</span>
                                                    <div className="relative w-20">
                                                        <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                                                        <input type="number" value={tier.price} onChange={(e) => updateTier('full', idx, 'price', parseFloat(e.target.value))} className="w-full h-8 text-sm pl-5 rounded border-gray-300" />
                                                    </div>
                                                    <button onClick={() => removeTier('full', idx)} className="text-red-400 hover:text-red-600 ml-auto"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                             {pricing.full.tiers.length === 0 && <p className="text-xs text-gray-400 italic">No package deals set.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Salsa Pricing */}
                                <div className="md:col-span-2 bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
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
