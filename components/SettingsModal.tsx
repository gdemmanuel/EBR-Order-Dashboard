
import React, { useState, useMemo } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing' | 'prep' | 'costs' | 'scheduling'>('menu');
    
    // Local state for editing
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    
    // Prep Settings State
    const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>(settings.prepSettings || { 
        lbsPer20: {}, 
        fullSizeMultiplier: 2.0,
        discosPer: { mini: 1, full: 1 },
        discoPackSize: { mini: 10, full: 10 },
        productionRates: { mini: 40, full: 25 }
    });

    // Scheduling Settings
    const [scheduling, setScheduling] = useState<AppSettings['scheduling']>(settings.scheduling || {
        enabled: true,
        intervalMinutes: 15,
        startTime: "09:00",
        endTime: "17:00",
        blockedDates: [],
        closedDays: [],
        dateOverrides: {}
    });
    
    // Calendar View State
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    
    // Cost Settings State
    const [laborWage, setLaborWage] = useState<number>(settings.laborWage || 15.00);
    const [materialCosts, setMaterialCosts] = useState<Record<string, number>>(settings.materialCosts || {});
    const [discoCosts, setDiscoCosts] = useState<{mini: number, full: number}>(settings.discoCosts || {mini: 0.1, full: 0.15});

    const [newFlavorName, setNewFlavorName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Package Form State
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
        
        const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({
            ...f,
            name: `Full ${f.name}`, 
        }));

        await updateSettingsInDb({
            empanadaFlavors,
            fullSizeEmpanadaFlavors: syncedFullFlavors,
            pricing,
            prepSettings,
            scheduling,
            laborWage,
            materialCosts,
            discoCosts
        });
        setIsSaving(false);
        onClose();
    };

    // ... (Previous logic remains unchanged) ...
    const addFlavor = () => { if (newFlavorName.trim()) { setEmpanadaFlavors([...empanadaFlavors, { name: newFlavorName.trim(), visible: true, isSpecial: false }]); setNewFlavorName(''); } };
    const autoFillDescriptions = () => { setEmpanadaFlavors(empanadaFlavors.map(f => (!f.description ? { ...f, description: SUGGESTED_DESCRIPTIONS[f.name] || undefined } : f))); alert('Descriptions populated! Save to apply.'); };
    const toggleFlavorVisibility = (i: number) => { const u = [...empanadaFlavors]; u[i].visible = !u[i].visible; setEmpanadaFlavors(u); };
    const toggleFlavorSpecial = (i: number) => { const u = [...empanadaFlavors]; u[i].isSpecial = !u[i].isSpecial; setEmpanadaFlavors(u); };
    const updateFlavorDescription = (i: number, d: string) => { const u = [...empanadaFlavors]; u[i].description = d; setEmpanadaFlavors(u); };
    const updateFlavorSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].surcharge = parseFloat(v) || undefined; setEmpanadaFlavors(u); };
    const removeFlavor = (i: number) => { setEmpanadaFlavors(empanadaFlavors.filter((_, idx) => idx !== i)); };

    const handleAddOrUpdatePackage = () => {
        if (!packageForm.name || !packageForm.price || !packageForm.quantity) return;
        const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false };
        let updated = pricing.packages || [];
        updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg];
        setPricing({...pricing, packages: updated});
        setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' });
        setEditingPackageId(null);
    };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 10 }); setEditingPackageId(pkg.id); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const updateLbsPer20 = (f: string, v: string) => { setPrepSettings({...prepSettings, lbsPer20: {...prepSettings.lbsPer20, [f]: parseFloat(v)||0}}); };
    const updateMaterialCost = (f: string, v: string) => { setMaterialCosts({...materialCosts, [f]: parseFloat(v)||0}); };

    // --- Scheduling Logic ---
    const toggleClosedDay = (dayIndex: number) => {
        const current = scheduling.closedDays || [];
        if (current.includes(dayIndex)) {
            setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) });
        } else {
            setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() });
        }
    };

    // Override Logic
    const handleDateClick = (dateStr: string) => {
        setSelectedDate(dateStr);
    };

    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'custom', start?: string, end?: string) => {
        const newOverrides = { ...(scheduling.dateOverrides || {}) };
        
        if (type === 'default') {
            delete newOverrides[dateStr];
        } else if (type === 'closed') {
            newOverrides[dateStr] = { isClosed: true };
        } else if (type === 'custom') {
            newOverrides[dateStr] = { 
                isClosed: false,
                customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime }
            };
        }
        setScheduling({ ...scheduling, dateOverrides: newOverrides });
    };

    // Calendar Generation Logic
    const calendarGrid = useMemo(() => {
        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        
        const cells = [];
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
        
        return cells;
    }, [calendarViewDate]);

    const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));

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
                    {['menu', 'pricing', 'scheduling', 'prep', 'costs'].map((tab) => (
                         <button
                            key={tab}
                            className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab === 'scheduling' ? 'Scheduling' : tab === 'costs' ? 'Inventory & Costs' : tab === 'prep' ? 'Prep' : tab === 'menu' ? 'Menu' : 'Pricing'}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    {activeTab === 'menu' && (
                        <div className="grid grid-cols-1 gap-8">
                             {/* ... Menu Content (unchanged) ... */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-4">
                                    <div><h3 className="font-bold text-brand-brown">Empanada Flavors</h3><p className="text-sm text-gray-500">Manage standard and special flavors.</p></div>
                                    <button onClick={autoFillDescriptions} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"><SparklesIcon className="w-3 h-3" /> Auto-fill Descriptions</button>
                                </div>
                                <div className="flex gap-2 mb-4"><input type="text" value={newFlavorName} onChange={(e) => setNewFlavorName(e.target.value)} placeholder="New flavor name" className="flex-grow rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm"/><button onClick={addFlavor} className="bg-brand-orange text-white px-3 rounded-md hover:bg-opacity-90"><PlusIcon className="w-5 h-5" /></button></div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {empanadaFlavors.map((flavor, idx) => (<div key={idx} className="bg-white p-2 rounded shadow-sm text-sm"><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-3"><div className="flex items-center gap-1"><input type="checkbox" checked={flavor.visible} onChange={() => toggleFlavorVisibility(idx)} className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"/><label className="text-xs text-gray-500">Visible</label></div><div className="flex items-center gap-1"><input type="checkbox" checked={flavor.isSpecial || false} onChange={() => toggleFlavorSpecial(idx)} className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4"/><label className="text-xs text-purple-600 font-medium">Special?</label></div></div><button onClick={() => removeFlavor(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></div><div className="mb-2"><span className={`font-medium block ${!flavor.visible ? 'text-gray-400 line-through' : ''}`}>{flavor.name}</span></div><div className="flex gap-2"><input type="text" placeholder="Description" value={flavor.description || ''} onChange={(e) => updateFlavorDescription(idx, e.target.value)} className="flex-grow text-xs border-gray-200 rounded focus:ring-brand-orange focus:border-brand-orange"/><div className="w-20 relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5"><span className="text-gray-400 text-xs">+ $</span></div><input type="number" step="0.05" placeholder="Extra" value={flavor.surcharge || ''} onChange={(e) => updateFlavorSurcharge(idx, e.target.value)} className="w-full text-xs border-gray-200 rounded pl-6 focus:ring-brand-orange focus:border-brand-orange"/></div></div></div>))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-8">
                            {/* ... Pricing Content (unchanged) ... */}
                             <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm"><h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Package Deals</h3><div className={`grid grid-cols-1 md:grid-cols-8 gap-3 rounded-md mb-6 items-end border p-4 ${editingPackageId ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}><div className="md:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Name</label><input type="text" value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} className="w-full text-sm rounded border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label><select value={packageForm.itemType} onChange={e => setPackageForm({...packageForm, itemType: e.target.value as any})} className="w-full text-sm rounded border-gray-300"><option value="mini">Mini</option><option value="full">Full</option></select></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Total Qty</label><input type="number" value={packageForm.quantity} onChange={e => setPackageForm({...packageForm, quantity: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label><input type="number" value={packageForm.price} onChange={e => setPackageForm({...packageForm, price: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Max Flavors</label><input type="number" value={packageForm.maxFlavors} onChange={e => setPackageForm({...packageForm, maxFlavors: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Increment</label><input type="number" value={packageForm.increment} onChange={e => setPackageForm({...packageForm, increment: Number(e.target.value)})} className="w-full text-sm rounded border-gray-300" /></div><div className="flex items-center justify-center pb-2"><div className="flex flex-col items-center"><label className="block text-xs font-medium text-purple-600 mb-1">Special?</label><input type="checkbox" checked={packageForm.isSpecial || false} onChange={e => setPackageForm({...packageForm, isSpecial: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4" /></div></div><div className="md:col-span-8 flex justify-end mt-2 gap-2">{editingPackageId && <button onClick={() => { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); }} className="text-sm text-gray-500 hover:underline mr-2">Cancel Edit</button>}<button onClick={handleAddOrUpdatePackage} className={`flex items-center gap-2 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-opacity-90 ${editingPackageId ? 'bg-amber-600' : 'bg-brand-orange'}`}>{editingPackageId ? <><CheckCircleIcon className="w-4 h-4"/> Update</> : <><PlusIcon className="w-4 h-4" /> Add</>}</button></div></div><div className="space-y-3">{pricing.packages?.map((pkg) => (<div key={pkg.id} className={`flex flex-wrap md:flex-nowrap items-center justify-between bg-white p-3 rounded border shadow-sm gap-4 ${editingPackageId === pkg.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-200'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={pkg.visible} onChange={() => togglePackageVisibility(pkg.id)} className="rounded text-brand-orange focus:ring-brand-orange" title="Visible to customers"/><div><div className="flex items-center gap-2"><p className="font-bold text-brand-brown">{pkg.name}</p>{pkg.isSpecial && <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">SPECIAL</span>}</div><p className="text-xs text-gray-500">{pkg.quantity} {pkg.itemType} • Max {pkg.maxFlavors} flavors</p></div></div><div className="flex items-center gap-4"><p className="font-bold text-lg text-brand-orange">${pkg.price.toFixed(2)}</p><button onClick={() => handleEditPackageClick(pkg)} className="text-gray-500 hover:text-brand-brown"><PencilIcon className="w-4 h-4" /></button><button onClick={() => removePackage(pkg.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>
                             <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm"><h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Salsa & Extras</h3><div className="flex items-end gap-3 mb-4 p-3 bg-gray-50 rounded border border-gray-200"><div className="flex-grow"><label className="block text-xs font-medium text-gray-700 mb-1">Name</label><input type="text" value={newSalsaName} onChange={e => setNewSalsaName(e.target.value)} className="w-full text-sm rounded border-gray-300" /></div><div className="w-32"><label className="block text-xs font-medium text-gray-700 mb-1">Price</label><input type="number" step="0.01" value={newSalsaPrice} onChange={e => setNewSalsaPrice(e.target.value)} className="w-full text-sm rounded border-gray-300" /></div><button onClick={addSalsa} className="bg-brand-orange text-white px-4 py-2 rounded text-sm font-semibold hover:bg-opacity-90">Add</button></div><div className="space-y-2">{(pricing.salsas || []).map((salsa) => (<div key={salsa.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm"><div className="flex items-center gap-3"><input type="checkbox" checked={salsa.visible} onChange={() => toggleSalsaVisibility(salsa.id)} className="rounded text-brand-orange focus:ring-brand-orange"/><span className="font-medium text-brand-brown">{salsa.name}</span></div><div className="flex items-center gap-4"><input type="number" step="0.01" value={salsa.price} onChange={(e) => updateSalsaPrice(salsa.id, e.target.value)} className="w-24 rounded border-gray-300 pl-2 text-sm"/><button onClick={() => removeSalsa(salsa.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>
                             <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-600 text-sm mb-4 uppercase tracking-wide">Fallback / Base Pricing</h3><div className="grid grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-gray-700 mb-1">Mini</label><input type="number" step="0.01" value={pricing.mini.basePrice} onChange={(e) => setPricing({...pricing, mini: { basePrice: parseFloat(e.target.value) || 0 }})} className="block w-full rounded-md border-gray-300" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Full-Size</label><input type="number" step="0.01" value={pricing.full.basePrice} onChange={(e) => setPricing({...pricing, full: { basePrice: parseFloat(e.target.value) || 0 }})} className="block w-full rounded-md border-gray-300" /></div></div></div>
                        </div>
                    )}

                    {activeTab === 'scheduling' && (
                        <div className="space-y-8">
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <div>
                                        <h3 className="font-bold text-brand-brown text-lg">Smart Scheduling</h3>
                                        <p className="text-sm text-gray-600">Control available dates and time slots for customers.</p>
                                    </div>
                                    <ClockIcon className="w-6 h-6 text-brand-orange" />
                                </div>

                                <div className="space-y-6">
                                    {/* Global Settings */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Opening Time</label>
                                            <input type="time" value={scheduling.startTime} onChange={(e) => setScheduling({ ...scheduling, startTime: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Closing Time</label>
                                            <input type="time" value={scheduling.endTime} onChange={(e) => setScheduling({ ...scheduling, endTime: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Slot Interval (Min)</label>
                                            <input type="number" step="5" min="5" value={scheduling.intervalMinutes} onChange={(e) => setScheduling({ ...scheduling, intervalMinutes: parseInt(e.target.value) || 15 })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm" />
                                        </div>
                                    </div>

                                    {/* Recurring Weekly Schedule */}
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                        <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                            Weekly Closed Days (Recurring)
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                                                const isClosed = scheduling.closedDays?.includes(index);
                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => toggleClosedDay(index)}
                                                        className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                                                            isClosed 
                                                                ? 'bg-red-100 text-red-700 border border-red-300' 
                                                                : 'bg-white text-brand-brown border border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                        title={isClosed ? `Closed on ${day}s` : `Open on ${day}s`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Selected days will be permanently unavailable unless overridden below.</p>
                                    </div>

                                    {/* Specific Date Overrides Calendar */}
                                    <div className="bg-white p-4 rounded-md border border-brand-tan flex flex-col md:flex-row gap-6">
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                                    <CalendarDaysIcon className="w-4 h-4" /> Date Overrides
                                                </h4>
                                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded"><ChevronLeftIcon className="w-4 h-4"/></button>
                                                    <span className="text-sm font-medium min-w-[100px] text-center">{calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 rounded"><ChevronRightIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {calendarGrid.map((date, i) => {
                                                    if (!date) return <div key={i} className="aspect-square"></div>;
                                                    
                                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                                    
                                                    const override = scheduling.dateOverrides?.[dateStr];
                                                    const isClosedWeekly = scheduling.closedDays?.includes(date.getDay());
                                                    const isSelected = selectedDate === dateStr;
                                                    const isToday = new Date().toDateString() === date.toDateString();
                                                    
                                                    // Styling based on state
                                                    let bgClass = 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700';
                                                    
                                                    if (override) {
                                                        if (override.isClosed) bgClass = 'bg-red-100 text-red-700 border-red-300 font-bold'; // Force Closed
                                                        else bgClass = 'bg-green-100 text-green-700 border-green-300 font-bold'; // Custom Open
                                                    } else if (isClosedWeekly) {
                                                        bgClass = 'bg-gray-100 text-gray-400 border-transparent'; // Default Closed
                                                    }

                                                    if (isSelected) bgClass += ' ring-2 ring-brand-orange z-10';
                                                    if (isToday) bgClass += ' ring-1 ring-blue-400';

                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleDateClick(dateStr)}
                                                            className={`aspect-square flex items-center justify-center rounded border text-sm transition-all ${bgClass}`}
                                                        >
                                                            {date.getDate()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 flex gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 border rounded"></span> Closed Weekly</span>
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> Force Closed</span>
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Custom Open</span>
                                            </div>
                                        </div>
                                        
                                        {/* Date Settings Panel */}
                                        <div className="w-full md:w-64 bg-gray-50 p-4 rounded border border-gray-200 h-fit">
                                            <h4 className="font-bold text-brand-brown text-sm mb-3 border-b pb-2">
                                                {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : 'Select a Date'}
                                            </h4>
                                            
                                            {selectedDate ? (
                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input 
                                                                type="radio" name="dateType" 
                                                                checked={!scheduling.dateOverrides?.[selectedDate]}
                                                                onChange={() => updateDateOverride(selectedDate, 'default')}
                                                                className="text-brand-orange focus:ring-brand-orange"
                                                            />
                                                            <span>Standard Rules</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input 
                                                                type="radio" name="dateType" 
                                                                checked={scheduling.dateOverrides?.[selectedDate]?.isClosed === true}
                                                                onChange={() => updateDateOverride(selectedDate, 'closed')}
                                                                className="text-red-600 focus:ring-red-600"
                                                            />
                                                            <span>Force Closed</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                            <input 
                                                                type="radio" name="dateType" 
                                                                checked={scheduling.dateOverrides?.[selectedDate]?.isClosed === false}
                                                                onChange={() => updateDateOverride(selectedDate, 'custom')}
                                                                className="text-green-600 focus:ring-green-600"
                                                            />
                                                            <span>Custom Hours</span>
                                                        </label>
                                                    </div>

                                                    {scheduling.dateOverrides?.[selectedDate]?.isClosed === false && (
                                                        <div className="pt-2 border-t border-gray-200 animate-fade-in">
                                                            <div className="mb-2">
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Open Time</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={scheduling.dateOverrides[selectedDate]?.customHours?.start || scheduling.startTime} 
                                                                    onChange={(e) => updateDateOverride(selectedDate, 'custom', e.target.value, scheduling.dateOverrides?.[selectedDate]?.customHours?.end)}
                                                                    className="w-full rounded border-gray-300 text-xs" 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Close Time</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={scheduling.dateOverrides[selectedDate]?.customHours?.end || scheduling.endTime} 
                                                                    onChange={(e) => updateDateOverride(selectedDate, 'custom', scheduling.dateOverrides?.[selectedDate]?.customHours?.start, e.target.value)}
                                                                    className="w-full rounded border-gray-300 text-xs" 
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Click a date on the calendar to configure overrides (e.g., block a holiday or open on a closed day).</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prep' && (
                        <div className="space-y-8">
                             {/* ... Prep Content (unchanged) ... */}
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm"><h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Prep Configuration</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"><div><label className="block text-xs font-medium text-gray-700 mb-1">Full-Size Multiplier</label><input type="number" step="0.1" value={prepSettings.fullSizeMultiplier} onChange={(e) => setPrepSettings({...prepSettings, fullSizeMultiplier: parseFloat(e.target.value) || 0})} className="w-full rounded-md border-gray-300" /></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-medium text-gray-700 mb-1">Discos/Mini</label><input type="number" step="0.01" value={prepSettings.discosPer?.mini ?? 1} onChange={(e) => setPrepSettings({...prepSettings, discosPer: { ...prepSettings.discosPer, mini: parseFloat(e.target.value) || 0 }})} className="w-full rounded-md border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Discos/Full</label><input type="number" step="0.01" value={prepSettings.discosPer?.full ?? 1} onChange={(e) => setPrepSettings({...prepSettings, discosPer: { ...prepSettings.discosPer, full: parseFloat(e.target.value) || 0 }})} className="w-full rounded-md border-gray-300" /></div></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-medium text-gray-700 mb-1">Pack Size (Mini)</label><input type="number" step="1" value={prepSettings.discoPackSize?.mini ?? 10} onChange={(e) => setPrepSettings({...prepSettings, discoPackSize: { ...prepSettings.discoPackSize, mini: parseInt(e.target.value) || 1 }})} className="w-full rounded-md border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Pack Size (Full)</label><input type="number" step="1" value={prepSettings.discoPackSize?.full ?? 10} onChange={(e) => setPrepSettings({...prepSettings, discoPackSize: { ...prepSettings.discoPackSize, full: parseInt(e.target.value) || 1 }})} className="w-full rounded-md border-gray-300" /></div></div><div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-medium text-gray-700 mb-1">Mini/Hr</label><input type="number" step="1" value={prepSettings.productionRates?.mini ?? 40} onChange={(e) => setPrepSettings({...prepSettings, productionRates: { ...prepSettings.productionRates, mini: parseInt(e.target.value) || 0 }})} className="w-full rounded-md border-gray-300" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Full/Hr</label><input type="number" step="1" value={prepSettings.productionRates?.full ?? 25} onChange={(e) => setPrepSettings({...prepSettings, productionRates: { ...prepSettings.productionRates, full: parseInt(e.target.value) || 0 }})} className="w-full rounded-md border-gray-300" /></div></div></div><h4 className="font-bold text-brand-brown text-md mb-3 mt-6 pt-4 border-t">Filling Requirements (Lbs per 20 Minis)</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{empanadaFlavors.map((flavor) => (<div key={flavor.name} className="border rounded-md p-3 bg-gray-50"><label className="block text-xs font-bold text-gray-700 truncate">{flavor.name}</label><div className="flex items-center gap-2"><input type="number" step="0.01" placeholder="0.0" value={prepSettings.lbsPer20[flavor.name] || ''} onChange={(e) => updateLbsPer20(flavor.name, e.target.value)} className="block w-full rounded-md border-gray-300" /><span className="text-xs text-gray-500 whitespace-nowrap">lbs / 20</span></div></div>))}</div></div>
                        </div>
                    )}

                    {activeTab === 'costs' && (
                        <div className="space-y-8">
                             {/* ... Costs Content (unchanged) ... */}
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm"><h3 className="font-bold text-brand-brown text-lg mb-4 border-b pb-2">Costs & Inventory</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"><div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"><div><label className="block text-xs text-yellow-800 mb-1">Hourly Wage ($/hr)</label><input type="number" step="0.50" value={laborWage} onChange={(e) => setLaborWage(parseFloat(e.target.value) || 0)} className="block w-24 rounded-md border-gray-300" /></div></div><div className="bg-green-50 border border-green-200 p-3 rounded-lg"><div className="flex gap-6"><div><label className="block text-xs text-green-800 mb-1">Mini Cost</label><input type="number" step="0.01" value={discoCosts.mini} onChange={(e) => setDiscoCosts({...discoCosts, mini: parseFloat(e.target.value) || 0})} className="block w-24 rounded-md border-gray-300" /></div><div><label className="block text-xs text-green-800 mb-1">Full Cost</label><input type="number" step="0.01" value={discoCosts.full} onChange={(e) => setDiscoCosts({...discoCosts, full: parseFloat(e.target.value) || 0})} className="block w-24 rounded-md border-gray-300" /></div></div></div></div><h4 className="font-bold text-gray-700 mb-2 text-sm">Material Costs (Filling per Lb)</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{empanadaFlavors.map((flavor) => (<div key={flavor.name} className="border rounded-md p-3 bg-gray-50 flex justify-between items-center"><label className="text-xs font-bold text-gray-700 truncate w-1/2">{flavor.name}</label><input type="number" step="0.01" placeholder="0.00" value={materialCosts[flavor.name] || ''} onChange={(e) => updateMaterialCost(flavor.name, e.target.value)} className="block w-full rounded-md border-gray-300 pl-5 text-sm" /></div>))}</div></div>
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
