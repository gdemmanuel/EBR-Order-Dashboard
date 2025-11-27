
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
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' });
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

            const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({ ...f, name: `Full ${f.name}` }));

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

    // ... (Other helpers unchanged) ...
    const autoFillDescriptions = () => {}; 
    const toggleFlavorVisibility = (i:number) => {const u=[...empanadaFlavors];u[i].visible=!u[i].visible;setEmpanadaFlavors(u)};
    const toggleFlavorSpecial = (i:number) => {const u=[...empanadaFlavors];u[i].isSpecial=!u[i].isSpecial;setEmpanadaFlavors(u)};
    const updateFlavorDescription = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].description=v;setEmpanadaFlavors(u)};
    const updateFlavorName = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].name=v;setEmpanadaFlavors(u)};
    const updateFlavorSurcharge = (i:number,v:string) => {const u=[...empanadaFlavors];u[i].surcharge=parseFloat(v);setEmpanadaFlavors(u)};
    const removeFlavor = (i:number) => {setEmpanadaFlavors(empanadaFlavors.filter((_,idx)=>idx!==i))};
    const updateMaterialCost = (f: string, v: string) => { setMaterialCosts({...materialCosts, [f]: parseFloat(v)||0}); };
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 1 }); setEditingPackageId(pkg.id); };
    const handleAddOrUpdatePackage = () => { if (!packageForm.name || !packageForm.price || !packageForm.quantity) return; const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, description: packageForm.description, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false }; let updated = pricing.packages || []; updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg]; setPricing({...pricing, packages: updated}); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' }); setEditingPackageId(null); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '', description: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const addTier = () => { const minQ = parseInt(newTier.minQty); const p = parseFloat(newTier.price); if (!minQ || isNaN(p)) return; const currentTiers = pricing[newTier.type].tiers || []; const updated = [...currentTiers.filter(t => t.minQuantity !== minQ), { minQuantity: minQ, price: p }]; updated.sort((a,b) => a.minQuantity - b.minQuantity); setPricing({ ...pricing, [newTier.type]: { ...pricing[newTier.type], tiers: updated } }); setNewTier({ ...newTier, minQty: '', price: '' }); };
    const removeTier = (type: 'mini'|'full', minQty: number) => { setPricing({ ...pricing, [type]: { ...pricing[type], tiers: (pricing[type].tiers || []).filter(t => t.minQuantity !== minQty) } }); };
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
                        
                        {/* ... Other tabs content ... */}
                        
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
                        
                        {activeTab === 'expenses' && (
                            <div className="max-w-2xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-brand-brown mb-4">Expense Categories</h3>
                                <div className="flex gap-2 mb-6">
                                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Category" className="flex-grow rounded-md border-gray-300 text-sm"/>
                                    <button onClick={addCategory} className="bg-brand-orange text-white px-4 rounded-md">Add</button>
                                </div>
                                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                    {expenseCategories.map((cat) => (
                                        <div key={cat} className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50">
                                            <span className="text-gray-800 font-medium">{cat}</span>
                                            <button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500">
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'employees' && (
                            <div className="max-w-5xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Add New Employee</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                            <input type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full rounded-md border-gray-300 text-sm" placeholder="Employee Name"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Wage ($/hr)</label>
                                            <input type="number" step="0.50" value={newEmployee.hourlyWage} onChange={e => setNewEmployee({...newEmployee, hourlyWage: parseFloat(e.target.value)})} className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Mini / Hr</label>
                                            <input type="number" value={newEmployee.productionRates?.mini} onChange={e => setNewEmployee({...newEmployee, productionRates: { ...newEmployee.productionRates!, mini: parseFloat(e.target.value) }})} className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Full / Hr</label>
                                            <input type="number" value={newEmployee.productionRates?.full} onChange={e => setNewEmployee({...newEmployee, productionRates: { ...newEmployee.productionRates!, full: parseFloat(e.target.value) }})} className="w-full rounded-md border-gray-300 text-sm"/>
                                        </div>
                                        <button onClick={addEmployee} disabled={!newEmployee.name} className="bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 h-10">Add</button>
                                    </div>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Wage ($)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mini Rate</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Full Rate</th>
                                                    <th className="px-6 py-3 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {employees.map(emp => (
                                                    <tr key={emp.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3"><input type="text" value={emp.name} onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)} className="block w-full border-gray-300 rounded-md text-sm shadow-sm"/></td>
                                                        <td className="px-6 py-3"><input type="number" step="0.50" value={emp.hourlyWage} onChange={(e) => updateEmployee(emp.id, 'hourlyWage', parseFloat(e.target.value))} className="block w-24 border-gray-300 rounded-md text-sm shadow-sm"/></td>
                                                        <td className="px-6 py-3"><input type="number" value={emp.productionRates?.mini} onChange={(e) => updateEmployee(emp.id, 'productionRates.mini', e.target.value)} className="block w-24 border-gray-300 rounded-md text-sm shadow-sm"/></td>
                                                        <td className="px-6 py-3"><input type="number" value={emp.productionRates?.full} onChange={(e) => updateEmployee(emp.id, 'productionRates.full', e.target.value)} className="block w-24 border-gray-300 rounded-md text-sm shadow-sm"/></td>
                                                        <td className="px-6 py-3 text-right"><button onClick={() => removeEmployee(emp.id)} className="text-gray-400 hover:text-red-600 p-2"><TrashIcon className="w-5 h-5"/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'general' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Message of the Day</h3>
                                    <input type="text" value={motd} onChange={(e) => setMotd(e.target.value)} className="w-full rounded-md border-gray-300" />
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
