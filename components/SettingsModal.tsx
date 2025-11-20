
import React, { useState } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon } from './icons/Icons';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing' | 'prep' | 'costs'>('menu');
    
    // Local state for editing
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [fullSizeEmpanadaFlavors, setFullSizeEmpanadaFlavors] = useState<Flavor[]>(settings.fullSizeEmpanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    
    // Prep Settings State
    const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>(settings.prepSettings || { 
        lbsPer20: {}, 
        fullSizeMultiplier: 2.0,
        discosPer: { mini: 1, full: 1 },
        discoPackSize: { mini: 10, full: 10 },
        productionRates: { mini: 40, full: 25 }
    });
    
    // Cost Settings State
    const [laborWage, setLaborWage] = useState<number>(settings.laborWage || 15.00);
    const [materialCosts, setMaterialCosts] = useState<Record<string, number>>(settings.materialCosts || {});
    const [discoCosts, setDiscoCosts] = useState<{mini: number, full: number}>(settings.discoCosts || {mini: 0.1, full: 0.15});

    const [newMiniFlavor, setNewMiniFlavor] = useState('');
    const [newFullFlavor, setNewFullFlavor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Package Form State (Used for both Add and Edit)
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({
        itemType: 'mini',
        quantity: 12,
        price: 20,
        maxFlavors: 4,
        increment: 1,
        visible: true,
        isSpecial: false,
        name: ''
    });
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

    // Salsa Form State
    const [newSalsaName, setNewSalsaName] = useState('');
    const [newSalsaPrice, setNewSalsaPrice] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        await updateSettingsInDb({
            empanadaFlavors,
            fullSizeEmpanadaFlavors,
            pricing,
            prepSettings,
            laborWage,
            materialCosts,
            discoCosts
        });
        setIsSaving(false);
        onClose();
    };

    // --- Menu Management Logic ---
    const addFlavor = (type: 'mini' | 'full') => {
        if (type === 'mini' && newMiniFlavor.trim()) {
            setEmpanadaFlavors([...empanadaFlavors, { name: newMiniFlavor.trim(), visible: true, isSpecial: false }]);
            setNewMiniFlavor('');
        } else if (type === 'full' && newFullFlavor.trim()) {
            setFullSizeEmpanadaFlavors([...fullSizeEmpanadaFlavors, { name: newFullFlavor.trim(), visible: true, isSpecial: false }]);
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

    const toggleFlavorSpecial = (type: 'mini' | 'full', index: number) => {
        if (type === 'mini') {
            const updated = [...empanadaFlavors];
            updated[index].isSpecial = !updated[index].isSpecial;
            setEmpanadaFlavors(updated);
        } else {
            const updated = [...fullSizeEmpanadaFlavors];
            updated[index].isSpecial = !updated[index].isSpecial;
            setFullSizeEmpanadaFlavors(updated);
        }
    };
    
    const updateFlavorDescription = (type: 'mini' | 'full', index: number, desc: string) => {
        if (type === 'mini') {
            const updated = [...empanadaFlavors];
            updated[index].description = desc;
            setEmpanadaFlavors(updated);
        } else {
            const updated = [...fullSizeEmpanadaFlavors];
            updated[index].description = desc;
            setFullSizeEmpanadaFlavors(updated);
        }
    };

    const updateFlavorSurcharge = (type: 'mini' | 'full', index: number, val: string) => {
        const num = parseFloat(val);
        const surcharge = isNaN(num) ? undefined : num;
        if (type === 'mini') {
            const updated = [...empanadaFlavors];
            updated[index].surcharge = surcharge;
            setEmpanadaFlavors(updated);
        } else {
            const updated = [...fullSizeEmpanadaFlavors];
            updated[index].surcharge = surcharge;
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
    const handleAddOrUpdatePackage = () => {
        if (!packageForm.name || !packageForm.price || !packageForm.quantity) return;
        
        const pkg: MenuPackage = {
            id: editingPackageId || Date.now().toString(),
            name: packageForm.name,
            itemType: packageForm.itemType as 'mini' | 'full',
            quantity: Number(packageForm.quantity),
            price: Number(packageForm.price),
            maxFlavors: Number(packageForm.maxFlavors) || Number(packageForm.quantity),
            increment: Number(packageForm.increment) || 1,
            visible: packageForm.visible ?? true,
            isSpecial: packageForm.isSpecial ?? false
        };

        let updatedPackages = pricing.packages || [];
        if (editingPackageId) {
            updatedPackages = updatedPackages.map(p => p.id === editingPackageId ? pkg : p);
        } else {
            updatedPackages = [...updatedPackages, pkg];
        }

        setPricing({
            ...pricing,
            packages: updatedPackages
        });
        
        // Reset form
        setPackageForm({
            itemType: 'mini',
            quantity: 12,
            price: 20,
            maxFlavors: 4,
            increment: 1,
            visible: true,
            isSpecial: false,
            name: ''
        });
        setEditingPackageId(null);
    };

    const handleEditPackageClick = (pkg: MenuPackage) => {
        setPackageForm({ ...pkg, increment: pkg.increment || 10 }); 
        setEditingPackageId(pkg.id);
    };

    const removePackage = (id: string) => {
        setPricing({
            ...pricing,
            packages: pricing.packages.filter(p => p.id !== id)
        });
        if (editingPackageId === id) {
            setEditingPackageId(null);
            setPackageForm({
                itemType: 'mini',
                quantity: 12,
                price: 20,
                maxFlavors: 4,
                increment: 1,
                visible: true,
                isSpecial: false,
                name: ''
            });
        }
    };
    
    const togglePackageVisibility = (id: string) => {
        setPricing({
            ...pricing,
            packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)
        });
    };

    // --- Salsa Management Logic ---
    const addSalsa = () => {
        if (!newSalsaName || !newSalsaPrice) return;
        const newSalsa: SalsaProduct = {
            id: `salsa-${Date.now()}`,
            name: newSalsaName,
            price: parseFloat(newSalsaPrice) || 0,
            visible: true
        };
        setPricing({
            ...pricing,
            salsas: [...(pricing.salsas || []), newSalsa]
        });
        setNewSalsaName('');
        setNewSalsaPrice('');
    };

    const removeSalsa = (id: string) => {
        setPricing({
            ...pricing,
            salsas: pricing.salsas.filter(s => s.id !== id)
        });
    };

    const toggleSalsaVisibility = (id: string) => {
        setPricing({
            ...pricing,
            salsas: pricing.salsas.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
        });
    };

    // --- Prep Settings Logic ---
    const updateLbsPer20 = (flavorName: string, value: string) => {
        const numVal = parseFloat(value);
        setPrepSettings({
            ...prepSettings,
            lbsPer20: {
                ...prepSettings.lbsPer20,
                [flavorName]: isNaN(numVal) ? 0 : numVal
            }
        });
    };
    
    // --- Cost Logic ---
    const updateMaterialCost = (flavorName: string, value: string) => {
        const numVal = parseFloat(value);
        setMaterialCosts({
            ...materialCosts,
            [flavorName]: isNaN(numVal) ? 0 : numVal
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

                <div className="flex flex-wrap border-b border-gray-200">
                    <button
                        className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'menu' ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('menu')}
                    >
                        Menu Management
                    </button>
                    <button
                        className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'pricing' ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('pricing')}
                    >
                        Pricing & Packages
                    </button>
                    <button
                        className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'prep' ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('prep')}
                    >
                        Prep Calculations
                    </button>
                    <button
                        className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'costs' ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('costs')}
                    >
                        Inventory & Costs
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
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {empanadaFlavors.map((flavor, idx) => (
                                        <div key={idx} className="bg-white p-2 rounded shadow-sm text-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={flavor.visible} 
                                                            onChange={() => toggleFlavorVisibility('mini', idx)}
                                                            className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"
                                                            title="Visible on customer menu"
                                                        />
                                                        <label className="text-xs text-gray-500">Visible</label>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={flavor.isSpecial || false} 
                                                            onChange={() => toggleFlavorSpecial('mini', idx)}
                                                            className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4"
                                                            title="Mark as Special Item/Platter Item"
                                                        />
                                                        <label className="text-xs text-purple-600 font-medium">Special?</label>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeFlavor('mini', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                            
                                            <div className="mb-2">
                                                <span className={`font-medium block ${!flavor.visible ? 'text-gray-400 line-through' : ''}`}>{flavor.name}</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Description (optional)"
                                                    value={flavor.description || ''}
                                                    onChange={(e) => updateFlavorDescription('mini', idx, e.target.value)}
                                                    className="flex-grow text-xs border-gray-200 rounded focus:ring-brand-orange focus:border-brand-orange"
                                                />
                                                <div className="w-20 relative">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5"><span className="text-gray-400 text-xs">+ $</span></div>
                                                    <input 
                                                        type="number" 
                                                        step="0.05"
                                                        placeholder="Extra"
                                                        value={flavor.surcharge || ''}
                                                        onChange={(e) => updateFlavorSurcharge('mini', idx, e.target.value)}
                                                        className="w-full text-xs border-gray-200 rounded pl-6 focus:ring-brand-orange focus:border-brand-orange"
                                                        title="Additional cost per unit"
                                                    />
                                                </div>
                                            </div>
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
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {fullSizeEmpanadaFlavors.map((flavor, idx) => (
                                        <div key={idx} className="bg-white p-2 rounded shadow-sm text-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={flavor.visible} 
                                                            onChange={() => toggleFlavorVisibility('full', idx)}
                                                            className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"
                                                            title="Visible on customer menu"
                                                        />
                                                        <label className="text-xs text-gray-500">Visible</label>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={flavor.isSpecial || false} 
                                                            onChange={() => toggleFlavorSpecial('full', idx)}
                                                            className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4"
                                                            title="Mark as Special Item/Platter Item"
                                                        />
                                                        <label className="text-xs text-purple-600 font-medium">Special?</label>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeFlavor('full', idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>

                                            <div className="mb-2">
                                                 <span className={`font-medium block ${!flavor.visible ? 'text-gray-400 line-through' : ''}`}>{flavor.name}</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Description (optional)"
                                                    value={flavor.description || ''}
                                                    onChange={(e) => updateFlavorDescription('full', idx, e.target.value)}
                                                    className="flex-grow text-xs border-gray-200 rounded focus:ring-brand-orange focus:border-brand-orange"
                                                />
                                                <div className="w-20 relative">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5"><span className="text-gray-400 text-xs">+ $</span></div>
                                                    <input 
                                                        type="number" 
                                                        step="0.05"
                                                        placeholder="Extra"
                                                        value={flavor.surcharge || ''}
                                                        onChange={(e) => updateFlavorSurcharge('full', idx, e.target.value)}
                                                        className="w-full text-xs border-gray-200 rounded pl-6 focus:ring-brand-orange focus:border-brand-orange"
                                                        title="Additional cost per unit"
                                                    />
                                                </div>
                                            </div>
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
                                
                                {/* Add/Edit Package Form */}
                                <div className={`grid grid-cols-1 md:grid-cols-8 gap-3 rounded-md mb-6 items-end border p-4 ${editingPackageId ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                        <input type="text" placeholder="e.g. Party Platter" value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                        <select value={packageForm.itemType} onChange={e => setPackageForm({...packageForm, itemType: e.target.value as any})} className="w-full text-sm rounded border-gray-300">
                                            <option value="mini">Mini</option>
                                            <option value="full">Full-Size</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Qty</label>
                                        <input type="number" placeholder="12" value={packageForm.quantity} onChange={e => setPackageForm({...packageForm, quantity: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                        <input type="number" placeholder="20.00" value={packageForm.price} onChange={e => setPackageForm({...packageForm, price: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1" title="How many DIFFERENT flavors can they pick?">Max Flavors</label>
                                        <input type="number" placeholder="3" value={packageForm.maxFlavors} onChange={e => setPackageForm({...packageForm, maxFlavors: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1" title="Minimum per flavor / Step size">Increment</label>
                                        <input type="number" placeholder="1" value={packageForm.increment} onChange={e => setPackageForm({...packageForm, increment: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                     <div className="flex items-center justify-center pb-2">
                                        <div className="flex flex-col items-center">
                                            <label className="block text-xs font-medium text-purple-600 mb-1">Special?</label>
                                            <input 
                                                type="checkbox" 
                                                checked={packageForm.isSpecial || false} 
                                                onChange={e => setPackageForm({...packageForm, isSpecial: e.target.checked})} 
                                                className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4" 
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-8 flex justify-end mt-2 gap-2">
                                        {editingPackageId && (
                                            <button onClick={() => { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); }} className="text-sm text-gray-500 hover:underline mr-2">Cancel Edit</button>
                                        )}
                                        <button onClick={handleAddOrUpdatePackage} className={`flex items-center gap-2 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-opacity-90 ${editingPackageId ? 'bg-amber-600' : 'bg-brand-orange'}`}>
                                            {editingPackageId ? <><CheckCircleIcon className="w-4 h-4"/> Update Package</> : <><PlusIcon className="w-4 h-4" /> Add Package</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Existing Packages List */}
                                <div className="space-y-3">
                                    {pricing.packages?.map((pkg) => (
                                        <div key={pkg.id} className={`flex flex-wrap md:flex-nowrap items-center justify-between bg-white p-3 rounded border shadow-sm gap-4 ${editingPackageId === pkg.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={pkg.visible} 
                                                    onChange={() => togglePackageVisibility(pkg.id)}
                                                    className="rounded text-brand-orange focus:ring-brand-orange"
                                                    title="Visible to customers"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-brand-brown">{pkg.name}</p>
                                                        {pkg.isSpecial && <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SPECIAL</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        {pkg.quantity} {pkg.itemType === 'mini' ? 'Minis' : 'Full-Size'} • Max {pkg.maxFlavors} flavors • Step {pkg.increment || 10}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold text-lg text-brand-orange">${pkg.price.toFixed(2)}</p>
                                                <button onClick={() => handleEditPackageClick(pkg)} className="text-gray-500 hover:text-brand-brown p-1 hover:bg-gray-100 rounded-full" title="Edit Package"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => removePackage(pkg.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-full" title="Delete Package"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!pricing.packages || pricing.packages.length === 0) && <p className="text-center text-gray-500 italic py-4">No packages defined. Customers will rely on base pricing.</p>}
                                </div>
                            </div>

                            {/* Salsa Pricing */}
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Salsa & Extras</h3>
                                <p className="text-sm text-gray-600 mb-4">Add items like Salsa, Guacamole, etc.</p>
                                
                                <div className="flex items-end gap-3 mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                                        <input type="text" placeholder="e.g. Salsa Verde (4oz)" value={newSalsaName} onChange={e => setNewSalsaName(e.target.value)} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                        <input type="number" step="0.01" placeholder="2.00" value={newSalsaPrice} onChange={e => setNewSalsaPrice(e.target.value)} className="w-full text-sm rounded border-gray-300" />
                                    </div>
                                    <button onClick={addSalsa} className="bg-brand-orange text-white px-4 py-2 rounded text-sm font-semibold hover:bg-opacity-90">Add</button>
                                </div>

                                <div className="space-y-2">
                                    {(pricing.salsas || []).map((salsa) => (
                                         <div key={salsa.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                                             <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={salsa.visible} 
                                                    onChange={() => toggleSalsaVisibility(salsa.id)}
                                                    className="rounded text-brand-orange focus:ring-brand-orange"
                                                    title="Visible to customers"
                                                />
                                                <span className="font-medium text-brand-brown">{salsa.name}</span>
                                             </div>
                                             <div className="flex items-center gap-4">
                                                 <span className="font-bold text-brand-orange">${salsa.price.toFixed(2)}</span>
                                                 <button onClick={() => removeSalsa(salsa.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                             </div>
                                         </div>
                                    ))}
                                    {(!pricing.salsas || pricing.salsas.length === 0) && <p className="text-center text-gray-500 italic">No salsas defined.</p>}
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

                    {/* Prep and Costs Tabs remain unchanged */}
                    {activeTab === 'prep' && (
                        <div className="space-y-8">
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <div>
                                        <h3 className="font-bold text-brand-brown text-lg">Prep Configuration</h3>
                                        <p className="text-sm text-gray-600">Define how your empanadas are built to calculate material needs.</p>
                                    </div>
                                    <ScaleIcon className="w-6 h-6 text-brand-orange" />
                                </div>

                                {/* General Prep Settings */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Conversions */}
                                    <div className="space-y-4">
                                         <h4 className="font-bold text-sm text-gray-700 border-b pb-1">Material Ratios</h4>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Full-Size Multiplier</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.1" 
                                                        value={prepSettings.fullSizeMultiplier}
                                                        onChange={(e) => setPrepSettings({...prepSettings, fullSizeMultiplier: parseFloat(e.target.value) || 0})}
                                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Filling multiplier (Full vs Mini).</p>
                                            </div>
                                         </div>
                                         <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Discos per Mini</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    value={prepSettings.discosPer?.mini ?? 1}
                                                    onChange={(e) => setPrepSettings({...prepSettings, discosPer: { ...prepSettings.discosPer, mini: parseFloat(e.target.value) || 0 }})}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Discos per Full</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    value={prepSettings.discosPer?.full ?? 1}
                                                    onChange={(e) => setPrepSettings({...prepSettings, discosPer: { ...prepSettings.discosPer, full: parseFloat(e.target.value) || 0 }})}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                         </div>
                                         <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Units per Pkg (Mini)</label>
                                                <input 
                                                    type="number" step="1" 
                                                    value={prepSettings.discoPackSize?.mini ?? 10}
                                                    onChange={(e) => setPrepSettings({
                                                        ...prepSettings, 
                                                        discoPackSize: { ...prepSettings.discoPackSize, mini: parseInt(e.target.value) || 1 }
                                                    })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Units per Pkg (Full)</label>
                                                <input 
                                                    type="number" step="1" 
                                                    value={prepSettings.discoPackSize?.full ?? 10}
                                                    onChange={(e) => setPrepSettings({
                                                        ...prepSettings, 
                                                        discoPackSize: { ...prepSettings.discoPackSize, full: parseInt(e.target.value) || 1 }
                                                    })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                         </div>
                                    </div>

                                    {/* Production Rates */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-1">Production Speed (Units per Hour)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Mini Empanadas/Hr</label>
                                                <input 
                                                    type="number" step="1" 
                                                    value={prepSettings.productionRates?.mini ?? 40}
                                                    onChange={(e) => setPrepSettings({
                                                        ...prepSettings, 
                                                        productionRates: { ...prepSettings.productionRates, mini: parseInt(e.target.value) || 0 }
                                                    })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Full-Size Empanadas/Hr</label>
                                                <input 
                                                    type="number" step="1" 
                                                    value={prepSettings.productionRates?.full ?? 25}
                                                    onChange={(e) => setPrepSettings({
                                                        ...prepSettings, 
                                                        productionRates: { ...prepSettings.productionRates, full: parseInt(e.target.value) || 0 }
                                                    })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">Used to estimate labor hours required.</p>
                                    </div>
                                </div>

                                <h4 className="font-bold text-brand-brown text-md mb-3 mt-6 pt-4 border-t">Filling Requirements (Lbs per 20 Minis)</h4>
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 flex items-start gap-3">
                                    <div className="bg-blue-100 p-1 rounded-full"><CheckCircleIcon className="w-4 h-4 text-blue-700" /></div>
                                    <div className="text-sm text-blue-800">
                                        <p>If "Beef" requires 0.8 lbs for 20 minis, enter 0.8 below.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {empanadaFlavors.map((flavor) => (
                                        <div key={flavor.name} className="border rounded-md p-3 bg-gray-50">
                                            <label className="block text-xs font-bold text-gray-700 truncate" title={flavor.name}>{flavor.name}</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="0.0"
                                                    value={prepSettings.lbsPer20[flavor.name] || ''}
                                                    onChange={(e) => updateLbsPer20(flavor.name, e.target.value)}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" 
                                                />
                                                <span className="text-xs text-gray-500 whitespace-nowrap">lbs / 20</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'costs' && (
                        <div className="space-y-8">
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <div>
                                        <h3 className="font-bold text-brand-brown text-lg">Costs & Inventory</h3>
                                        <p className="text-sm text-gray-600">Manage supply costs to track profit margins. Inventory counts can be updated here or on the Prep List.</p>
                                    </div>
                                    <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                                </div>
                                
                                {/* Labor & Discos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                        <h4 className="font-bold text-yellow-800 mb-2 text-sm flex items-center gap-2"><ClockIcon className="w-4 h-4"/> Labor Settings</h4>
                                        <div>
                                            <label className="block text-xs text-yellow-800 mb-1">Hourly Wage ($/hr)</label>
                                            <div className="relative rounded-md shadow-sm">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2"><span className="text-gray-500 text-xs">$</span></div>
                                                <input 
                                                    type="number" step="0.50" 
                                                    value={laborWage}
                                                    onChange={(e) => setLaborWage(parseFloat(e.target.value) || 0)}
                                                    className="block w-24 rounded-md border-gray-300 pl-5 text-sm focus:border-yellow-500 focus:ring-yellow-500" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                        <h4 className="font-bold text-green-800 mb-2 text-sm">Discos / Shells (Cost per Unit)</h4>
                                        <div className="flex gap-6">
                                            <div>
                                                <label className="block text-xs text-green-800 mb-1">Mini Cost</label>
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2"><span className="text-gray-500 text-xs">$</span></div>
                                                    <input 
                                                        type="number" step="0.01" 
                                                        value={discoCosts.mini}
                                                        onChange={(e) => setDiscoCosts({...discoCosts, mini: parseFloat(e.target.value) || 0})}
                                                        className="block w-24 rounded-md border-gray-300 pl-5 text-sm focus:border-green-500 focus:ring-green-500" 
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-green-800 mb-1">Full-Size Cost</label>
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2"><span className="text-gray-500 text-xs">$</span></div>
                                                    <input 
                                                        type="number" step="0.01" 
                                                        value={discoCosts.full}
                                                        onChange={(e) => setDiscoCosts({...discoCosts, full: parseFloat(e.target.value) || 0})}
                                                        className="block w-24 rounded-md border-gray-300 pl-5 text-sm focus:border-green-500 focus:ring-green-500" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-700 mb-2 text-sm">Material Costs (Filling per Lb)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {empanadaFlavors.map((flavor) => (
                                        <div key={flavor.name} className="border rounded-md p-3 bg-gray-50 flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-700 truncate w-1/2" title={flavor.name}>{flavor.name}</label>
                                            <div className="relative rounded-md shadow-sm w-24">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2"><span className="text-gray-500 text-xs">$</span></div>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="0.00"
                                                    value={materialCosts[flavor.name] || ''}
                                                    onChange={(e) => updateMaterialCost(flavor.name, e.target.value)}
                                                    className="block w-full rounded-md border-gray-300 pl-5 text-sm focus:border-green-500 focus:ring-green-500" 
                                                />
                                            </div>
                                        </div>
                                    ))}
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
