
import React, { useState, useMemo, useEffect } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee, FollowUpStatus } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon, BriefcaseIcon, DocumentTextIcon, ListBulletIcon, MegaphoneIcon, ChatBubbleOvalLeftEllipsisIcon, SparklesIcon as AppearanceIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'templates' | 'menu' | 'pricing' | 'prep' | 'costs' | 'scheduling' | 'expenses' | 'employees'>('general');
    
    // Local state for editing
    const [motd, setMotd] = useState(settings.motd || '');
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    
    // Templates
    const [templates, setTemplates] = useState(settings.messageTemplates || {
        followUpNeeded: "Hi {firstName}! This is Rose from Empanadas by Rose. Thank you for placing an order. Please confirm your order for {deliveryType} on {date} at {time} as follows:\n{totals}\n{items}",
        pendingConfirmation: "Perfect! The total is ${total}. Cash on {deliveryType}, please. I'll see you on {date} at {time}.\nThank you for your order!",
        confirmed: "Your order is confirmed! See you on {date} at {time}. Total: ${total}. Address: {deliveryAddress}.",
        processing: "Hi {firstName}! Just wanted to let you know we've started preparing your order for {date}. We'll see you soon!",
        completed: "Thank you for your order, {firstName}! We hope you enjoy the empanadas."
    });

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
    
    // Expense Categories
    const [expenseCategories, setExpenseCategories] = useState<string[]>(settings.expenseCategories || []);
    const [newCategory, setNewCategory] = useState('');

    // Employees
    const [employees, setEmployees] = useState<Employee[]>(settings.employees || []);
    const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
        name: '',
        hourlyWage: 15,
        productionRates: { mini: 40, full: 25 },
        isActive: true
    });

    // Status Colors - Initialize with settings, ensuring defaults are loaded if missing
    const [statusColors, setStatusColors] = useState<Record<string, string>>(() => {
        const defaults = {
            [FollowUpStatus.NEEDED]: '#fef3c7',
            [FollowUpStatus.PENDING]: '#eff6ff',
            [FollowUpStatus.CONFIRMED]: '#dbeafe',
            [FollowUpStatus.PROCESSING]: '#e0e7ff',
            [FollowUpStatus.COMPLETED]: '#dcfce7',
        };
        return { ...defaults, ...(settings.statusColors || {}) };
    });

    const [newFlavorName, setNewFlavorName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Package Form State
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({
        itemType: 'mini',
        quantity: 12,
        price: 20,
        maxFlavors: 4,
        increment: 1,
        visible: true,
        isSpecial: false,
        name: '',
        description: ''
    });
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

    // Salsa Form State
    const [newSalsaName, setNewSalsaName] = useState('');
    const [newSalsaPrice, setNewSalsaPrice] = useState('');

    // Tier Form State
    const [newTier, setNewTier] = useState<{type: 'mini'|'full', minQty: string, price: string}>({ type: 'mini', minQty: '', price: '' });

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        
        try {
            // Sanitize Prep Settings
            const sanitizedPrepSettings = {
                ...prepSettings,
                fullSizeMultiplier: Number(prepSettings.fullSizeMultiplier) || 0,
                discosPer: {
                    mini: Number(prepSettings.discosPer?.mini) || 1,
                    full: Number(prepSettings.discosPer?.full) || 1
                },
                discoPackSize: {
                    mini: Number(prepSettings.discoPackSize?.mini) || 10,
                    full: Number(prepSettings.discoPackSize?.full) || 10
                },
                productionRates: {
                    mini: Number(prepSettings.productionRates?.mini) || 0,
                    full: Number(prepSettings.productionRates?.full) || 0
                },
                lbsPer20: Object.entries(prepSettings.lbsPer20 || {}).reduce((acc, [k, v]) => {
                    acc[k] = Number(v) || 0;
                    return acc;
                }, {} as Record<string, number>)
            };

            // Sanitize Pricing
            const sanitizedPricing = {
                ...pricing,
                mini: {
                    ...pricing.mini,
                    basePrice: Number(pricing.mini.basePrice) || 0,
                    tiers: (pricing.mini.tiers || []).map(t => ({ ...t, minQuantity: Number(t.minQuantity) || 0, price: Number(t.price) || 0 }))
                },
                full: {
                    ...pricing.full,
                    basePrice: Number(pricing.full.basePrice) || 0,
                    tiers: (pricing.full.tiers || []).map(t => ({ ...t, minQuantity: Number(t.minQuantity) || 0, price: Number(t.price) || 0 }))
                },
                salsas: (pricing.salsas || []).map(s => ({ ...s, price: Number(s.price) || 0 })),
                packages: (pricing.packages || []).map(p => ({
                    ...p,
                    quantity: Number(p.quantity) || 0,
                    price: Number(p.price) || 0,
                    maxFlavors: Number(p.maxFlavors) || 0,
                    increment: Number(p.increment) || 1
                }))
            };

            // Sanitize Employees
            const sanitizedEmployees = employees.map(e => ({
                ...e,
                hourlyWage: Number(e.hourlyWage) || 0,
                productionRates: {
                    mini: Number(e.productionRates?.mini) || 0,
                    full: Number(e.productionRates?.full) || 0
                }
            }));

            // Sanitize Costs
            const sanitizedMaterialCosts = Object.entries(materialCosts).reduce((acc, [k, v]) => {
                acc[k] = Number(v) || 0;
                return acc;
            }, {} as Record<string, number>);

            const sanitizedDiscoCosts = {
                mini: Number(discoCosts.mini) || 0,
                full: Number(discoCosts.full) || 0
            };

            // Sync flavors
            const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({
                ...f,
                name: `Full ${f.name}`, 
            }));

            await updateSettingsInDb({
                motd,
                empanadaFlavors,
                fullSizeEmpanadaFlavors: syncedFullFlavors,
                pricing: sanitizedPricing,
                prepSettings: sanitizedPrepSettings,
                scheduling,
                messageTemplates: templates,
                laborWage: Number(laborWage) || 0,
                materialCosts: sanitizedMaterialCosts,
                discoCosts: sanitizedDiscoCosts,
                expenseCategories,
                employees: sanitizedEmployees,
                statusColors: statusColors // Explicitly passing state
            });
            
            onClose();
        } catch (e: any) {
            console.error("Save Settings Error:", e);
            setSaveError("Failed to save settings. " + (e.message || "Please check your connection."));
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions
    const addFlavor = () => { if (newFlavorName.trim()) { setEmpanadaFlavors([...empanadaFlavors, { name: newFlavorName.trim(), visible: true, isSpecial: false }]); setNewFlavorName(''); } };
    const autoFillDescriptions = () => { setEmpanadaFlavors(empanadaFlavors.map(f => (!f.description ? { ...f, description: SUGGESTED_DESCRIPTIONS[f.name] || undefined } : f))); alert('Descriptions populated! Save to apply.'); };
    const toggleFlavorVisibility = (i: number) => { const u = [...empanadaFlavors]; u[i].visible = !u[i].visible; setEmpanadaFlavors(u); };
    const toggleFlavorSpecial = (i: number) => { const u = [...empanadaFlavors]; u[i].isSpecial = !u[i].isSpecial; setEmpanadaFlavors(u); };
    const updateFlavorDescription = (i: number, d: string) => { const u = [...empanadaFlavors]; u[i].description = d; setEmpanadaFlavors(u); };
    const updateFlavorName = (i: number, name: string) => { const u = [...empanadaFlavors]; u[i].name = name; setEmpanadaFlavors(u); };
    const updateFlavorSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].surcharge = parseFloat(v) || undefined; setEmpanadaFlavors(u); };
    const removeFlavor = (i: number) => { setEmpanadaFlavors(empanadaFlavors.filter((_, idx) => idx !== i)); };

    const handleAddOrUpdatePackage = () => {
        if (!packageForm.name || !packageForm.price || !packageForm.quantity) return;
        const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, description: packageForm.description, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false };
        let updated = pricing.packages || [];
        updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg];
        setPricing({...pricing, packages: updated});
        setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' });
        setEditingPackageId(null);
    };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 10 }); setEditingPackageId(pkg.id); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const updateLbsPer20 = (f: string, v: string) => { setPrepSettings({...prepSettings, lbsPer20: {...prepSettings.lbsPer20, [f]: parseFloat(v)||0}}); };
    const updateMaterialCost = (f: string, v: string) => { setMaterialCosts({...materialCosts, [f]: parseFloat(v)||0}); };

    const addTier = () => {
        const minQ = parseInt(newTier.minQty);
        const p = parseFloat(newTier.price);
        if (!minQ || isNaN(p)) return;
        const currentTiers = pricing[newTier.type].tiers || [];
        const updated = [...currentTiers.filter(t => t.minQuantity !== minQ), { minQuantity: minQ, price: p }];
        updated.sort((a,b) => a.minQuantity - b.minQuantity);
        setPricing({ ...pricing, [newTier.type]: { ...pricing[newTier.type], tiers: updated } });
        setNewTier({ ...newTier, minQty: '', price: '' });
    };
    const removeTier = (type: 'mini'|'full', minQty: number) => { setPricing({ ...pricing, [type]: { ...pricing[type], tiers: (pricing[type].tiers || []).filter(t => t.minQuantity !== minQty) } }); };
    
    const toggleClosedDay = (dayIndex: number) => {
        const current = scheduling.closedDays || [];
        if (current.includes(dayIndex)) { setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) }); } 
        else { setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() }); }
    };
    const handleDateClick = (dateStr: string) => { setSelectedDate(dateStr); };
    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'full' | 'custom', start?: string, end?: string) => {
        const newOverrides = { ...(scheduling.dateOverrides || {}) };
        if (type === 'default') delete newOverrides[dateStr];
        else if (type === 'closed') newOverrides[dateStr] = { isClosed: true };
        else if (type === 'full') newOverrides[dateStr] = { isClosed: false, isFull: true };
        else if (type === 'custom') newOverrides[dateStr] = { isClosed: false, customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime } };
        setScheduling({ ...scheduling, dateOverrides: newOverrides });
    };
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
    
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };
    
    const addEmployee = () => { 
        if (!newEmployee.name || newEmployee.hourlyWage === undefined) return; 
        const employee: Employee = { 
            id: Date.now().toString(), 
            name: newEmployee.name, 
            hourlyWage: newEmployee.hourlyWage, 
            productionRates: { 
                mini: newEmployee.productionRates?.mini ?? 40, 
                full: newEmployee.productionRates?.full ?? 25 
            }, 
            isActive: newEmployee.isActive ?? true 
        }; 
        setEmployees([...employees, employee]); 
        setNewEmployee({ name: '', hourlyWage: 15, productionRates: { mini: 40, full: 25 }, isActive: true }); 
    };
    const removeEmployee = (id: string) => { setEmployees(employees.filter(e => e.id !== id)); };
    const updateEmployee = (id: string, field: keyof Employee | 'productionRates.mini' | 'productionRates.full', value: any) => { setEmployees(employees.map(e => { if (e.id !== id) return e; if (field === 'productionRates.mini') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, mini: parseFloat(value) || 0 } }; } else if (field === 'productionRates.full') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, full: parseFloat(value) || 0 } }; } else { return { ...e, [field]: value }; } })); };

    const tabs = [
        { id: 'general', label: 'General', icon: <MegaphoneIcon className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> },
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
                    <nav className="w-full md:w-64 flex-shrink-0 bg-gray-50 md:border-r border-b md:border-b-0 border-gray-200 overflow-x-auto md:overflow-y-auto flex md:flex-col no-scrollbar">
                        {tabs.map((tab) => (
                            <button key={tab.id} className={`flex items-center gap-3 px-4 py-3 md:py-4 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal text-left border-b-2 md:border-b-0 md:border-l-4 border-transparent ${activeTab === tab.id ? 'border-brand-orange text-brand-orange bg-white md:bg-brand-orange/5' : 'text-gray-600 hover:text-brand-brown hover:bg-gray-100'}`} onClick={() => setActiveTab(tab.id as any)}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-white">
                        {activeTab === 'general' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4 flex items-center gap-2"><MegaphoneIcon className="w-5 h-5" /> Message of the Day (MOTD)</h3>
                                    <p className="text-sm text-gray-500 mb-4">This message will appear as a scrolling banner at the top of the Customer Order page.</p>
                                    <textarea rows={3} value={motd} onChange={(e) => setMotd(e.target.value)} placeholder="e.g., We will be closed for the holidays..." className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm"/>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-white p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4 flex items-center gap-2"><AppearanceIcon className="w-5 h-5" /> Status Badges</h3>
                                    <p className="text-sm text-gray-500 mb-4">Customize the background color for order statuses.</p>
                                    
                                    <div className="space-y-3">
                                        {Object.values(FollowUpStatus).map(status => (
                                            <div key={status} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                                                <span className="text-sm font-medium text-gray-700">{status}</span>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={statusColors[status] || '#f3f4f6'} 
                                                        onChange={(e) => setStatusColors({...statusColors, [status]: e.target.value})}
                                                        className="h-8 w-12 p-0 border border-gray-300 rounded cursor-pointer"
                                                    />
                                                    <div className="text-xs font-mono text-gray-400 w-16">{statusColors[status] || '#f3f4f6'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <h3 className="font-bold text-brand-brown mb-2">Message Templates</h3>
                                    <p className="text-sm text-gray-500 mb-6">Customize the default text messages. Use placeholders like <code>{'{name}'}</code>, <code>{'{date}'}</code>, <code>{'{time}'}</code>, <code>{'{total}'}</code>, <code>{'{deliveryAddress}'}</code>.</p>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown/90 mb-1">Follow-up Needed</label>
                                            <textarea rows={4} value={templates.followUpNeeded} onChange={(e) => setTemplates({...templates, followUpNeeded: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm font-mono"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown/90 mb-1">Pending Confirmation</label>
                                            <textarea rows={4} value={templates.pendingConfirmation} onChange={(e) => setTemplates({...templates, pendingConfirmation: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm font-mono"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown/90 mb-1">Confirmed (Approved)</label>
                                            <textarea rows={4} value={templates.confirmed || ''} onChange={(e) => setTemplates({...templates, confirmed: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm font-mono" placeholder="Your order is confirmed..."/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown/90 mb-1">Processing</label>
                                            <textarea rows={4} value={templates.processing || ''} onChange={(e) => setTemplates({...templates, processing: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm font-mono" placeholder="We are starting your order..."/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown/90 mb-1">Completed</label>
                                            <textarea rows={4} value={templates.completed || ''} onChange={(e) => setTemplates({...templates, completed: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-orange focus:border-brand-orange text-sm font-mono" placeholder="Thank you for your order..."/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'menu' && (
                            <div className="grid grid-cols-1 gap-8 max-w-4xl">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-4"><div><h3 className="font-bold text-brand-brown">Empanada Flavors</h3><p className="text-sm text-gray-500">Manage standard and special flavors.</p></div><button onClick={autoFillDescriptions} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"><SparklesIcon className="w-3 h-3" /> Auto-fill</button></div>
                                    <div className="flex gap-2 mb-4"><input type="text" value={newFlavorName} onChange={(e) => setNewFlavorName(e.target.value)} placeholder="New flavor name" className="flex-grow rounded-md border-gray-300 shadow-sm text-sm"/><button onClick={addFlavor} className="bg-brand-orange text-white px-3 rounded-md"><PlusIcon className="w-5 h-5" /></button></div>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {empanadaFlavors.map((flavor, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded shadow-sm text-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2"><button onClick={() => toggleFlavorVisibility(idx)} className={`text-xs px-2 py-1 rounded ${flavor.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{flavor.visible ? 'Visible' : 'Hidden'}</button><button onClick={() => toggleFlavorSpecial(idx)} className={`text-xs px-2 py-1 rounded ${flavor.isSpecial ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>{flavor.isSpecial ? 'Special' : 'Standard'}</button></div>
                                                    <button onClick={() => removeFlavor(idx)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                                <div className="mb-2"><input type="text" value={flavor.name} onChange={(e) => updateFlavorName(idx, e.target.value)} className={`font-medium block w-full border-b border-gray-300 text-sm ${!flavor.visible ? 'text-gray-400 line-through' : 'text-brand-brown'}`}/></div>
                                                <div className="flex gap-2"><input type="text" placeholder="Description" value={flavor.description || ''} onChange={(e) => updateFlavorDescription(idx, e.target.value)} className="flex-grow text-xs border-gray-200 rounded"/><div className="w-20 relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5"><span className="text-gray-400 text-xs">+ $</span></div><input type="number" step="0.01" placeholder="Extra" value={flavor.surcharge || ''} onChange={(e) => updateFlavorSurcharge(idx, e.target.value)} className="w-full text-xs border-gray-200 rounded pl-6"/></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-2">Menu Packages</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2"><input type="text" placeholder="Package Name" value={packageForm.name} onChange={(e) => setPackageForm({...packageForm, name: e.target.value})} className="w-full rounded-md border-gray-300 text-sm"/></div>
                                        <div className="md:col-span-2"><input type="text" placeholder="Description" value={packageForm.description || ''} onChange={(e) => setPackageForm({...packageForm, description: e.target.value})} className="w-full rounded-md border-gray-300 text-sm"/></div>
                                        <div className="flex gap-2"><select value={packageForm.itemType} onChange={(e) => setPackageForm({...packageForm, itemType: e.target.value as 'mini'|'full'})} className="rounded-md border-gray-300 text-sm"><option value="mini">Mini</option><option value="full">Full</option></select><div className="relative w-full"><span className="absolute left-2 top-2 text-gray-500 text-sm">Qty</span><input type="number" placeholder="Qty" value={packageForm.quantity} onChange={(e) => setPackageForm({...packageForm, quantity: parseInt(e.target.value)})} className="w-full pl-10 rounded-md border-gray-300 text-sm"/></div></div>
                                        <div className="flex gap-2"><div className="relative w-full"><span className="absolute left-2 top-2 text-gray-500 text-sm">$</span><input type="number" step="0.01" placeholder="Price" value={packageForm.price} onChange={(e) => setPackageForm({...packageForm, price: parseFloat(e.target.value)})} className="w-full pl-6 rounded-md border-gray-300 text-sm"/></div><div className="relative w-full"><span className="absolute left-2 top-2 text-gray-500 text-sm">Max Flavors</span><input type="number" placeholder="Max" value={packageForm.maxFlavors} onChange={(e) => setPackageForm({...packageForm, maxFlavors: parseInt(e.target.value)})} className="w-full pl-24 rounded-md border-gray-300 text-sm"/></div></div>
                                        <div className="flex gap-2 items-center"><div className="relative w-32"><span className="absolute left-2 top-2 text-gray-500 text-sm">Step</span><input type="number" min="1" placeholder="Inc" value={packageForm.increment} onChange={(e) => setPackageForm({...packageForm, increment: parseInt(e.target.value)})} className="w-full pl-12 rounded-md border-gray-300 text-sm"/></div><div className="flex items-center"><input type="checkbox" id="pkgSpecial" checked={packageForm.isSpecial || false} onChange={(e) => setPackageForm({...packageForm, isSpecial: e.target.checked})} className="mr-2 rounded text-purple-600"/><label htmlFor="pkgSpecial" className="text-sm text-gray-700">Special?</label></div><button onClick={handleAddOrUpdatePackage} className="flex-grow bg-brand-brown text-white px-4 py-2 rounded-md text-sm">{editingPackageId ? 'Update' : 'Add'}</button></div>
                                    </div>
                                    <div className="space-y-2">{pricing.packages?.map(pkg => (<div key={pkg.id} className={`p-3 rounded border flex justify-between items-center ${pkg.isSpecial ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'}`}><div><span className={`font-bold block ${!pkg.visible ? 'text-gray-400 line-through' : 'text-brand-brown'}`}>{pkg.name}</span><span className="text-xs text-gray-500 block">{pkg.quantity} {pkg.itemType} for ${pkg.price.toFixed(2)} {pkg.isSpecial && <span className="text-purple-600 ml-1">SPECIAL</span>}</span></div><div className="flex gap-2"><button onClick={() => togglePackageVisibility(pkg.id)} className={`text-xs px-2 py-1 rounded ${pkg.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{pkg.visible ? 'Visible' : 'Hidden'}</button><button onClick={() => handleEditPackageClick(pkg)} className="text-blue-500"><PencilIcon className="w-4 h-4" /></button><button onClick={() => removePackage(pkg.id)} className="text-red-400"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-2">Salsas & Extras</h3><div className="flex gap-2 mb-4"><input type="text" placeholder="Name" value={newSalsaName} onChange={(e) => setNewSalsaName(e.target.value)} className="flex-grow rounded-md border-gray-300 text-sm"/><input type="number" step="0.01" placeholder="Price" value={newSalsaPrice} onChange={(e) => setNewSalsaPrice(e.target.value)} className="w-24 rounded-md border-gray-300 text-sm"/><button onClick={addSalsa} className="bg-brand-orange text-white px-3 rounded-md"><PlusIcon className="w-5 h-5" /></button></div><div className="space-y-2">{pricing.salsas?.map(s => (<div key={s.id} className="bg-white p-2 rounded shadow-sm flex justify-between items-center text-sm"><div><span className={`font-medium ${!s.visible ? 'text-gray-400 line-through' : ''}`}>{s.name}</span></div><div className="flex items-center gap-2"><input type="number" step="0.01" value={s.price} onChange={(e) => updateSalsaPrice(s.id, e.target.value)} className="w-16 text-xs border-gray-200 rounded"/><button onClick={() => toggleSalsaVisibility(s.id)} className={`text-xs px-2 py-1 rounded ${s.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{s.visible ? 'Visible' : 'Hidden'}</button><button onClick={() => removeSalsa(s.id)} className="text-red-400"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>
                            </div>
                        )}

                        {activeTab === 'pricing' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Mini Empanada Base Price</h3><div className="flex items-center gap-2 mb-6"><span className="text-gray-600">$</span><input type="number" step="0.01" value={pricing.mini.basePrice} onChange={(e) => setPricing({...pricing, mini: {...pricing.mini, basePrice: parseFloat(e.target.value)||0}})} className="w-24 rounded-md border-gray-300"/><span className="text-sm text-gray-500">per unit</span></div><h4 className="font-semibold text-sm text-gray-700 mb-2">Volume Discounts</h4><div className="flex gap-2 mb-2"><input type="number" placeholder="Min Qty" value={newTier.type === 'mini' ? newTier.minQty : ''} onChange={(e) => setNewTier({...newTier, type: 'mini', minQty: e.target.value})} className="w-24 text-sm rounded border-gray-300"/><input type="number" step="0.01" placeholder="Price" value={newTier.type === 'mini' ? newTier.price : ''} onChange={(e) => setNewTier({...newTier, type: 'mini', price: e.target.value})} className="w-24 text-sm rounded border-gray-300"/><button onClick={addTier} className="text-xs bg-brand-brown text-white px-2 rounded">Add</button></div><ul className="text-sm space-y-1">{pricing.mini.tiers?.map(t => (<li key={t.minQuantity} className="flex justify-between bg-white p-2 rounded border border-gray-200"><span>{t.minQuantity}+ items: <strong>${t.price.toFixed(2)}</strong> ea</span><button onClick={() => removeTier('mini', t.minQuantity)} className="text-red-500"><XMarkIcon className="w-4 h-4"/></button></li>))}</ul></div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Full-Size Empanada Base Price</h3><div className="flex items-center gap-2 mb-6"><span className="text-gray-600">$</span><input type="number" step="0.01" value={pricing.full.basePrice} onChange={(e) => setPricing({...pricing, full: {...pricing.full, basePrice: parseFloat(e.target.value)||0}})} className="w-24 rounded-md border-gray-300"/><span className="text-sm text-gray-500">per unit</span></div><h4 className="font-semibold text-sm text-gray-700 mb-2">Volume Discounts</h4><div className="flex gap-2 mb-2"><input type="number" placeholder="Min Qty" value={newTier.type === 'full' ? newTier.minQty : ''} onChange={(e) => setNewTier({...newTier, type: 'full', minQty: e.target.value})} className="w-24 text-sm rounded border-gray-300"/><input type="number" step="0.01" placeholder="Price" value={newTier.type === 'full' ? newTier.price : ''} onChange={(e) => setNewTier({...newTier, type: 'full', price: e.target.value})} className="w-24 text-sm rounded border-gray-300"/><button onClick={addTier} className="text-xs bg-brand-brown text-white px-2 rounded">Add</button></div><ul className="text-sm space-y-1">{pricing.full.tiers?.map(t => (<li key={t.minQuantity} className="flex justify-between bg-white p-2 rounded border border-gray-200"><span>{t.minQuantity}+ items: <strong>${t.price.toFixed(2)}</strong> ea</span><button onClick={() => removeTier('full', t.minQuantity)} className="text-red-500"><XMarkIcon className="w-4 h-4"/></button></li>))}</ul></div>
                            </div>
                        )}
                        
                        {activeTab === 'scheduling' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-brand-brown">Availability</h3><div className="flex items-center"><input type="checkbox" id="schedEnabled" checked={scheduling.enabled} onChange={(e) => setScheduling({...scheduling, enabled: e.target.checked})} className="mr-2 rounded text-brand-orange"/><label htmlFor="schedEnabled" className="text-sm font-medium text-gray-700">Enable</label></div></div><div className="grid grid-cols-2 gap-4 mb-4"><div><label className="block text-xs font-bold text-gray-500 mb-1">Open</label><input type="time" value={scheduling.startTime} onChange={(e) => setScheduling({...scheduling, startTime: e.target.value})} className="w-full rounded border-gray-300 text-sm"/></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Close</label><input type="time" value={scheduling.endTime} onChange={(e) => setScheduling({...scheduling, endTime: e.target.value})} className="w-full rounded border-gray-300 text-sm"/></div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Interval</label><select value={scheduling.intervalMinutes} onChange={(e) => setScheduling({...scheduling, intervalMinutes: parseInt(e.target.value)})} className="w-full rounded border-gray-300 text-sm"><option value={15}>15 Min</option><option value={30}>30 Min</option><option value={60}>60 Min</option></select></div></div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-2">Weekly Closed Days</h3><div className="flex justify-between">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (<button key={day} onClick={() => toggleClosedDay(idx)} className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center border ${scheduling.closedDays?.includes(idx) ? 'bg-red-100 text-red-600' : 'bg-white'}`}>{day}</button>))}</div></div>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full"><div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-brand-brown">Date Overrides</h3><div className="flex gap-2"><button onClick={handlePrevMonth} className="p-1 rounded hover:bg-gray-200"><ChevronLeftIcon className="w-5 h-5"/></button><span className="font-medium text-sm w-32 text-center">{calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button onClick={handleNextMonth} className="p-1 rounded hover:bg-gray-200"><ChevronRightIcon className="w-5 h-5"/></button></div></div><div className="flex-grow p-4"><div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 mb-2">{['S','M','T','W','T','F','S'].map((d,i) => <div key={i}>{d}</div>)}</div><div className="grid grid-cols-7 gap-1">{calendarGrid.map((date, idx) => { if (!date) return <div key={idx}></div>; const dateStr = date.toISOString().split('T')[0]; const override = scheduling.dateOverrides?.[dateStr]; let bgClass = override?.isClosed ? 'bg-red-50 text-red-700' : override?.isFull ? 'bg-amber-50 text-amber-700' : override ? 'bg-green-50 text-green-700' : scheduling.closedDays?.includes(date.getDay()) ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'; return (<button key={idx} onClick={() => handleDateClick(dateStr)} className={`h-10 text-xs rounded border ${selectedDate === dateStr ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-gray-100'} ${bgClass}`}>{date.getDate()}</button>); })}</div></div>{selectedDate && <div className="p-4 bg-gray-50 border-t border-gray-200"><p className="font-bold text-sm text-brand-brown mb-2">Settings for {selectedDate}</p><div className="flex gap-2 flex-wrap"><button onClick={() => updateDateOverride(selectedDate!, 'default')} className="flex-1 text-xs bg-white border border-gray-300 px-2 py-1.5 rounded">Default</button><button onClick={() => updateDateOverride(selectedDate!, 'closed')} className="flex-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-1.5 rounded">Close</button><button onClick={() => updateDateOverride(selectedDate!, 'full')} className="flex-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1.5 rounded">Full</button><button onClick={() => updateDateOverride(selectedDate!, 'custom')} className="flex-1 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1.5 rounded">Custom</button></div></div>}</div>
                            </div>
                        )}
                        
                        {activeTab === 'employees' && (
                            <div className="max-w-5xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Add New Employee</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                            <input 
                                                type="text" 
                                                value={newEmployee.name} 
                                                onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} 
                                                className="w-full rounded-md border-gray-300 text-sm"
                                                placeholder="Employee Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Wage ($/hr)</label>
                                            <input 
                                                type="number" step="0.50" 
                                                value={newEmployee.hourlyWage} 
                                                onChange={e => setNewEmployee({...newEmployee, hourlyWage: parseFloat(e.target.value)})} 
                                                className="w-full rounded-md border-gray-300 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Mini / Hr</label>
                                            <input 
                                                type="number" 
                                                value={newEmployee.productionRates?.mini} 
                                                onChange={e => setNewEmployee({
                                                    ...newEmployee, 
                                                    productionRates: { 
                                                        ...newEmployee.productionRates!, 
                                                        mini: parseFloat(e.target.value) 
                                                    }
                                                })} 
                                                className="w-full rounded-md border-gray-300 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Full / Hr</label>
                                            <input 
                                                type="number" 
                                                value={newEmployee.productionRates?.full} 
                                                onChange={e => setNewEmployee({
                                                    ...newEmployee, 
                                                    productionRates: { 
                                                        ...newEmployee.productionRates!, 
                                                        full: parseFloat(e.target.value) 
                                                    }
                                                })} 
                                                className="w-full rounded-md border-gray-300 text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={addEmployee} 
                                            disabled={!newEmployee.name} 
                                            className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 h-10"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Wage ($)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mini Rate (qty/hr)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Full Rate (qty/hr)</th>
                                                    <th className="px-6 py-3 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {employees.map(emp => (
                                                    <tr key={emp.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3">
                                                            <input 
                                                                type="text" 
                                                                value={emp.name} 
                                                                onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                                                                className="block w-full border-gray-300 rounded-md text-sm shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input 
                                                                type="number" step="0.50"
                                                                value={emp.hourlyWage} 
                                                                onChange={(e) => updateEmployee(emp.id, 'hourlyWage', parseFloat(e.target.value))}
                                                                className="block w-24 border-gray-300 rounded-md text-sm shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input 
                                                                type="number" 
                                                                value={emp.productionRates?.mini ?? 0} 
                                                                onChange={(e) => updateEmployee(emp.id, 'productionRates.mini', e.target.value)}
                                                                className="block w-24 border-gray-300 rounded-md text-sm shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input 
                                                                type="number" 
                                                                value={emp.productionRates?.full ?? 0} 
                                                                onChange={(e) => updateEmployee(emp.id, 'productionRates.full', e.target.value)}
                                                                className="block w-24 border-gray-300 rounded-md text-sm shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button onClick={() => removeEmployee(emp.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded hover:bg-red-50">
                                                                <TrashIcon className="w-5 h-5"/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {employees.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                                                            No employees added yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'prep' && (<div className="max-w-4xl space-y-8"><div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Config</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-medium">Full Size Multiplier</label><input type="number" step="0.1" value={prepSettings.fullSizeMultiplier} onChange={(e) => setPrepSettings({...prepSettings, fullSizeMultiplier: parseFloat(e.target.value)||0})} className="w-full rounded border-gray-300"/></div><div><label className="block text-sm font-medium">Discos per Mini</label><input type="number" value={prepSettings.discosPer?.mini ?? 1} onChange={(e) => setPrepSettings({...prepSettings, discosPer: {...prepSettings.discosPer, mini: parseInt(e.target.value)||1}})} className="w-full rounded border-gray-300"/></div></div></div><div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Filling Req (lbs/20)</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{empanadaFlavors.map(f => (<div key={f.name}><label className="block text-xs font-bold text-gray-500 mb-1 truncate">{f.name}</label><input type="number" step="0.1" value={prepSettings.lbsPer20[f.name] || 0} onChange={(e) => updateLbsPer20(f.name, e.target.value)} className="w-full rounded border-gray-300 text-sm"/></div>))}</div></div></div>)}
                        {activeTab === 'costs' && (<div className="max-w-4xl space-y-8"><div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Unit Costs</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-medium">Mini Disco Cost</label><input type="number" step="0.01" value={discoCosts.mini} onChange={(e) => setDiscoCosts({...discoCosts, mini: parseFloat(e.target.value)||0})} className="w-full rounded border-gray-300"/></div><div><label className="block text-sm font-medium">Full Disco Cost</label><input type="number" step="0.01" value={discoCosts.full} onChange={(e) => setDiscoCosts({...discoCosts, full: parseFloat(e.target.value)||0})} className="w-full rounded border-gray-300"/></div></div></div><div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Material Costs ($/lb)</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{empanadaFlavors.map(f => (<div key={f.name}><label className="block text-xs font-bold text-gray-500 mb-1 truncate">{f.name}</label><input type="number" step="0.01" value={materialCosts[f.name] || 0} onChange={(e) => updateMaterialCost(f.name, e.target.value)} className="w-full rounded border-gray-300 text-sm"/></div>))}</div></div></div>)}
                        {activeTab === 'expenses' && (<div className="max-w-2xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-200"><h3 className="font-bold text-brand-brown mb-4">Expense Categories</h3><div className="flex gap-2 mb-6"><input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Category" className="flex-grow rounded-md border-gray-300 text-sm"/><button onClick={addCategory} className="bg-brand-orange text-white px-4 rounded-md">Add</button></div><div className="bg-white rounded border border-gray-200 overflow-hidden">{expenseCategories.map((cat) => (<div key={cat} className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50"><span className="text-gray-800 font-medium">{cat}</span><button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500"><XMarkIcon className="w-4 h-4" /></button></div>))}</div></div>)}
                    </div>
                </div>

                <footer className="p-4 border-t border-brand-tan flex justify-between items-center bg-white flex-shrink-0">
                    <div className="text-sm text-red-600 font-medium max-w-md truncate px-2">{saveError}</div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-brand-orange text-white font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-md flex items-center gap-2">{isSaving ? 'Saving...' : 'Save Settings'}</button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
