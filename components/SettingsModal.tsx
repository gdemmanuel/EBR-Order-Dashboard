
import React, { useState, useMemo } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon, BriefcaseIcon, DocumentTextIcon, ListBulletIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing' | 'prep' | 'costs' | 'scheduling' | 'expenses' | 'employees'>('menu');
    
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
    
    // NEW: Expense Categories
    const [expenseCategories, setExpenseCategories] = useState<string[]>(settings.expenseCategories || []);
    const [newCategory, setNewCategory] = useState('');

    // NEW: Employees
    const [employees, setEmployees] = useState<Employee[]>(settings.employees || []);
    const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
        name: '',
        hourlyWage: 15,
        productionRates: { mini: 40, full: 25 },
        isActive: true
    });

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

    // Tier Form State
    const [newTier, setNewTier] = useState<{type: 'mini'|'full', minQty: string, price: string}>({ type: 'mini', minQty: '', price: '' });

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
            discoCosts,
            expenseCategories,
            employees // Save Employees
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

    // Tier Logic
    const addTier = () => {
        const minQ = parseInt(newTier.minQty);
        const p = parseFloat(newTier.price);
        if (!minQ || isNaN(p)) return;
        
        const currentTiers = pricing[newTier.type].tiers || [];
        // Replace if exists or add new
        const updated = [...currentTiers.filter(t => t.minQuantity !== minQ), { minQuantity: minQ, price: p }];
        updated.sort((a,b) => a.minQuantity - b.minQuantity);
        
        setPricing({
            ...pricing,
            [newTier.type]: { ...pricing[newTier.type], tiers: updated }
        });
        setNewTier({ ...newTier, minQty: '', price: '' });
    };

    const removeTier = (type: 'mini'|'full', minQty: number) => {
        setPricing({
            ...pricing,
            [type]: { 
                ...pricing[type], 
                tiers: (pricing[type].tiers || []).filter(t => t.minQuantity !== minQty) 
            }
        });
    };

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

    // Expense Category Logic
    const addCategory = () => {
        if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) {
            setExpenseCategories([...expenseCategories, newCategory.trim()]);
            setNewCategory('');
        }
    };
    const removeCategory = (cat: string) => {
        setExpenseCategories(expenseCategories.filter(c => c !== cat));
    };

    // Employee Logic
    const addEmployee = () => {
        if (!newEmployee.name || newEmployee.hourlyWage === undefined) return;
        
        const employee: Employee = {
            id: Date.now().toString(),
            name: newEmployee.name,
            hourlyWage: newEmployee.hourlyWage,
            productionRates: {
                mini: newEmployee.productionRates?.mini || 40,
                full: newEmployee.productionRates?.full || 25
            },
            isActive: newEmployee.isActive ?? true
        };
        
        setEmployees([...employees, employee]);
        setNewEmployee({
            name: '',
            hourlyWage: 15,
            productionRates: { mini: 40, full: 25 },
            isActive: true
        });
    };
    
    const removeEmployee = (id: string) => {
        setEmployees(employees.filter(e => e.id !== id));
    };
    
    const updateEmployee = (id: string, field: keyof Employee | 'productionRates.mini' | 'productionRates.full', value: any) => {
        setEmployees(employees.map(e => {
            if (e.id !== id) return e;
            
            if (field === 'productionRates.mini') {
                const currentRates = e.productionRates || { mini: 0, full: 0 };
                return { ...e, productionRates: { ...currentRates, mini: parseFloat(value) || 0 } };
            } else if (field === 'productionRates.full') {
                const currentRates = e.productionRates || { mini: 0, full: 0 };
                return { ...e, productionRates: { ...currentRates, full: parseFloat(value) || 0 } };
            } else {
                return { ...e, [field]: value };
            }
        }));
    };

    const tabs = [
        { id: 'menu', label: 'Menu Items', icon: <ListBulletIcon className="w-4 h-4" /> },
        { id: 'pricing', label: 'Pricing', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
        { id: 'scheduling', label: 'Scheduling', icon: <CalendarDaysIcon className="w-4 h-4" /> },
        { id: 'employees', label: 'Employees', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'prep', label: 'Prep Config', icon: <ScaleIcon className="w-4 h-4" /> },
        { id: 'costs', label: 'Inventory & Costs', icon: <BriefcaseIcon className="w-4 h-4" /> },
        { id: 'expenses', label: 'Expense Categories', icon: <DocumentTextIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-brand-tan">
                <header className="p-4 border-b border-brand-tan flex justify-between items-center bg-brand-cream/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <CogIcon className="w-6 h-6 text-brand-brown" />
                        <h2 className="text-2xl font-serif text-brand-brown">Store Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
                    {/* Sidebar Navigation */}
                    <nav className="w-full md:w-64 flex-shrink-0 bg-gray-50 md:border-r border-b md:border-b-0 border-gray-200 overflow-x-auto md:overflow-y-auto flex md:flex-col no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex items-center gap-3 px-4 py-3 md:py-4 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal text-left border-b-2 md:border-b-0 md:border-l-4 border-transparent ${
                                    activeTab === tab.id 
                                        ? 'border-brand-orange text-brand-orange bg-white md:bg-brand-orange/5' 
                                        : 'text-gray-600 hover:text-brand-brown hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab(tab.id as any)}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-white">
                        {activeTab === 'menu' && (
                            <div className="grid grid-cols-1 gap-8 max-w-4xl">
                                 {/* ... Menu Content ... */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <div><h3 className="font-bold text-brand-brown">Empanada Flavors</h3><p className="text-sm text-gray-500">Manage standard and special flavors.</p></div>
                                        <button onClick={autoFillDescriptions} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"><SparklesIcon className="w-3 h-3" /> Auto-fill Descriptions</button>
                                    </div>
                                    <div className="flex gap-2 mb-4"><input type="text" value={newFlavorName} onChange={(e) => setNewFlavorName(e.target.value)} placeholder="New flavor name" className="flex-grow rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm"/><button onClick={addFlavor} className="bg-brand-orange text-white px-3 rounded-md hover:bg-opacity-90"><PlusIcon className="w-5 h-5" /></button></div>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {empanadaFlavors.map((flavor, idx) => (<div key={idx} className="bg-white p-2 rounded shadow-sm text-sm"><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-3"><div className="flex items-center gap-1"><input type="checkbox" checked={flavor.visible} onChange={() => toggleFlavorVisibility(idx)} className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"/><label className="text-xs text-gray-500">Visible</label></div><div className="flex items-center gap-1"><input type="checkbox" checked={flavor.isSpecial || false} onChange={() => toggleFlavorSpecial(idx)} className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4"/><label className="text-xs text-purple-600 font-medium">Special?</label></div></div><button onClick={() => removeFlavor(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button></div><div className="mb-2"><span className={`font-medium block ${!flavor.visible ? 'text-gray-400 line-through' : ''}`}>{flavor.name}</span></div><div className="flex gap-2"><input type="text" placeholder="Description" value={flavor.description || ''} onChange={(e) => updateFlavorDescription(idx, e.target.value)} className="flex-grow text-xs border-gray-200 rounded focus:ring-brand-orange focus:border-brand-orange"/><div className="w-20 relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5"><span className="text-gray-400 text-xs">+ $</span></div><input type="number" step="0.05" placeholder="Extra" value={flavor.surcharge || ''} onChange={(e) => updateFlavorSurcharge(idx, e.target.value)} className="w-full text-xs border-gray-200 rounded pl-6 focus:ring-brand-orange focus:border-brand-orange"/></div></div></div>))}
                                    