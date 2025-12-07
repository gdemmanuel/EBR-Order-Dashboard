
import React, { useState, useMemo, useEffect } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee, FollowUpStatus, Ingredient, RecipeIngredient } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon, BriefcaseIcon, DocumentTextIcon, ListBulletIcon, MegaphoneIcon, ChatBubbleOvalLeftEllipsisIcon, SparklesIcon as AppearanceIcon, ChevronDownIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'templates' | 'menu' | 'pricing' | 'recipes' | 'costs' | 'scheduling' | 'expenses' | 'employees'>('general');
    
    // Local state for editing
    const [motd, setMotd] = useState(settings.motd || '');
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    
    // Templates
    const [templates, setTemplates] = useState(settings.messageTemplates);

    // Prep Settings State
    const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>(settings.prepSettings || { 
        lbsPer20: {}, 
        recipes: {},
        fullSizeMultiplier: 2.0,
        discosPer: { mini: 1, full: 1 },
        discoPackSize: { mini: 10, full: 10 },
        productionRates: { mini: 40, full: 25 }
    });

    // Ingredients State
    const [ingredients, setIngredients] = useState<Ingredient[]>(settings.ingredients || []);
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({ name: '', cost: 0, unit: '' });

    // Recipes UI State
    const [expandedRecipeFlavor, setExpandedRecipeFlavor] = useState<string | null>(null);

    // Scheduling Settings
    const [scheduling, setScheduling] = useState<AppSettings['scheduling']>(settings.scheduling);
    
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

    // Status Colors
    const [statusColors, setStatusColors] = useState<Record<string, string>>(settings.statusColors || {});

    const [newFlavorName, setNewFlavorName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Package Form State
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' });
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

            const sanitizedPricing = { ...pricing }; 
            
            const sanitizedEmployees = employees.map(e => ({
                ...e,
                hourlyWage: Number(e.hourlyWage) || 0,
                productionRates: {
                    mini: Number(e.productionRates?.mini) || 0,
                    full: Number(e.productionRates?.full) || 0
                }
            }));

            // Ensure ingredients are an array and numbers are numbers
            const sanitizedIngredients = (Array.isArray(ingredients) ? ingredients : []).map(i => ({
                ...i,
                cost: Number(i.cost) || 0
            }));

            // Generate Full Size Flavors List with specific overrides
            const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({ 
                ...f, 
                name: `Full ${f.name}`,
                // Apply Full Size specific settings to the standard fields for the Full flavor object
                surcharge: f.fullSurcharge || 0,
                minimumQuantity: f.fullMinimumQuantity || 0
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
                materialCosts,
                discoCosts,
                expenseCategories,
                employees: sanitizedEmployees,
                statusColors: statusColors,
                ingredients: sanitizedIngredients
            });
            
            onClose();
        } catch (e: any) {
            console.error("Save Settings Error:", e);
            setSaveError("Failed to save settings. " + (e.message || "Please check your connection."));
        } finally {
            setIsSaving(false);
        }
    };

    // Helpers
    const addFlavor = () => { if (newFlavorName.trim()) { setEmpanadaFlavors([...empanadaFlavors, { name: newFlavorName.trim(), visible: true, isSpecial: false }]); setNewFlavorName(''); } };
    
    // Ingredient Helpers
    const addIngredient = () => {
        if (!newIngredient.name || !newIngredient.unit) return;
        const ing: Ingredient = {
            id: 'ing-' + Date.now() + '-' + Math.floor(Math.random() * 1000), // Unique ID
            name: newIngredient.name,
            cost: Number(newIngredient.cost) || 0,
            unit: newIngredient.unit
        };
        setIngredients(prev => [...prev, ing]);
        setNewIngredient({ name: '', cost: 0, unit: '' });
    };
    
    const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
        setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };
    
    const removeIngredient = (id: string) => {
        setIngredients(prev => prev.filter(i => i.id !== id));
    };

    // Recipe Helpers
    const addIngredientToRecipe = (flavor: string, ingredientId: string) => {
        if (!ingredientId) return;
        
        // Verify ingredient exists in master list
        const exists = ingredients.some(i => i.id === ingredientId);
        if (!exists) return;

        const currentRecipes = prepSettings.recipes || {};
        const currentList = currentRecipes[flavor] || [];
        if (currentList.some(ri => ri.ingredientId === ingredientId)) return; // Already exists

        const updatedList = [...currentList, { ingredientId, amountFor20Minis: 0 }];
        setPrepSettings({ ...prepSettings, recipes: { ...currentRecipes, [flavor]: updatedList } });
    };
    
    const updateRecipeIngredientAmount = (flavor: string, ingredientId: string, amount: number) => {
        const currentRecipes = prepSettings.recipes || {};
        const currentList = currentRecipes[flavor] || [];
        const updatedList = currentList.map(ri => ri.ingredientId === ingredientId ? { ...ri, amountFor20Minis: amount } : ri);
        setPrepSettings({ ...prepSettings, recipes: { ...currentRecipes, [flavor]: updatedList } });
    };
    
    const removeIngredientFromRecipe = (flavor: string, ingredientId: string) => {
        const currentRecipes = prepSettings.recipes || {};
        const currentList = currentRecipes[flavor] || [];
        const updatedList = currentList.filter(ri => ri.ingredientId !== ingredientId);
        setPrepSettings({ ...prepSettings, recipes: { ...currentRecipes, [flavor]: updatedList } });
    };

    // ... (Other helpers) ...
    const toggleFlavorVisibility = (i:number) => {const u=[...empanadaFlavors];u[i].visible=!u[i].visible;setEmpanadaFlavors(u)};
    const toggleFlavorSpecial = (i:number) => {const u=[...empanadaFlavors];u[i].isSpecial=!u[i].isSpecial;setEmpanadaFlavors(u)};
    const updateFlavorDescription = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].description=v;setEmpanadaFlavors(u)};
    const updateFlavorName = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].name=v;setEmpanadaFlavors(u)};
    const updateFlavorSurcharge = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].surcharge=parseFloat(v);setEmpanadaFlavors(u)};
    const updateFlavorMinQty = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].minimumQuantity=parseInt(v)||0;setEmpanadaFlavors(u)};
    // New Updaters for Full Size
    const updateFlavorFullSurcharge = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].fullSurcharge=parseFloat(v);setEmpanadaFlavors(u)};
    const updateFlavorFullMinQty = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].fullMinimumQuantity=parseInt(v)||0;setEmpanadaFlavors(u)};
    
    const removeFlavor = (i:number) => {setEmpanadaFlavors(empanadaFlavors.filter((_,idx)=>idx!==i))};
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 1, isPartyPlatter: pkg.isPartyPlatter || false }); setEditingPackageId(pkg.id); };
    const handleAddOrUpdatePackage = () => { if (!packageForm.name || !packageForm.price || !packageForm.quantity) return; const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, description: packageForm.description, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false, isPartyPlatter: packageForm.isPartyPlatter ?? false }; let updated = pricing.packages || []; updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg]; setPricing({...pricing, packages: updated}); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); setEditingPackageId(null); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const toggleClosedDay = (dayIndex: number) => { const current = scheduling.closedDays || []; if (current.includes(dayIndex)) { setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) }); } else { setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() }); } };
    const handleDateClick = (dateStr: string) => { setSelectedDate(dateStr); };
    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'full' | 'custom', start?: string, end?: string) => { const newOverrides = { ...(scheduling.dateOverrides || {}) }; if (type === 'default') delete newOverrides[dateStr]; else if (type === 'closed') newOverrides[dateStr] = { isClosed: true }; else if (type === 'full') newOverrides[dateStr] = { isClosed: false, isFull: true }; else if (type === 'custom') newOverrides[dateStr] = { isClosed: false, customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime } }; setScheduling({ ...scheduling, dateOverrides: newOverrides }); };
    const calendarGrid = useMemo(() => { const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfWeek = new Date(year, month, 1).getDay(); const cells = []; for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i)); return cells; }, [calendarViewDate]);
    const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
    const addEmployee = () => { if (!newEmployee.name || newEmployee.hourlyWage === undefined) return; const employee: Employee = { id: Date.now().toString(), name: newEmployee.name, hourlyWage: newEmployee.hourlyWage, productionRates: { mini: newEmployee.productionRates?.mini ?? 40, full: newEmployee.productionRates?.full ?? 25 }, isActive: newEmployee.isActive ?? true }; setEmployees([...employees, employee]); setNewEmployee({ name: '', hourlyWage: 15, productionRates: { mini: 40, full: 25 }, isActive: true }); };
    const removeEmployee = (id: string) => { setEmployees(employees.filter(e => e.id !== id)); };
    const updateEmployee = (id: string, field: keyof Employee | 'productionRates.mini' | 'productionRates.full', value: any) => { setEmployees(employees.map(e => { if (e.id !== id) return e; if (field === 'productionRates.mini') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, mini: parseFloat(value) || 0 } }; } else if (field === 'productionRates.full') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, full: parseFloat(value) || 0 } }; } else { return { ...e, [field]: value }; } })); };

    const tabs = [
        { id: 'general', label: 'General', icon: <MegaphoneIcon className="w-4 h-4" /> },
        { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> },
        { id: 'menu', label: 'Menu Items', icon: <ListBulletIcon className="w-4 h-4" /> },
        { id: 'pricing', label: 'Pricing', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
        { id: 'recipes', label: 'Recipes & Ingredients', icon: <ScaleIcon className="w-4 h-4" /> },
        { id: 'employees', label: 'Employees', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'costs', label: 'Unit Costs', icon: <BriefcaseIcon className="w-4 h-4" /> },
        { id: 'expenses', label: 'Expense Categories', icon: <DocumentTextIcon className="w-4 h-4" /> },
        { id: 'scheduling', label: 'Scheduling', icon: <CalendarDaysIcon className="w-4 h-4" /> },
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
                        
                        {/* 1. General Tab */}
                        {activeTab === 'general' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Message of the Day</h3>
                                    <p className="text-sm text-gray-500 mb-2">This message scrolls at the top of the customer order page.</p>
                                    <input type="text" value={motd} onChange={(e) => setMotd(e.target.value)} className="w-full rounded-md border-gray-300" placeholder="e.g. Sold out of Beef for today!" />
                                </div>
                            </div>
                        )}

                        {/* 2. Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Status Colors</h3>
                                    <div className="space-y-3">
                                        {Object.values(FollowUpStatus).map(status => (
                                            <div key={status} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">{status}</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={statusColors[status] || '#ffffff'} 
                                                        onChange={(e) => setStatusColors({...statusColors, [status]: e.target.value})}
                                                        className="h-8 w-14 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <span className="text-xs text-gray-500 font-mono">{statusColors[status]}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Templates Tab */}
                        {activeTab === 'templates' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6">
                                    <strong>Available Placeholders:</strong> {`{firstName}, {name}, {date}, {time}, {deliveryType}, {deliveryAddress}, {total}, {totals}, {items}`}
                                </div>
                                {Object.entries({
                                    followUpNeeded: 'Follow-Up Needed',
                                    pendingConfirmation: 'Pending Confirmation',
                                    confirmed: 'Confirmed',
                                    processing: 'Processing',
                                    completed: 'Completed'
                                }).map(([key, label]) => (
                                    <div key={key} className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                                        <label className="block text-sm font-bold text-brand-brown mb-2">{label} Message</label>
                                        <textarea 
                                            value={(templates as any)[key] || ''}
                                            onChange={(e) => setTemplates({...templates, [key]: e.target.value})}
                                            rows={4}
                                            className="w-full rounded-md border-gray-300 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 4. Menu Items Tab */}
                        {activeTab === 'menu' && (
                            <div className="max-w-5xl mx-auto space-y-8">
                                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-xl text-brand-brown">Flavor Management</h3>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={newFlavorName} 
                                                onChange={(e) => setNewFlavorName(e.target.value)} 
                                                placeholder="New Flavor Name" 
                                                className="rounded-md border-gray-300 text-sm"
                                            />
                                            <button onClick={addFlavor} className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-opacity-90">Add</button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {empanadaFlavors.map((flavor, index) => (
                                            <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                {/* Header Row: Name & Toggles */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                                                    <div className="flex items-center gap-2 flex-grow">
                                                        <input 
                                                            type="text" 
                                                            value={flavor.name} 
                                                            onChange={(e) => updateFlavorName(index, e.target.value)} 
                                                            className="font-bold text-brand-brown bg-transparent border-none p-0 focus:ring-0 w-full sm:w-auto"
                                                        />
                                                        <button 
                                                            onClick={() => toggleFlavorSpecial(index)} 
                                                            className={`p-1 px-2 rounded-full transition-colors text-xs font-bold uppercase ${flavor.isSpecial ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}
                                                            title="Toggle Special/Seasonal"
                                                        >
                                                            Special
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => toggleFlavorVisibility(index)} 
                                                            className={`p-2 rounded-full transition-colors ${flavor.visible ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
                                                            title="Toggle Visibility"
                                                        >
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => removeFlavor(index)} className="text-red-400 hover:text-red-600 p-2">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <input 
                                                    type="text" 
                                                    value={flavor.description || ''} 
                                                    onChange={(e) => updateFlavorDescription(index, e.target.value)} 
                                                    placeholder="Description (ingredients, taste profile...)" 
                                                    className="w-full text-xs text-gray-600 border-gray-300 rounded-md bg-white h-8"
                                                />
                                                
                                                {/* Settings Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 bg-white p-3 rounded border border-gray-200">
                                                    {/* Mini Settings */}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-gray-500 uppercase w-8">Mini</span>
                                                        <label className="flex items-center gap-1 text-xs text-gray-600" title="Minimum Quantity per Order (Mini)">
                                                            Min:
                                                            <input 
                                                                type="number" min="0"
                                                                value={flavor.minimumQuantity || 0} 
                                                                onChange={(e) => updateFlavorMinQty(index, e.target.value)} 
                                                                className="w-12 h-7 text-sm border-gray-300 rounded text-center"
                                                            />
                                                        </label>
                                                        <label className="flex items-center gap-1 text-xs text-gray-600" title="Extra cost per unit (Mini)">
                                                            +$
                                                            <input 
                                                                type="number" step="0.01"
                                                                value={flavor.surcharge || 0} 
                                                                onChange={(e) => updateFlavorSurcharge(index, e.target.value)} 
                                                                className="w-14 h-7 text-sm border-gray-300 rounded text-right"
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* Full Settings */}
                                                    <div className="flex items-center gap-3 sm:border-l sm:pl-4 border-gray-100">
                                                        <span className="text-xs font-bold text-gray-500 uppercase w-8">Full</span>
                                                        <label className="flex items-center gap-1 text-xs text-gray-600" title="Minimum Quantity per Order (Full)">
                                                            Min:
                                                            <input 
                                                                type="number" min="0"
                                                                value={flavor.fullMinimumQuantity || 0} 
                                                                onChange={(e) => updateFlavorFullMinQty(index, e.target.value)} 
                                                                className="w-12 h-7 text-sm border-gray-300 rounded text-center"
                                                            />
                                                        </label>
                                                        <label className="flex items-center gap-1 text-xs text-gray-600" title="Extra cost per unit (Full)">
                                                            +$
                                                            <input 
                                                                type="number" step="0.01"
                                                                value={flavor.fullSurcharge || 0} 
                                                                onChange={(e) => updateFlavorFullSurcharge(index, e.target.value)} 
                                                                className="w-14 h-7 text-sm border-gray-300 rounded text-right"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Pricing Tab */}
                        {activeTab === 'pricing' && (
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* Base Prices */}
                                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                                    <h3 className="font-bold text-brand-brown mb-4">Base Prices</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Mini Base Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={pricing.mini.basePrice} 
                                                    onChange={(e) => setPricing({...pricing, mini: {...pricing.mini, basePrice: parseFloat(e.target.value)}})} 
                                                    className="w-full pl-6 rounded-md border-gray-300"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full-Size Base Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={pricing.full.basePrice} 
                                                    onChange={(e) => setPricing({...pricing, full: {...pricing.full, basePrice: parseFloat(e.target.value)}})} 
                                                    className="w-full pl-6 rounded-md border-gray-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Packages */}
                                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                                    <h3 className="font-bold text-brand-brown mb-4">Package Deals</h3>
                                    
                                    {/* Package Form */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3">{editingPackageId ? 'Edit Package' : 'Add New Package'}</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                            <input type="text" placeholder="Package Name" value={packageForm.name} onChange={(e) => setPackageForm({...packageForm, name: e.target.value})} className="rounded-md border-gray-300 text-sm md:col-span-2" />
                                            <select value={packageForm.itemType} onChange={(e) => setPackageForm({...packageForm, itemType: e.target.value as any})} className="rounded-md border-gray-300 text-sm">
                                                <option value="mini">Mini</option>
                                                <option value="full">Full-Size</option>
                                            </select>
                                            <div className="relative"><span className="absolute left-2 top-2 text-gray-500 text-xs">$</span><input type="number" placeholder="Price" value={packageForm.price} onChange={(e) => setPackageForm({...packageForm, price: parseFloat(e.target.value)})} className="pl-5 w-full rounded-md border-gray-300 text-sm" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                            <input type="number" placeholder="Qty Items" value={packageForm.quantity} onChange={(e) => setPackageForm({...packageForm, quantity: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                            <input type="number" placeholder="Max Flavors" value={packageForm.maxFlavors} onChange={(e) => setPackageForm({...packageForm, maxFlavors: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                            <input type="number" placeholder="Increment (e.g. 1)" value={packageForm.increment || ''} onChange={(e) => setPackageForm({...packageForm, increment: parseInt(e.target.value)})} className="rounded-md border-gray-300 text-sm" />
                                            <div className="flex flex-col gap-1">
                                                <label className="flex items-center gap-2 text-sm bg-white border border-gray-300 rounded px-2 py-1"><input type="checkbox" checked={packageForm.isSpecial} onChange={(e) => setPackageForm({...packageForm, isSpecial: e.target.checked})} /> Is Special?</label>
                                                <label className="flex items-center gap-2 text-sm bg-white border border-gray-300 rounded px-2 py-1"><input type="checkbox" checked={packageForm.isPartyPlatter} onChange={(e) => setPackageForm({...packageForm, isPartyPlatter: e.target.checked})} /> Is Party Platter?</label>
                                            </div>
                                        </div>
                                        <input type="text" placeholder="Description (optional)" value={packageForm.description} onChange={(e) => setPackageForm({...packageForm, description: e.target.value})} className="w-full rounded-md border-gray-300 text-sm mb-3" />
                                        <div className="flex justify-end gap-2">
                                            {editingPackageId && <button onClick={() => { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); }} className="text-gray-500 text-sm underline">Cancel</button>}
                                            <button onClick={handleAddOrUpdatePackage} className="bg-brand-orange text-white px-4 py-1.5 rounded-md text-sm font-bold">{editingPackageId ? 'Update' : 'Add'}</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(pricing.packages || []).map(pkg => (
                                            <div key={pkg.id} className={`p-4 rounded-lg border relative group ${pkg.visible ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-70'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h5 className="font-bold text-brand-brown">{pkg.name}</h5>
                                                        <p className="text-xs text-gray-500">{pkg.quantity} {pkg.itemType} empanadas • ${pkg.price}</p>
                                                        <p className="text-xs text-gray-400">Max {pkg.maxFlavors} flavors • Step {pkg.increment || 1}</p>
                                                        <div className="flex gap-1 mt-1">
                                                            {pkg.isSpecial && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase">Special</span>}
                                                            {pkg.isPartyPlatter && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-bold uppercase">Platter</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => togglePackageVisibility(pkg.id)} className="text-gray-400 hover:text-blue-600"><CheckCircleIcon className={`w-4 h-4 ${pkg.visible ? 'text-green-500' : 'text-gray-300'}`} /></button>
                                                        <button onClick={() => handleEditPackageClick(pkg)} className="text-gray-400 hover:text-brand-orange"><PencilIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => removePackage(pkg.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Salsas */}
                                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                                    <h3 className="font-bold text-brand-brown mb-4">Salsas & Extras</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" placeholder="Name (e.g. Salsa Verde)" value={newSalsaName} onChange={(e) => setNewSalsaName(e.target.value)} className="flex-grow rounded-md border-gray-300 text-sm" />
                                        <input type="number" placeholder="Price" value={newSalsaPrice} onChange={(e) => setNewSalsaPrice(e.target.value)} className="w-24 rounded-md border-gray-300 text-sm" />
                                        <button onClick={addSalsa} className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold">Add</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(pricing.salsas || []).map(salsa => (
                                            <div key={salsa.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                                                <span className="font-medium text-brand-brown">{salsa.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="number" 
                                                        value={salsa.price} 
                                                        onChange={(e) => updateSalsaPrice(salsa.id, e.target.value)} 
                                                        className="w-20 text-sm border-gray-300 rounded p-1 text-right"
                                                    />
                                                    <button onClick={() => toggleSalsaVisibility(salsa.id)} className={`p-1 rounded-full ${salsa.visible ? 'text-green-500' : 'text-gray-300'}`}><CheckCircleIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => removeSalsa(salsa.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* 6. Recipes Tab */}
                        {activeTab === 'recipes' && (
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* Master Ingredient List */}
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Master Ingredient List</h3>
                                    <div className="flex gap-3 mb-4 items-end">
                                        <div className="flex-grow">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                            <input type="text" value={newIngredient.name} onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})} placeholder="e.g. Ground Beef" className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Cost ($)</label>
                                            <input type="number" step="0.01" value={newIngredient.cost} onChange={(e) => setNewIngredient({...newIngredient, cost: parseFloat(e.target.value)})} className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Unit</label>
                                            <input type="text" value={newIngredient.unit} onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})} placeholder="e.g. lbs" className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <button onClick={addIngredient} className="bg-brand-orange text-white px-3 py-2 rounded-md h-[38px]"><PlusIcon className="w-5 h-5"/></button>
                                    </div>
                                    
                                    <div className="bg-white rounded border border-gray-200 max-h-60 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-bold text-gray-600">Ingredient</th>
                                                    <th className="px-4 py-2 text-left font-bold text-gray-600">Cost / Unit</th>
                                                    <th className="px-4 py-2 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {ingredients.map(ing => (
                                                    <tr key={ing.id}>
                                                        <td className="px-4 py-2"><input type="text" value={ing.name} onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)} className="border-none bg-transparent w-full p-0 focus:ring-0"/></td>
                                                        <td className="px-4 py-2 flex items-center gap-2">
                                                            <span>$</span>
                                                            <input type="number" step="0.01" value={ing.cost} onChange={(e) => updateIngredient(ing.id, 'cost', e.target.value)} className="w-16 border-gray-200 rounded p-1 text-right"/>
                                                            <span>/</span>
                                                            <input type="text" value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} className="w-12 border-gray-200 rounded p-1"/>
                                                        </td>
                                                        <td className="px-4 py-2 text-right"><button onClick={() => removeIngredient(ing.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Recipe Builder */}
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Flavor Recipes</h3>
                                    <p className="text-xs text-gray-500 mb-4">Define ingredients required for <strong className="text-brand-brown">20 Mini Empanadas</strong>. Full size calculations will use the global multiplier.</p>
                                    
                                    <div className="space-y-2">
                                        {empanadaFlavors.map(flavor => {
                                            const isExpanded = expandedRecipeFlavor === flavor.name;
                                            const recipe = prepSettings.recipes?.[flavor.name] || [];
                                            const costPer20 = recipe.reduce((sum, ri) => {
                                                const ing = ingredients.find(i => i.id === ri.ingredientId);
                                                return sum + ((ri.amountFor20Minis || 0) * (ing?.cost || 0));
                                            }, 0);

                                            return (
                                                <div key={flavor.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                    <button 
                                                        onClick={() => setExpandedRecipeFlavor(isExpanded ? null : flavor.name)}
                                                        className="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <span className="font-bold text-brand-brown">{flavor.name}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-green-600 font-medium">Est. Cost/20: ${costPer20.toFixed(2)}</span>
                                                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </button>
                                                    
                                                    {isExpanded && (
                                                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                                            <div className="space-y-2 mb-3">
                                                                {recipe.length > 0 && (
                                                                    <div className="flex px-2 text-xs font-bold text-gray-500 mb-1">
                                                                        <span className="flex-grow">Ingredient Name</span>
                                                                        <span className="w-28 text-center">Qty (per 20)</span>
                                                                        <span className="w-20 text-right">Est. Cost</span>
                                                                        <span className="w-6"></span>
                                                                    </div>
                                                                )}
                                                                
                                                                {recipe.map((ri, idx) => {
                                                                    const ing = ingredients.find(i => i.id === ri.ingredientId);
                                                                    const lineCost = (ri.amountFor20Minis || 0) * (ing?.cost || 0);
                                                                    return (
                                                                        <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                                                            <span className="flex-grow text-sm font-medium text-gray-800">{ing?.name || 'Unknown'}</span>
                                                                            <div className="flex items-center gap-1 justify-center w-28">
                                                                                <input 
                                                                                    type="number" step="0.01" 
                                                                                    value={ri.amountFor20Minis === 0 ? '' : ri.amountFor20Minis} 
                                                                                    placeholder="0"
                                                                                    onChange={(e) => updateRecipeIngredientAmount(flavor.name, ri.ingredientId, parseFloat(e.target.value)||0)}
                                                                                    className="w-16 text-sm border-gray-300 rounded text-center focus:ring-brand-orange focus:border-brand-orange p-1"
                                                                                />
                                                                                <span className="text-xs text-gray-500 w-8 truncate" title={ing?.unit}>{ing?.unit}</span>
                                                                            </div>
                                                                            <span className="w-20 text-right text-xs text-gray-500">${lineCost.toFixed(2)}</span>
                                                                            <button onClick={() => removeIngredientFromRecipe(flavor.name, ri.ingredientId)} className="text-red-400 hover:text-red-600 p-1 w-6 flex justify-end"><TrashIcon className="w-4 h-4"/></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {recipe.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No ingredients added yet.</p>}
                                                            </div>
                                                            
                                                            <div className="flex gap-2">
                                                                <select 
                                                                    onChange={(e) => { addIngredientToRecipe(flavor.name, e.target.value); e.target.value = ''; }}
                                                                    className="flex-grow text-sm border-gray-300 rounded shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                                                    defaultValue=""
                                                                >
                                                                    <option value="" disabled>Add Ingredient...</option>
                                                                    {ingredients.filter(i => !recipe.some(r => r.ingredientId === i.id)).map(i => (
                                                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 7. Costs Tab */}
                        {activeTab === 'costs' && (
                            <div className="max-w-4xl space-y-8">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Unit Costs</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium">Mini Disco Cost</label>
                                            <input type="number" step="0.01" value={discoCosts.mini} onChange={(e) => setDiscoCosts({...discoCosts, mini: parseFloat(e.target.value)||0})} className="w-full rounded border-gray-300"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Full Disco Cost</label>
                                            <input type="number" step="0.01" value={discoCosts.full} onChange={(e) => setDiscoCosts({...discoCosts, full: parseFloat(e.target.value)||0})} className="w-full rounded border-gray-300"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 8. Employees Tab */}
                        {activeTab === 'employees' && (
                            <div className="max-w-4xl space-y-8">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Staff Management</h3>
                                    <div className="bg-white p-4 rounded border border-gray-200 mb-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3">Add New Employee</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                                <input type="text" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full rounded-md border-gray-300 text-sm" placeholder="John Doe" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Wage ($/hr)</label>
                                                <input type="number" value={newEmployee.hourlyWage} onChange={(e) => setNewEmployee({...newEmployee, hourlyWage: parseFloat(e.target.value)})} className="w-full rounded-md border-gray-300 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Rate (Mini/Hr)</label>
                                                <input type="number" value={newEmployee.productionRates?.mini} onChange={(e) => setNewEmployee({...newEmployee, productionRates: {...(newEmployee.productionRates || {mini:0,full:0}), mini: parseFloat(e.target.value)}})} className="w-full rounded-md border-gray-300 text-sm" />
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <button onClick={addEmployee} className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-opacity-90">Add Employee</button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {employees.map(emp => (
                                            <div key={emp.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                <div>
                                                    <input type="text" value={emp.name} onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)} className="font-bold text-brand-brown border-none p-0 focus:ring-0 text-sm" />
                                                    <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                                        <label className="flex items-center gap-1">Wage: $<input type="number" value={emp.hourlyWage} onChange={(e) => updateEmployee(emp.id, 'hourlyWage', e.target.value)} className="w-12 p-0 border-none bg-transparent border-b border-gray-300 text-xs" /></label>
                                                        <label className="flex items-center gap-1">Mini Rate: <input type="number" value={emp.productionRates?.mini} onChange={(e) => updateEmployee(emp.id, 'productionRates.mini', e.target.value)} className="w-10 p-0 border-none bg-transparent border-b border-gray-300 text-xs" /></label>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeEmployee(emp.id)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 9. Expenses Tab */}
                        {activeTab === 'expenses' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Expense Categories</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Category" className="flex-grow rounded-md border-gray-300 text-sm" />
                                        <button onClick={addCategory} className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {expenseCategories.map(cat => (
                                            <span key={cat} className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-700">
                                                {cat}
                                                <button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500 ml-1"><XMarkIcon className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 10. Scheduling Tab */}
                        {activeTab === 'scheduling' && (
                            <div className="max-w-5xl mx-auto space-y-8">
                                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-bold text-xl text-brand-brown">Scheduling Rules</h3>
                                            <p className="text-sm text-gray-500">Configure pickup times and blackout dates.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-700">Enable Scheduling</span>
                                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduling.enabled ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setScheduling({...scheduling, enabled: !scheduling.enabled})}>
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scheduling.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Global Settings */}
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h4 className="font-bold text-sm text-gray-700 mb-3">Default Hours</h4>
                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
                                                        <input type="time" value={scheduling.startTime} onChange={(e) => setScheduling({...scheduling, startTime: e.target.value})} className="w-full rounded-md border-gray-300 text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
                                                        <input type="time" value={scheduling.endTime} onChange={(e) => setScheduling({...scheduling, endTime: e.target.value})} className="w-full rounded-md border-gray-300 text-sm" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Interval (Minutes)</label>
                                                    <input type="number" value={scheduling.intervalMinutes} onChange={(e) => setScheduling({...scheduling, intervalMinutes: parseInt(e.target.value)})} className="w-full rounded-md border-gray-300 text-sm" />
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h4 className="font-bold text-sm text-gray-700 mb-3">Regularly Closed Days</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                                        <button 
                                                            key={day}
                                                            onClick={() => toggleClosedDay(idx)}
                                                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${scheduling.closedDays?.includes(idx) ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Calendar Overrides */}
                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeftIcon className="w-5 h-5"/></button>
                                                <h4 className="font-bold text-brand-brown">{calendarViewDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h4>
                                                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRightIcon className="w-5 h-5"/></button>
                                            </div>
                                            
                                            <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                                            </div>
                                            
                                            <div className="grid grid-cols-7 gap-1">
                                                {calendarGrid.map((date, i) => {
                                                    if (!date) return <div key={i} className="h-8"></div>;
                                                    
                                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                                    const override = scheduling.dateOverrides?.[dateStr];
                                                    const isClosedDay = scheduling.closedDays?.includes(date.getDay());
                                                    const isSelected = selectedDate === dateStr;
                                                    
                                                    let bgClass = "bg-gray-50 text-gray-700 hover:bg-gray-100";
                                                    if (override?.isClosed) bgClass = "bg-red-100 text-red-700 font-bold";
                                                    else if (override?.isFull) bgClass = "bg-orange-100 text-orange-700 font-bold";
                                                    else if (override?.customHours) bgClass = "bg-blue-100 text-blue-700 font-bold";
                                                    else if (isClosedDay) bgClass = "bg-gray-200 text-gray-400"; // Inherently closed
                                                    
                                                    if (isSelected) bgClass += " ring-2 ring-brand-orange z-10";

                                                    return (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handleDateClick(dateStr)}
                                                            className={`h-8 rounded flex items-center justify-center text-xs transition-all ${bgClass}`}
                                                        >
                                                            {date.getDate()}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {selectedDate && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                                                    <p className="text-xs font-bold text-gray-500 mb-2">Settings for {selectedDate}:</p>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        <button onClick={() => updateDateOverride(selectedDate, 'default')} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">Default</button>
                                                        <button onClick={() => updateDateOverride(selectedDate, 'closed')} className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded">Closed</button>
                                                        <button onClick={() => updateDateOverride(selectedDate, 'full')} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded">Full</button>
                                                    </div>
                                                    <div className="bg-blue-50 p-2 rounded">
                                                        <p className="text-xs text-blue-800 font-bold mb-1">Custom Hours</p>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="time" 
                                                                value={scheduling.dateOverrides?.[selectedDate]?.customHours?.start || scheduling.startTime} 
                                                                onChange={(e) => updateDateOverride(selectedDate, 'custom', e.target.value, scheduling.dateOverrides?.[selectedDate]?.customHours?.end)}
                                                                className="w-full text-xs rounded border-blue-200"
                                                            />
                                                            <input 
                                                                type="time" 
                                                                value={scheduling.dateOverrides?.[selectedDate]?.customHours?.end || scheduling.endTime}
                                                                onChange={(e) => updateDateOverride(selectedDate, 'custom', scheduling.dateOverrides?.[selectedDate]?.customHours?.start, e.target.value)}
                                                                className="w-full text-xs rounded border-blue-200"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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