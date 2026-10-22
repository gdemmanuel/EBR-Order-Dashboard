

import React, { useState, useMemo, useEffect } from 'react';
import { AppSettings, updateSettingsInDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee, FollowUpStatus, Ingredient, RecipeIngredient, CompetitorPrice, WorkType } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon, BriefcaseIcon, DocumentTextIcon, ListBulletIcon, MegaphoneIcon, ChatBubbleOvalLeftEllipsisIcon, SparklesIcon as AppearanceIcon, ChevronDownIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';
import { STARTER_COMPETITOR_PRICES } from '../data/competitorPrices';
import { platterSalsaCups } from '../utils/orderUtils';
import { DEFAULT_LABOR_TRACKING_START } from '../utils/costUtils';
import { WORK_TYPES, employeeDefaultWorkType } from '../utils/laborUtils';

const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Ingredient ids look like "ing-<timestamp>-<n>"; use that timestamp as the creation date.
// Falls back to the day before `today` if the id has no timestamp or it isn't earlier than today.
const ingredientCreatedDate = (id: string, today: string): string => {
    const ms = Number(id.split('-')[1]);
    const created = ms > 0 ? toLocalDateStr(new Date(ms)) : '';
    if (created && created < today) return created;
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return toLocalDateStr(d);
};

// Whole numbers as-is, otherwise up to two decimals (e.g. 10, 2.5, 0.25)
const formatQtyPlain = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

// Small on/off switch
const Toggle = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(); }}
        className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-300'}`}
    >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
);

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [section, setSection] = useState<'store' | 'menu' | 'kitchen' | 'team' | 'messages'>('store');
    const [kitchenTab, setKitchenTab] = useState<'ingredients' | 'recipes' | 'prep' | 'expenses'>('ingredients');
    const [menuTab, setMenuTab] = useState<'flavors' | 'packages' | 'salsas' | 'competitors'>('flavors');
    const [flavorFilter, setFlavorFilter] = useState<'all' | 'menu' | 'hidden' | 'specials'>('all');
    const [expandedFlavorIndex, setExpandedFlavorIndex] = useState<number | null>(null);
    const [showPackageForm, setShowPackageForm] = useState(false);

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

    // Ingredients UI State
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [expandedIngredientId, setExpandedIngredientId] = useState<string | null>(null);

    // Recipes UI State
    const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
    const [menuFlavorsOnly, setMenuFlavorsOnly] = useState(true);

    // Scheduling Settings
    const [scheduling, setScheduling] = useState<AppSettings['scheduling']>(settings.scheduling);

    // Calendar View State
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Cost Settings State
    const [laborWage, setLaborWage] = useState<number>(settings.laborWage || 15.00);
    const [materialCosts, setMaterialCosts] = useState<Record<string, number>>(settings.materialCosts || {});
    const [discoCosts, setDiscoCosts] = useState<{ mini: number, full: number }>(settings.discoCosts || { mini: 0.1, full: 0.15 });

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

    // Competitor prices (market comparison in Reports); starts from the researched list until saved
    const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>(settings.competitorPrices ?? STARTER_COMPETITOR_PRICES);

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
    const [newTier, setNewTier] = useState<{ type: 'mini' | 'full', minQty: string, price: string }>({ type: 'mini', minQty: '', price: '' });

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const sanitizedPrepSettings = {
                ...prepSettings,
                fullSizeMultiplier: Number(prepSettings.fullSizeMultiplier) || 0,
                targetMargin: Number(prepSettings.targetMargin) || 50,
                laborTrackingStart: prepSettings.laborTrackingStart || DEFAULT_LABOR_TRACKING_START,
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

            // Ensure ingredients are an array and numbers are numbers.
            // A changed price is recorded in price history (dated today) so past orders keep the price they had.
            const today = toLocalDateStr(new Date());
            const sanitizedIngredients = (Array.isArray(ingredients) ? ingredients : []).map(i => {
                const cost = Number(i.cost) || 0;
                const original = (settings.ingredients || []).find(o => o.id === i.id);
                const oldCost = original ? Number(original.cost) || 0 : undefined;
                if (oldCost === cost) return { ...i, cost };

                let history = [...(i.priceHistory || [])];
                // No history yet: keep the old price as the price before today, dated when the ingredient was created
                if (history.length === 0 && oldCost !== undefined && oldCost > 0) {
                    history.push({ date: ingredientCreatedDate(i.id, today), price: oldCost });
                }
                history = history.filter(h => h.date !== today);
                history.push({ date: today, price: cost });
                history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return { ...i, cost, priceHistory: history };
            });

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
                competitorPrices: competitorPrices
                    .filter(c => c.competitor.trim())
                    .map(c => ({ ...c, competitor: c.competitor.trim(), quantity: Math.max(1, Number(c.quantity) || 1), price: Number(c.price) || 0 })),
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
        const ing = ingredients.find(i => i.id === id);
        const usedIn = Object.entries(prepSettings.recipes || {})
            .filter(([, list]) => list.some(ri => ri.ingredientId === id))
            .map(([flavor]) => flavor);
        const warnings: string[] = [];
        if (usedIn.length > 0) warnings.push(`It is used in these recipes, which will stop counting its cost: ${usedIn.join(', ')}.`);
        if (ing?.priceHistory?.length) warnings.push(`Its price history (${ing.priceHistory.length} entries) will be lost.`);
        if (warnings.length > 0 && !window.confirm(
            `Delete "${ing?.name}"?\n\n${warnings.join('\n\n')}\n\nTo change its name, price or unit, edit it in the list instead of deleting it.`
        )) return;
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
    const toggleFlavorVisibility = (i: number) => { const u = [...empanadaFlavors]; u[i].visible = !u[i].visible; setEmpanadaFlavors(u) };
    const toggleFlavorSpecial = (i: number) => { const u = [...empanadaFlavors]; u[i].isSpecial = !u[i].isSpecial; setEmpanadaFlavors(u) };
    const updateFlavorDescription = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].description = v; setEmpanadaFlavors(u) };
    const updateFlavorName = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].name = v; setEmpanadaFlavors(u) };
    const updateFlavorSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].surcharge = parseFloat(v); setEmpanadaFlavors(u) };
    const updateFlavorMinQty = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].minimumQuantity = parseInt(v) || 0; setEmpanadaFlavors(u) };
    // New Updaters for Full Size
    const updateFlavorFullSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].fullSurcharge = parseFloat(v); setEmpanadaFlavors(u) };
    const updateFlavorFullMinQty = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].fullMinimumQuantity = parseInt(v) || 0; setEmpanadaFlavors(u) };

    const removeFlavor = (i: number) => { setEmpanadaFlavors(empanadaFlavors.filter((_, idx) => idx !== i)) };
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 1, isPartyPlatter: pkg.isPartyPlatter || false }); setEditingPackageId(pkg.id); };
    const handleAddOrUpdatePackage = () => { if (!packageForm.name || !packageForm.price || !packageForm.quantity) return; const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, description: packageForm.description, itemType: packageForm.itemType as 'mini' | 'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors) || Number(packageForm.quantity), increment: Number(packageForm.increment) || 1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false, isPartyPlatter: packageForm.isPartyPlatter ?? false, salsaCups: packageForm.isPartyPlatter && packageForm.salsaCups !== undefined && String(packageForm.salsaCups) !== '' ? Math.max(0, Number(packageForm.salsaCups) || 0) : undefined }; let updated = pricing.packages || []; updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg]; setPricing({ ...pricing, packages: updated }); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); setEditingPackageId(null); };
    const removePackage = (id: string) => { setPricing({ ...pricing, packages: pricing.packages.filter(p => p.id !== id) }); if (editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({ ...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p) }); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({ ...pricing, salsas: [...(pricing.salsas || []), { id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice) || 0, visible: true }] }); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({ ...pricing, salsas: pricing.salsas.filter(s => s.id !== id) }); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({ ...pricing, salsas: pricing.salsas.map(s => s.id === id ? { ...s, price: parseFloat(p) || 0 } : s) }); };
    const toggleSalsaVisibility = (id: string) => { setPricing({ ...pricing, salsas: pricing.salsas.map(s => s.id === id ? { ...s, visible: !s.visible } : s) }); };
    const toggleClosedDay = (dayIndex: number) => { const current = scheduling.closedDays || []; if (current.includes(dayIndex)) { setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) }); } else { setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() }); } };
    const handleDateClick = (dateStr: string) => { setSelectedDate(dateStr); };
    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'full' | 'custom' | 'allowOrders', value?: any, start?: string, end?: string) => {
        const newOverrides = { ...(scheduling.dateOverrides || {}) };
        if (type === 'default') {
            delete newOverrides[dateStr];
        } else if (type === 'closed') {
            newOverrides[dateStr] = { isClosed: true };
        } else if (type === 'full') {
            newOverrides[dateStr] = { isClosed: false, isFull: true, allowOrders: false };
        } else if (type === 'custom') {
            newOverrides[dateStr] = { isClosed: false, customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime } };
        } else if (type === 'allowOrders') {
            if (newOverrides[dateStr]) {
                newOverrides[dateStr] = { ...newOverrides[dateStr], allowOrders: value };
            }
        }
        setScheduling({ ...scheduling, dateOverrides: newOverrides });
    };

    const calendarGrid = useMemo(() => { const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfWeek = new Date(year, month, 1).getDay(); const cells = []; for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i)); return cells; }, [calendarViewDate]);
    const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
    const addEmployee = () => { if (!newEmployee.name || newEmployee.hourlyWage === undefined) return; const employee: Employee = { id: Date.now().toString(), name: newEmployee.name, hourlyWage: newEmployee.hourlyWage, productionRates: { mini: newEmployee.productionRates?.mini ?? 40, full: newEmployee.productionRates?.full ?? 25 }, isActive: newEmployee.isActive ?? true, defaultWorkType: newEmployee.defaultWorkType || 'production' }; setEmployees([...employees, employee]); setNewEmployee({ name: '', hourlyWage: 15, productionRates: { mini: 40, full: 25 }, isActive: true }); };
    const removeEmployee = (id: string) => { setEmployees(employees.filter(e => e.id !== id)); };
    const updateEmployee = (id: string, field: keyof Employee | 'productionRates.mini' | 'productionRates.full', value: any) => { setEmployees(employees.map(e => { if (e.id !== id) return e; if (field === 'productionRates.mini') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, mini: parseFloat(value) || 0 } }; } else if (field === 'productionRates.full') { const currentRates = e.productionRates || { mini: 0, full: 0 }; return { ...e, productionRates: { ...currentRates, full: parseFloat(value) || 0 } }; } else { return { ...e, [field]: value }; } })); };

    const tabs = [
        { id: 'store', label: 'Store', hint: 'Hours, closures, notice', icon: <CalendarDaysIcon className="w-4 h-4" /> },
        { id: 'menu', label: 'Menu and pricing', hint: 'Flavors, packages, salsas', icon: <ListBulletIcon className="w-4 h-4" /> },
        { id: 'kitchen', label: 'Kitchen and costs', hint: 'Ingredients, recipes, prep', icon: <ScaleIcon className="w-4 h-4" /> },
        { id: 'team', label: 'Team', hint: 'Staff, wages, rates', icon: <UsersIcon className="w-4 h-4" /> },
        { id: 'messages', label: 'Messages', hint: 'Templates, status colors', icon: <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> },
    ];

    // --- Kitchen helpers (prices use the price entered here, which is saved to history on save) ---
    const isDiscoIngredient = (i: Ingredient) => /^discos?$/i.test(i.name.trim());
    const discoIngredient = ingredients.find(isDiscoIngredient);
    const discoPrice = discoIngredient ? Number(discoIngredient.cost) || 0 : Number(discoCosts.mini) || 0;
    const salsaNameSet = new Set((pricing.salsas || []).map(s => s.name));

    const recipeUsage = (ingredientId: string) =>
        Object.entries(prepSettings.recipes || {})
            .map(([flavor, list]) => ({ flavor, ri: list.find(r => r.ingredientId === ingredientId) }))
            .filter(x => x.ri)
            .map(x => ({ flavor: x.flavor, amount: x.ri!.amountFor20Minis }));

    const sortedHistory = (ing: Ingredient) =>
        [...(ing.priceHistory || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

    // Change from the previous recorded price to the current one, as a fraction
    const priceChange = (ing: Ingredient): number | null => {
        const hist = sortedHistory(ing);
        const cost = Number(ing.cost) || 0;
        const prev = hist.length > 0 && Math.abs(hist[0].price - cost) > 1e-9 ? hist[0].price : hist[1]?.price;
        if (!prev || prev <= 0) return null;
        return (cost - prev) / prev;
    };

    const formatShortDate = (dateStr: string) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const formatPrice = (n: number) => (n < 1 ? n.toFixed(3) : n.toFixed(2));

    // Cost of a recipe: per 20 minis for empanadas (fillings + discos), per container for salsas
    const recipeCost = (name: string) => {
        const list = (prepSettings.recipes || {})[name] || [];
        const fillings = list.reduce((sum, ri) => {
            const ing = ingredients.find(i => i.id === ri.ingredientId);
            if (!ing || isDiscoIngredient(ing)) return sum;
            return sum + (ri.amountFor20Minis || 0) * (Number(ing.cost) || 0);
        }, 0);
        const hasFillings = list.some(ri => { const ing = ingredients.find(i => i.id === ri.ingredientId); return ing && !isDiscoIngredient(ing); });
        if (salsaNameSet.has(name)) return { hasRecipe: hasFillings, total: fillings, perUnit: fillings, discos: 0 };
        const discos = 20 * (Number(prepSettings.discosPer?.mini) || 0) * discoPrice;
        const total = fillings + discos;
        return { hasRecipe: hasFillings, total, perUnit: total / 20, discos };
    };

    const sellPrice = (name: string): number => {
        const salsa = (pricing.salsas || []).find(s => s.name === name);
        if (salsa) return salsa.price || 0;
        const flavor = empanadaFlavors.find(f => f.name === name);
        return (pricing.mini?.basePrice || 0) + (flavor?.surcharge || 0);
    };

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
                            <button key={tab.id} className={`flex items-center gap-3 px-4 py-3 md:py-4 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal text-left border-b-2 md:border-b-0 md:border-l-4 border-transparent ${section === tab.id ? 'border-brand-orange text-brand-orange bg-white md:bg-brand-orange/5' : 'text-gray-600 hover:text-brand-brown hover:bg-gray-100'}`} onClick={() => setSection(tab.id as any)}>
                                {tab.icon}
                                <span>
                                    {tab.label}
                                    <span className="hidden md:block text-[11px] font-normal text-gray-400">{tab.hint}</span>
                                </span>
                            </button>
                        ))}
                    </nav>

                    <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-white space-y-8">

                        {/* 1. General Tab */}
                        {section === 'store' && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <h3 className="font-bold text-brand-brown mb-4">Message of the Day</h3>
                                    <p className="text-sm text-gray-500 mb-2">This message scrolls at the top of the customer order page.</p>
                                    <input type="text" value={motd} onChange={(e) => setMotd(e.target.value)} className="w-full rounded-md border-gray-300" placeholder="e.g. Sold out of Beef for today!" />
                                </div>
                            </div>
                        )}

                        {/* 2. Appearance Tab */}
                        {section === 'messages' && (
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
                                                        onChange={(e) => setStatusColors({ ...statusColors, [status]: e.target.value })}
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
                        {section === 'messages' && (
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
                                            onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
                                            rows={4}
                                            className="w-full rounded-md border-gray-300 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Menu and pricing: sub-tabs */}
                        {section === 'menu' && (
                            <div className="max-w-5xl mx-auto flex gap-6 border-b border-gray-200 text-sm">
                                {([
                                    ['flavors', `Flavors (${empanadaFlavors.length})`],
                                    ['packages', `Packages (${(pricing.packages || []).length})`],
                                    ['salsas', `Salsas and extras (${(pricing.salsas || []).length})`],
                                    ['competitors', `Competitors (${competitorPrices.length})`],
                                ] as const).map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() => setMenuTab(id)}
                                        className={`pb-2 -mb-px border-b-2 transition-colors ${menuTab === id ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent text-gray-500 hover:text-brand-brown'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Menu: Flavors */}
                        {section === 'menu' && menuTab === 'flavors' && (() => {
                            const miniBase = Number(pricing.mini?.basePrice) || 0;
                            const fullBase = Number(pricing.full?.basePrice) || 0;
                            const rows = empanadaFlavors
                                .map((flavor, index) => ({ flavor, index }))
                                .filter(({ flavor }) =>
                                    flavorFilter === 'all' ? true :
                                    flavorFilter === 'menu' ? flavor.visible :
                                    flavorFilter === 'hidden' ? !flavor.visible :
                                    !!flavor.isSpecial);
                            const counts = {
                                all: empanadaFlavors.length,
                                menu: empanadaFlavors.filter(f => f.visible).length,
                                hidden: empanadaFlavors.filter(f => !f.visible).length,
                                specials: empanadaFlavors.filter(f => f.isSpecial).length,
                            };
                            return (
                                <div className="max-w-5xl mx-auto space-y-4">
                                    {/* Base prices */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3">
                                            <span><span className="block text-sm font-medium text-gray-800">Mini price</span><span className="block text-xs text-gray-500">Before flavor surcharges</span></span>
                                            <span className="relative w-28"><span className="absolute left-2.5 top-1.5 text-gray-500 text-sm">$</span>
                                                <input type="number" step="0.01" value={pricing.mini.basePrice} onChange={(e) => setPricing({ ...pricing, mini: { ...pricing.mini, basePrice: parseFloat(e.target.value) } })} className="w-full pl-6 rounded-md border-gray-300 text-sm text-right" />
                                            </span>
                                        </label>
                                        <label className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3">
                                            <span><span className="block text-sm font-medium text-gray-800">Full size price</span><span className="block text-xs text-gray-500">Before flavor surcharges</span></span>
                                            <span className="relative w-28"><span className="absolute left-2.5 top-1.5 text-gray-500 text-sm">$</span>
                                                <input type="number" step="0.01" value={pricing.full.basePrice} onChange={(e) => setPricing({ ...pricing, full: { ...pricing.full, basePrice: parseFloat(e.target.value) } })} className="w-full pl-6 rounded-md border-gray-300 text-sm text-right" />
                                            </span>
                                        </label>
                                    </div>

                                    {/* Filters and add */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {([['all', 'All'], ['menu', 'On menu'], ['hidden', 'Hidden'], ['specials', 'Specials']] as const).map(([id, label]) => (
                                                <button key={id} onClick={() => setFlavorFilter(id)} className={`px-3 py-1 rounded-full text-xs border ${flavorFilter === id ? 'bg-brand-brown text-white border-brand-brown' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                                                    {label} <span className={flavorFilter === id ? 'text-white/70' : 'text-gray-400'}>{counts[id]}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={newFlavorName} onChange={(e) => setNewFlavorName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addFlavor(); }} placeholder="New flavor name" className="rounded-md border-gray-300 text-sm w-48" />
                                            <button onClick={addFlavor} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-opacity-90"><PlusIcon className="w-4 h-4" /> Add flavor</button>
                                        </div>
                                    </div>

                                    {/* Flavor list */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="grid grid-cols-[minmax(0,1.8fr)_90px_110px_110px_24px] gap-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                                            <span>Flavor</span><span className="text-center">On menu</span><span className="text-right">Mini</span><span className="text-right">Full size</span><span></span>
                                        </div>
                                        {rows.map(({ flavor, index }) => {
                                            const isOpen = expandedFlavorIndex === index;
                                            const miniSur = Number(flavor.surcharge) || 0;
                                            const fullSur = Number(flavor.fullSurcharge) || 0;
                                            const priceCell = (base: number, sur: number, min?: number) => (
                                                <span className="text-right">
                                                    <span className="block tabular-nums text-gray-800">${(base + sur).toFixed(2)}</span>
                                                    <span className="block text-[11px] text-gray-400">
                                                        {[sur ? `+$${sur.toFixed(2)}` : '', min ? `min ${min}` : ''].filter(Boolean).join(' · ') || ' '}
                                                    </span>
                                                </span>
                                            );
                                            return (
                                                <div key={index} className={`border-t border-gray-100 ${!flavor.visible ? 'bg-gray-50/60' : ''}`}>
                                                    <div className={`grid grid-cols-[minmax(0,1.8fr)_90px_110px_110px_24px] gap-3 px-4 py-2.5 items-center text-sm ${isOpen ? 'bg-orange-50' : ''}`}>
                                                        <button onClick={() => setExpandedFlavorIndex(isOpen ? null : index)} className="text-left min-w-0">
                                                            <span className={`flex items-center gap-2 ${flavor.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                <span className={`truncate ${isOpen ? 'font-semibold text-orange-900' : ''}`}>{flavor.name}</span>
                                                                {flavor.isSpecial && <span className="flex-none px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-medium">Special</span>}
                                                            </span>
                                                            {flavor.description && <span className="block text-xs text-gray-400 truncate">{flavor.description}</span>}
                                                        </button>
                                                        <span className="flex justify-center"><Toggle on={!!flavor.visible} onChange={() => toggleFlavorVisibility(index)} label={`Show ${flavor.name} on the menu`} /></span>
                                                        {priceCell(miniBase, miniSur, flavor.minimumQuantity)}
                                                        {priceCell(fullBase, fullSur, flavor.fullMinimumQuantity)}
                                                        <button onClick={() => setExpandedFlavorIndex(isOpen ? null : index)} aria-label="Edit flavor"><ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
                                                    </div>
                                                    {isOpen && (
                                                        <div className="px-4 pb-4 pt-3 bg-orange-50/40 border-t border-orange-100 space-y-3 text-sm">
                                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                                                                <label className="text-xs text-gray-500">Name
                                                                    <input type="text" value={flavor.name} onChange={(e) => updateFlavorName(index, e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1" />
                                                                </label>
                                                                <label className="text-xs text-gray-500">Description shown to customers
                                                                    <input type="text" value={flavor.description || ''} onChange={(e) => updateFlavorDescription(index, e.target.value)} placeholder="Seasoned ground beef, onions and peppers" className="mt-1 w-full rounded border-gray-300 text-sm py-1" />
                                                                </label>
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                <label className="text-xs text-gray-500">Mini surcharge ($)
                                                                    <input type="number" step="0.01" value={flavor.surcharge || 0} onChange={(e) => updateFlavorSurcharge(index, e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1 text-right" />
                                                                </label>
                                                                <label className="text-xs text-gray-500">Mini minimum per order
                                                                    <input type="number" min="0" value={flavor.minimumQuantity || 0} onChange={(e) => updateFlavorMinQty(index, e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1 text-right" />
                                                                </label>
                                                                <label className="text-xs text-gray-500">Full size surcharge ($)
                                                                    <input type="number" step="0.01" value={flavor.fullSurcharge || 0} onChange={(e) => updateFlavorFullSurcharge(index, e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1 text-right" />
                                                                </label>
                                                                <label className="text-xs text-gray-500">Full size minimum per order
                                                                    <input type="number" min="0" value={flavor.fullMinimumQuantity || 0} onChange={(e) => updateFlavorFullMinQty(index, e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1 text-right" />
                                                                </label>
                                                            </div>
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                                    <Toggle on={!!flavor.isSpecial} onChange={() => toggleFlavorSpecial(index)} label="Special or seasonal" />
                                                                    Special or seasonal <span className="text-xs text-gray-500">(shown in the Specials section)</span>
                                                                </label>
                                                                <div className="flex items-center gap-4">
                                                                    <button onClick={() => { setSelectedRecipe(flavor.name); setSection('kitchen'); setKitchenTab('recipes'); }} className="text-xs text-brand-orange hover:underline">Edit recipe</button>
                                                                    <button onClick={() => { if (window.confirm(`Delete "${flavor.name}" from the menu? To take it off the menu but keep it, turn off "On menu" instead.`)) { removeFlavor(index); setExpandedFlavorIndex(null); } }} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5" /> Delete flavor</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {rows.length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center border-t border-gray-100">No flavors in this view.</p>}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Menu: Packages */}
                        {section === 'menu' && menuTab === 'packages' && (() => {
                            const resetPackageForm = () => { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, isPartyPlatter: false, name: '', description: '' }); setShowPackageForm(false); };
                            const groups: { title: string; items: MenuPackage[] }[] = [
                                { title: 'Mini packages', items: (pricing.packages || []).filter(p => p.itemType === 'mini' && !p.isPartyPlatter && !p.isSpecial) },
                                { title: 'Full size packages', items: (pricing.packages || []).filter(p => p.itemType === 'full' && !p.isPartyPlatter && !p.isSpecial) },
                                { title: 'Party platters', items: (pricing.packages || []).filter(p => p.isPartyPlatter) },
                                { title: 'Specials', items: (pricing.packages || []).filter(p => p.isSpecial && !p.isPartyPlatter) },
                            ].filter(g => g.items.length > 0);
                            const formOpen = showPackageForm || !!editingPackageId;
                            const fieldCls = 'mt-1 w-full rounded border-gray-300 text-sm py-1';
                            return (
                                <div className="max-w-5xl mx-auto space-y-5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500">Packages customers can pick on the order page.</p>
                                        {!formOpen && <button onClick={() => setShowPackageForm(true)} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-opacity-90"><PlusIcon className="w-4 h-4" /> Add package</button>}
                                    </div>

                                    {formOpen && (
                                        <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 space-y-3">
                                            <h4 className="text-sm font-semibold text-brand-brown">{editingPackageId ? `Edit ${packageForm.name || 'package'}` : 'New package'}</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <label className="text-xs text-gray-500 col-span-2">Name
                                                    <input type="text" value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} placeholder="Package of 20" className={fieldCls} />
                                                </label>
                                                <label className="text-xs text-gray-500">Size
                                                    <select value={packageForm.itemType} onChange={(e) => setPackageForm({ ...packageForm, itemType: e.target.value as any })} className={fieldCls}>
                                                        <option value="mini">Mini</option>
                                                        <option value="full">Full size</option>
                                                    </select>
                                                </label>
                                                <label className="text-xs text-gray-500">Price ($)
                                                    <input type="number" step="0.01" value={packageForm.price} onChange={(e) => setPackageForm({ ...packageForm, price: parseFloat(e.target.value) })} className={`${fieldCls} text-right`} />
                                                </label>
                                                <label className="text-xs text-gray-500">Empanadas in package
                                                    <input type="number" value={packageForm.quantity} onChange={(e) => setPackageForm({ ...packageForm, quantity: parseInt(e.target.value) })} className={`${fieldCls} text-right`} />
                                                </label>
                                                <label className="text-xs text-gray-500">Max flavors
                                                    <input type="number" value={packageForm.maxFlavors} onChange={(e) => setPackageForm({ ...packageForm, maxFlavors: parseInt(e.target.value) })} className={`${fieldCls} text-right`} />
                                                </label>
                                                <label className="text-xs text-gray-500">Pick in steps of
                                                    <input type="number" value={packageForm.increment || ''} onChange={(e) => setPackageForm({ ...packageForm, increment: parseInt(e.target.value) })} placeholder="1" className={`${fieldCls} text-right`} />
                                                </label>
                                                <div className="flex flex-col justify-end gap-1.5 text-sm text-gray-700">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!packageForm.isPartyPlatter} onChange={(e) => setPackageForm({ ...packageForm, isPartyPlatter: e.target.checked })} className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange" /> Party platter</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!packageForm.isSpecial} onChange={(e) => setPackageForm({ ...packageForm, isSpecial: e.target.checked })} className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange" /> Special</label>
                                                </div>
                                                {packageForm.isPartyPlatter && (
                                                    <label className="text-xs text-gray-500 col-span-2">1oz salsa cups (of each salsa)
                                                        <input type="number" min="0" value={packageForm.salsaCups ?? ''} onChange={(e) => setPackageForm({ ...packageForm, salsaCups: e.target.value === '' ? undefined : parseInt(e.target.value) })} placeholder={String(platterSalsaCups(undefined, Number(packageForm.quantity) || 0))} className={`${fieldCls} text-right`} />
                                                        <span className="block mt-0.5 text-[11px] text-gray-400">Counted on the prep list. Leave blank for the default (50 minis = 8, 25 minis = 4).</span>
                                                    </label>
                                                )}
                                            </div>
                                            <label className="block text-xs text-gray-500">Description (optional)
                                                <input type="text" value={packageForm.description} onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} className={fieldCls} />
                                            </label>
                                            <div className="flex justify-end gap-3">
                                                <button onClick={resetPackageForm} className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
                                                <button onClick={() => { handleAddOrUpdatePackage(); setShowPackageForm(false); }} className="bg-brand-orange text-white px-4 py-1.5 rounded-md text-sm font-medium">{editingPackageId ? 'Update package' : 'Add package'}</button>
                                            </div>
                                        </div>
                                    )}

                                    {groups.map(group => (
                                        <div key={group.title}>
                                            <h4 className="text-xs font-semibold text-gray-500 mb-2">{group.title}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {group.items.map(pkg => (
                                                    <div key={pkg.id} className={`rounded-xl border p-3 ${pkg.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'} ${editingPackageId === pkg.id ? 'ring-2 ring-orange-300' : ''}`}>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-medium truncate ${pkg.visible ? 'text-gray-900' : 'text-gray-400'}`}>{pkg.name}</p>
                                                                <p className={`text-xl font-semibold ${pkg.visible ? 'text-brand-brown' : 'text-gray-400'}`}>${Number(pkg.price).toFixed(2)}</p>
                                                            </div>
                                                            <Toggle on={!!pkg.visible} onChange={() => togglePackageVisibility(pkg.id)} label={`Show ${pkg.name} on the menu`} />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {pkg.quantity} {pkg.itemType === 'full' ? 'full size' : 'mini'} · ${pkg.quantity ? (pkg.price / pkg.quantity).toFixed(2) : '0.00'} each
                                                        </p>
                                                        <p className="text-xs text-gray-400">Up to {pkg.maxFlavors} flavors · steps of {pkg.increment || 1}</p>
                                                        {pkg.isPartyPlatter && <p className="text-xs text-gray-500">{platterSalsaCups(pkg, pkg.quantity)} × 1oz cup of each salsa</p>}
                                                        {pkg.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>}
                                                        <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-gray-100">
                                                            <button onClick={() => { handleEditPackageClick(pkg); setShowPackageForm(true); }} className="text-xs text-gray-500 hover:text-brand-orange flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" /> Edit</button>
                                                            <button onClick={() => { if (window.confirm(`Delete "${pkg.name}"?`)) removePackage(pkg.id); }} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5" /> Delete</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No packages yet.</p>}
                                </div>
                            );
                        })()}

                        {/* Menu: Salsas and extras */}
                        {section === 'menu' && menuTab === 'salsas' && (
                            <div className="max-w-3xl mx-auto space-y-4">
                                <div className="flex flex-wrap gap-2 justify-end">
                                    <input type="text" placeholder="Salsa Verde (8oz)" value={newSalsaName} onChange={(e) => setNewSalsaName(e.target.value)} className="flex-grow min-w-[180px] rounded-md border-gray-300 text-sm" />
                                    <span className="relative w-28"><span className="absolute left-2.5 top-2 text-gray-500 text-sm">$</span>
                                        <input type="number" step="0.01" placeholder="0.00" value={newSalsaPrice} onChange={(e) => setNewSalsaPrice(e.target.value)} className="w-full pl-6 rounded-md border-gray-300 text-sm text-right" />
                                    </span>
                                    <button onClick={addSalsa} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add</button>
                                </div>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="grid grid-cols-[minmax(0,1fr)_120px_90px_90px_24px] gap-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                                        <span>Item</span><span className="text-right">Price</span><span className="text-right">Cost</span><span className="text-center">On menu</span><span></span>
                                    </div>
                                    {(pricing.salsas || []).map(salsa => {
                                        const cost = recipeCost(salsa.name);
                                        return (
                                            <div key={salsa.id} className="grid grid-cols-[minmax(0,1fr)_120px_90px_90px_24px] gap-3 px-4 py-2.5 items-center border-t border-gray-100 text-sm">
                                                <span className={salsa.visible ? 'text-gray-900' : 'text-gray-400'}>{salsa.name}</span>
                                                <span className="relative"><span className="absolute left-2.5 top-1.5 text-gray-500 text-sm">$</span>
                                                    <input type="number" step="0.01" value={salsa.price} onChange={(e) => updateSalsaPrice(salsa.id, e.target.value)} className="w-full pl-6 rounded border-gray-300 text-sm py-1 text-right" />
                                                </span>
                                                <button onClick={() => { setSelectedRecipe(salsa.name); setSection('kitchen'); setKitchenTab('recipes'); }} className="text-right text-xs text-gray-500 hover:text-brand-orange" title="Edit recipe">
                                                    {cost.hasRecipe ? `$${cost.perUnit.toFixed(2)}` : 'no recipe'}
                                                </button>
                                                <span className="flex justify-center"><Toggle on={!!salsa.visible} onChange={() => toggleSalsaVisibility(salsa.id)} label={`Show ${salsa.name} on the menu`} /></span>
                                                <button onClick={() => { if (window.confirm(`Delete "${salsa.name}"?`)) removeSalsa(salsa.id); }} className="text-gray-400 hover:text-red-600" aria-label={`Delete ${salsa.name}`}><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        );
                                    })}
                                    {(pricing.salsas || []).length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center border-t border-gray-100">No salsas or extras yet.</p>}
                                </div>
                            </div>
                        )}

                        {/* Menu: Competitors */}
                        {section === 'menu' && menuTab === 'competitors' && (() => {
                            const update = (id: string, patch: Partial<CompetitorPrice>) =>
                                setCompetitorPrices(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
                            const add = () => setCompetitorPrices(prev => [...prev, {
                                id: 'comp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                                competitor: '', location: '', size: 'full', quantity: 1, price: 0, note: '', checkedOn: toLocalDateStr(new Date())
                            }]);
                            const cell = 'w-full rounded border-gray-300 text-sm py-1';
                            const rows = [...competitorPrices].sort((a, b) => a.competitor.localeCompare(b.competitor) || a.size.localeCompare(b.size) || a.quantity - b.quantity);
                            return (
                                <div className="max-w-5xl mx-auto space-y-4">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                        <p className="text-sm text-gray-500">Competitor prices used for the market comparison in Reports. Enter the total price for the quantity (e.g. 10 for $37.49).</p>
                                        <button onClick={add} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-opacity-90"><PlusIcon className="w-4 h-4" /> Add price</button>
                                    </div>
                                    <div className="border border-gray-200 rounded-xl overflow-x-auto">
                                        <div className="min-w-[860px]">
                                            <div className="grid grid-cols-[1.3fr_1fr_90px_70px_90px_70px_1.4fr_120px_24px] gap-2 px-3 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                                                <span>Competitor</span><span>Location</span><span>Size</span><span className="text-right">Qty</span><span className="text-right">Price ($)</span><span className="text-right">Each</span><span>Note</span><span>Checked</span><span></span>
                                            </div>
                                            {rows.map(c => (
                                                <div key={c.id} className="grid grid-cols-[1.3fr_1fr_90px_70px_90px_70px_1.4fr_120px_24px] gap-2 px-3 py-1.5 border-t border-gray-100 items-center">
                                                    <input type="text" value={c.competitor} onChange={(e) => update(c.id, { competitor: e.target.value })} placeholder="Name" className={cell} />
                                                    <input type="text" value={c.location || ''} onChange={(e) => update(c.id, { location: e.target.value })} placeholder="Town" className={cell} />
                                                    <select value={c.size} onChange={(e) => update(c.id, { size: e.target.value as 'mini' | 'full' })} className={cell}>
                                                        <option value="full">Full size</option>
                                                        <option value="mini">Mini</option>
                                                    </select>
                                                    <input type="number" min="1" value={c.quantity} onChange={(e) => update(c.id, { quantity: e.target.value as any })} className={`${cell} text-right`} />
                                                    <input type="number" step="0.01" value={c.price} onChange={(e) => update(c.id, { price: e.target.value as any })} className={`${cell} text-right`} />
                                                    <span className="text-right text-sm tabular-nums text-gray-700">{Number(c.quantity) > 0 ? `$${(Number(c.price) / Number(c.quantity)).toFixed(2)}` : '–'}</span>
                                                    <input type="text" value={c.note || ''} onChange={(e) => update(c.id, { note: e.target.value })} placeholder="e.g. in-store menu" className={cell} />
                                                    <input type="date" value={c.checkedOn || ''} onChange={(e) => update(c.id, { checkedOn: e.target.value })} className={cell} />
                                                    <button onClick={() => setCompetitorPrices(prev => prev.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-600" aria-label="Remove price"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            {rows.length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center border-t border-gray-100">No competitor prices yet.</p>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">Tip: delivery app prices usually run 15–30% above in-store prices, so note where each price came from. Update "Checked" when you re-check a price.</p>
                                </div>
                            );
                        })()}

                        {/* Kitchen and costs: sub-tabs */}
                        {section === 'kitchen' && (
                            <div className="max-w-5xl mx-auto flex gap-6 border-b border-gray-200 text-sm">
                                {([
                                    ['ingredients', 'Ingredients'],
                                    ['recipes', 'Recipes'],
                                    ['prep', 'Prep settings'],
                                    ['expenses', 'Expense categories'],
                                ] as const).map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() => setKitchenTab(id)}
                                        className={`pb-2 -mb-px border-b-2 transition-colors ${kitchenTab === id ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent text-gray-500 hover:text-brand-brown'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Kitchen: Ingredients */}
                        {section === 'kitchen' && kitchenTab === 'ingredients' && (() => {
                            const query = ingredientSearch.trim().toLowerCase();
                            const rows = ingredients
                                .map(ing => ({ ing, usage: recipeUsage(ing.id) }))
                                .filter(({ ing }) => !query || ing.name.toLowerCase().includes(query))
                                .sort((a, b) => b.usage.length - a.usage.length || a.ing.name.localeCompare(b.ing.name));
                            return (
                                <div className="max-w-5xl mx-auto space-y-4">
                                    {/* Add ingredient */}
                                    <div className="flex flex-wrap gap-2 items-end">
                                        <input type="text" value={ingredientSearch} onChange={(e) => setIngredientSearch(e.target.value)} placeholder="Search ingredients" className="flex-grow min-w-[180px] rounded-md border-gray-300 text-sm" />
                                        <div className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-md p-1.5">
                                            <input type="text" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} placeholder="New ingredient" className="w-40 rounded border-gray-300 text-sm py-1" />
                                            <span className="text-sm text-gray-500">$</span>
                                            <input type="number" step="0.01" value={newIngredient.cost || ''} onChange={(e) => setNewIngredient({ ...newIngredient, cost: parseFloat(e.target.value) })} placeholder="0.00" className="w-20 rounded border-gray-300 text-sm py-1 text-right" />
                                            <span className="text-sm text-gray-500">per</span>
                                            <input type="text" value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })} placeholder="lb" className="w-20 rounded border-gray-300 text-sm py-1" />
                                            <button onClick={addIngredient} className="bg-brand-orange text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add</button>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="grid grid-cols-[minmax(0,1.6fr)_120px_110px_70px_70px_24px] gap-2 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                                            <span>Ingredient</span><span className="text-right">Price</span><span className="text-right">Last bought</span><span className="text-right">Change</span><span className="text-right">Used in</span><span></span>
                                        </div>
                                        {rows.map(({ ing, usage }) => {
                                            const hist = sortedHistory(ing);
                                            const change = priceChange(ing);
                                            const isOpen = expandedIngredientId === ing.id;
                                            return (
                                                <div key={ing.id} className="border-t border-gray-100">
                                                    <button
                                                        onClick={() => setExpandedIngredientId(isOpen ? null : ing.id)}
                                                        className={`w-full grid grid-cols-[minmax(0,1.6fr)_120px_110px_70px_70px_24px] gap-2 px-4 py-2.5 text-sm text-left items-center ${isOpen ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <span className={`truncate ${isOpen ? 'font-semibold text-orange-900' : 'text-gray-900'}`}>{ing.name}</span>
                                                        <span className="text-right tabular-nums">${formatPrice(Number(ing.cost) || 0)} <span className="text-gray-500">/ {ing.unit}</span></span>
                                                        <span className={`text-right ${hist[0] ? 'text-gray-700' : 'text-gray-400'}`}>{hist[0] ? formatShortDate(hist[0].date) : 'never'}</span>
                                                        <span className={`text-right text-xs ${change === null ? 'text-gray-300' : change > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                                            {change === null ? '–' : `${change > 0 ? '+' : '−'}${Math.round(Math.abs(change) * 100)}%`}
                                                        </span>
                                                        <span className="text-right">
                                                            {usage.length > 0 ? usage.length : <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">unused</span>}
                                                        </span>
                                                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {isOpen && (
                                                        <div className="px-4 pb-4 pt-3 bg-orange-50/40 border-t border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-[1fr_110px_90px] gap-2 items-end">
                                                                    <label className="text-xs text-gray-500">Name
                                                                        <input type="text" value={ing.name} onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1" />
                                                                    </label>
                                                                    <label className="text-xs text-gray-500">Price ($)
                                                                        <input type="number" step="0.01" value={ing.cost} onChange={(e) => updateIngredient(ing.id, 'cost', e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1 text-right" />
                                                                    </label>
                                                                    <label className="text-xs text-gray-500">Per (unit)
                                                                        <input type="text" value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1" />
                                                                    </label>
                                                                </div>
                                                                <p className="text-xs text-gray-500">A new price is saved with today's date when you save settings. Past orders keep the price they had. Prices from expenses you log are added here automatically.</p>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1">Used in</p>
                                                                    {usage.length === 0 ? (
                                                                        <p className="text-xs text-gray-400">Not used in any recipe yet. Add it from the Recipes tab.</p>
                                                                    ) : (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {usage.map(u => (
                                                                                <button key={u.flavor} onClick={() => { setSelectedRecipe(u.flavor); setKitchenTab('recipes'); }} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 hover:border-brand-orange">
                                                                                    {u.flavor} · {u.amount} {ing.unit}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button onClick={() => removeIngredient(ing.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5" /> Delete ingredient</button>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Price history</p>
                                                                {hist.length === 0 ? (
                                                                    <p className="text-xs text-gray-400">No purchases recorded yet.</p>
                                                                ) : (
                                                                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-md bg-white divide-y divide-gray-100">
                                                                        {hist.map((h, idx) => (
                                                                            <div key={`${h.date}-${idx}`} className="flex justify-between px-3 py-1.5 text-xs">
                                                                                <span className="text-gray-600">{formatShortDate(h.date)}</span>
                                                                                <span className="tabular-nums text-gray-800">${formatPrice(h.price)} / {ing.unit}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {rows.length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center border-t border-gray-100">No ingredients match "{ingredientSearch}".</p>}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Kitchen: Recipes */}
                        {section === 'kitchen' && kitchenTab === 'recipes' && (() => {
                            const items = [
                                ...empanadaFlavors.filter(f => !menuFlavorsOnly || f.visible !== false).map(f => ({ name: f.name, isSalsa: false })),
                                ...(pricing.salsas || []).filter(s => !menuFlavorsOnly || s.visible !== false).map(s => ({ name: s.name, isSalsa: true })),
                            ].map(item => ({ ...item, cost: recipeCost(item.name), price: sellPrice(item.name) }))
                             .sort((a, b) => Number(a.isSalsa) - Number(b.isSalsa) || Number(b.cost.hasRecipe) - Number(a.cost.hasRecipe) || b.cost.perUnit - a.cost.perUnit);

                            const selected = selectedRecipe ? items.find(i => i.name === selectedRecipe) || { name: selectedRecipe, isSalsa: salsaNameSet.has(selectedRecipe), cost: recipeCost(selectedRecipe), price: sellPrice(selectedRecipe) } : null;
                            const selectedList = selected ? ((prepSettings.recipes || {})[selected.name] || []).filter(ri => { const ing = ingredients.find(i => i.id === ri.ingredientId); return !ing || !isDiscoIngredient(ing); }) : [];
                            const fullMultiplier = Number(prepSettings.fullSizeMultiplier) || 2;

                            return (
                                <div className="max-w-5xl mx-auto space-y-4">
                                    <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
                                        <span className="text-gray-500">Cost per mini (or per salsa) using current prices. Mini price ${(pricing.mini?.basePrice || 0).toFixed(2)} plus any flavor surcharge.</span>
                                        <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                            <input type="checkbox" checked={menuFlavorsOnly} onChange={(e) => setMenuFlavorsOnly(e.target.checked)} className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                                            Only items on the menu
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {items.map(item => {
                                            const isSel = selected?.name === item.name;
                                            const margin = item.price > 0 ? 1 - item.cost.perUnit / item.price : null;
                                            if (!item.cost.hasRecipe) {
                                                return (
                                                    <button key={item.name} onClick={() => setSelectedRecipe(item.name)} className={`text-left rounded-xl p-3 border ${isSel ? 'border-2 border-amber-400' : 'border-amber-200'} bg-amber-50`}>
                                                        <p className="text-sm text-amber-900 truncate">{item.name}</p>
                                                        <p className="text-lg font-semibold text-amber-900">No recipe</p>
                                                        <p className="text-xs text-amber-700">Add ingredients</p>
                                                    </button>
                                                );
                                            }
                                            return (
                                                <button key={item.name} onClick={() => setSelectedRecipe(item.name)} className={`text-left rounded-xl p-3 bg-white border ${isSel ? 'border-2 border-orange-400' : 'border-gray-200 hover:border-gray-300'}`}>
                                                    <p className="text-sm text-gray-800 truncate">{item.name}</p>
                                                    <p className="text-lg font-semibold text-brand-brown">${item.cost.perUnit.toFixed(2)}{item.isSalsa && <span className="text-xs font-normal text-gray-500"> / salsa</span>}</p>
                                                    <p className="text-xs text-gray-500">{margin !== null ? `${Math.round(margin * 100)}% margin` : 'no price set'}</p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selected ? (
                                        <div className="border border-gray-200 rounded-xl p-4 bg-white">
                                            <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
                                                <h4 className="font-semibold text-brand-brown text-base">{selected.name}</h4>
                                                <span className="text-xs text-gray-500">
                                                    {selected.isSalsa ? <>Amounts for <b className="text-gray-800">1 salsa</b></> : <>Amounts for <b className="text-gray-800">20 minis</b> · full size uses {fullMultiplier}×</>}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-[minmax(0,1.4fr)_150px_80px_28px] gap-2 text-xs text-gray-500 pb-1">
                                                <span>Ingredient</span><span className="text-right">Amount</span><span className="text-right">Cost</span><span></span>
                                            </div>
                                            {selectedList.map(ri => {
                                                const ing = ingredients.find(i => i.id === ri.ingredientId);
                                                const lineCost = (ri.amountFor20Minis || 0) * (Number(ing?.cost) || 0);
                                                return (
                                                    <div key={ri.ingredientId} className="grid grid-cols-[minmax(0,1.4fr)_150px_80px_28px] gap-2 items-center py-1.5 border-t border-gray-100 text-sm">
                                                        <span className={ing ? 'text-gray-800' : 'text-red-600'}>{ing ? ing.name : 'Deleted ingredient (remove and re-add)'}</span>
                                                        <span className="flex items-center justify-end gap-1.5">
                                                            <input
                                                                type="number" step="0.01"
                                                                value={ri.amountFor20Minis === 0 ? '' : ri.amountFor20Minis}
                                                                placeholder="0"
                                                                onChange={(e) => updateRecipeIngredientAmount(selected.name, ri.ingredientId, parseFloat(e.target.value) || 0)}
                                                                className="w-20 h-8 text-sm border-gray-300 rounded text-right focus:ring-brand-orange focus:border-brand-orange px-2"
                                                            />
                                                            <span className="text-xs text-gray-500 w-12 truncate" title={ing?.unit}>{ing?.unit}</span>
                                                        </span>
                                                        <span className="text-right text-gray-600 tabular-nums">${lineCost.toFixed(2)}</span>
                                                        <button onClick={() => removeIngredientFromRecipe(selected.name, ri.ingredientId)} className="text-gray-400 hover:text-red-600 flex justify-end" aria-label="Remove ingredient"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                );
                                            })}
                                            {!selected.isSalsa && (
                                                <div className="grid grid-cols-[minmax(0,1.4fr)_150px_80px_28px] gap-2 items-center py-1.5 border-t border-gray-100 text-sm text-gray-500">
                                                    <span>Discos <span className="text-xs">· automatic from Prep settings</span></span>
                                                    <span className="text-right">{formatQtyPlain(20 * (Number(prepSettings.discosPer?.mini) || 0))} each</span>
                                                    <span className="text-right tabular-nums">${selected.cost.discos.toFixed(2)}</span>
                                                    <span></span>
                                                </div>
                                            )}
                                            <div className="py-2 border-t border-gray-100">
                                                <select
                                                    onChange={(e) => { addIngredientToRecipe(selected.name, e.target.value); e.target.value = ''; }}
                                                    className="w-full md:w-1/2 text-sm border-gray-300 rounded focus:ring-brand-orange focus:border-brand-orange"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Add ingredient…</option>
                                                    {ingredients
                                                        .filter(i => !isDiscoIngredient(i) && !selectedList.some(r => r.ingredientId === i.id))
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-2 text-sm font-semibold text-gray-800">
                                                <span>{selected.isSalsa ? 'Total per salsa' : 'Total for 20'}</span>
                                                <span>
                                                    ${selected.cost.total.toFixed(2)}
                                                    {!selected.isSalsa && (
                                                        <span className="font-normal text-gray-500"> · ${selected.cost.perUnit.toFixed(2)} per mini · ${(selected.cost.perUnit * fullMultiplier).toFixed(2)} per full</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-4">Pick a flavor above to see or edit its recipe.</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Kitchen: Prep settings */}
                        {section === 'kitchen' && kitchenTab === 'prep' && (() => {
                            const setPrep = (path: 'discosPer' | 'discoPackSize' | 'productionRates', key: 'mini' | 'full', value: string) =>
                                setPrepSettings({ ...prepSettings, [path]: { ...(prepSettings[path] || { mini: 0, full: 0 }), [key]: value as any } });
                            const field = (label: string, hint: string, input: React.ReactNode) => (
                                <label className="block">
                                    <span className="block text-sm font-medium text-gray-800">{label}</span>
                                    <span className="block text-xs text-gray-500 mb-1">{hint}</span>
                                    {input}
                                </label>
                            );
                            const numInput = (value: any, onChange: (v: string) => void, step = '1') => (
                                <input type="number" step={step} min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
                            );
                            return (
                                <div className="max-w-3xl mx-auto space-y-6">
                                    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-semibold text-brand-brown">Discos</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {field('Discos per mini', '0.5 means one disco makes two minis', numInput(prepSettings.discosPer?.mini, v => setPrep('discosPer', 'mini', v), '0.1'))}
                                            {field('Discos per full size', 'Usually 1', numInput(prepSettings.discosPer?.full, v => setPrep('discosPer', 'full', v), '0.1'))}
                                            {field('Mini disco pack size', 'Discos in one pack you buy', numInput(prepSettings.discoPackSize?.mini, v => setPrep('discoPackSize', 'mini', v)))}
                                            {field('Full disco pack size', 'Discos in one pack you buy', numInput(prepSettings.discoPackSize?.full, v => setPrep('discoPackSize', 'full', v)))}
                                        </div>
                                        {discoIngredient ? (
                                            <p className="text-xs text-gray-500">Disco price comes from the <b>{discoIngredient.name}</b> ingredient: ${formatPrice(Number(discoIngredient.cost) || 0)} each. Update it on the Ingredients tab.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {field('Mini disco cost', 'Add a "Discos" ingredient to track this from purchases instead', numInput(discoCosts.mini, v => setDiscoCosts({ ...discoCosts, mini: parseFloat(v) || 0 }), '0.01'))}
                                                {field('Full disco cost', 'Per disco', numInput(discoCosts.full, v => setDiscoCosts({ ...discoCosts, full: parseFloat(v) || 0 }), '0.01'))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-semibold text-brand-brown">Recipes</h4>
                                        {field('Full size filling multiplier', 'A full size uses this many times the filling of a mini (2 = twice as much)',
                                            numInput(prepSettings.fullSizeMultiplier, v => setPrepSettings({ ...prepSettings, fullSizeMultiplier: v as any }), '0.1'))}
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-semibold text-brand-brown">Labor</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {field('Minis per hour', 'Default production rate', numInput(prepSettings.productionRates?.mini, v => setPrep('productionRates', 'mini', v)))}
                                            {field('Full size per hour', 'Default production rate', numInput(prepSettings.productionRates?.full, v => setPrep('productionRates', 'full', v)))}
                                            {field('Hourly wage ($)', 'Used for labor cost estimates', numInput(laborWage, v => setLaborWage(parseFloat(v) || 0), '0.25'))}
                                        </div>
                                        <p className="text-xs text-gray-500">These drive the labor hours and cost on the prep list and in Reports. Individual staff wages and rates are on the Team page.</p>
                                        <div className="max-w-xs">
                                            {field('Shift tracking started', 'The date everyone began logging all their shifts. Actual labor in Reports only counts from here.',
                                                <input type="date" value={prepSettings.laborTrackingStart || DEFAULT_LABOR_TRACKING_START} onChange={(e) => setPrepSettings({ ...prepSettings, laborTrackingStart: e.target.value })} className="w-full rounded-md border-gray-300 text-sm" />)}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-semibold text-brand-brown">Margins</h4>
                                        <div className="max-w-xs">
                                            {field('Target margin (%)', 'Flavors below this are flagged in Reports → Flavor Costs & Margins',
                                                numInput(prepSettings.targetMargin ?? 50, v => setPrepSettings({ ...prepSettings, targetMargin: v as any })))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Team */}
                        {section === 'team' && (() => {
                            const active = employees.filter(e => e.isActive !== false);
                            const inactive = employees.filter(e => e.isActive === false);
                            const initials = (name: string) => name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';
                            const fieldCls = 'mt-1 w-full rounded border-gray-300 text-sm py-1 text-right';
                            const card = (emp: Employee) => (
                                <div key={emp.id} className={`border rounded-xl p-4 ${emp.isActive === false ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-none ${emp.isActive === false ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-800'}`}>{initials(emp.name)}</div>
                                        <input type="text" value={emp.name} onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)} className="flex-grow min-w-0 font-semibold text-brand-brown border-none p-0 focus:ring-0 text-sm bg-transparent" />
                                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                            {emp.isActive === false ? 'Inactive' : 'Active'}
                                            <Toggle on={emp.isActive !== false} onChange={() => updateEmployee(emp.id, 'isActive', emp.isActive === false)} label={`${emp.name} is active`} />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mt-3">
                                        <label className="text-xs text-gray-500">Wage ($/hr)
                                            <input type="number" step="0.25" value={emp.hourlyWage} onChange={(e) => updateEmployee(emp.id, 'hourlyWage', e.target.value)} className={fieldCls} />
                                        </label>
                                        <label className="text-xs text-gray-500">Minis per hour
                                            <input type="number" value={emp.productionRates?.mini ?? ''} onChange={(e) => updateEmployee(emp.id, 'productionRates.mini', e.target.value)} className={fieldCls} />
                                        </label>
                                        <label className="text-xs text-gray-500">Full size per hour
                                            <input type="number" value={emp.productionRates?.full ?? ''} onChange={(e) => updateEmployee(emp.id, 'productionRates.full', e.target.value)} className={fieldCls} />
                                        </label>
                                    </div>
                                    <label className="text-xs text-gray-500 block mt-3">Usual work type
                                        <select value={employeeDefaultWorkType(emp)} onChange={(e) => updateEmployee(emp.id, 'defaultWorkType', e.target.value)} className="mt-1 w-full rounded border-gray-300 text-sm py-1">
                                            {WORK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                        <span className="block mt-0.5 text-[11px] text-gray-400">Pre-selected when logging their shifts, and used for shifts logged before work types existed.</span>
                                    </label>
                                    <div className="flex justify-end mt-2">
                                        <button onClick={() => { if (window.confirm(`Remove ${emp.name}? Their past shifts stay in your records. To keep them on file, set them to Inactive instead.`)) removeEmployee(emp.id); }} className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5" /> Remove</button>
                                    </div>
                                </div>
                            );
                            return (
                                <div className="max-w-4xl mx-auto space-y-5">
                                    <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-brand-brown mb-2">Add a team member</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1.3fr_auto] gap-3 items-end">
                                            <label className="text-xs text-gray-500 col-span-2 md:col-span-1">Name
                                                <input type="text" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} placeholder="Maria Lopez" className="mt-1 w-full rounded border-gray-300 text-sm py-1" />
                                            </label>
                                            <label className="text-xs text-gray-500">Wage ($/hr)
                                                <input type="number" step="0.25" value={newEmployee.hourlyWage} onChange={(e) => setNewEmployee({ ...newEmployee, hourlyWage: parseFloat(e.target.value) })} className={fieldCls} />
                                            </label>
                                            <label className="text-xs text-gray-500">Minis per hour
                                                <input type="number" value={newEmployee.productionRates?.mini} onChange={(e) => setNewEmployee({ ...newEmployee, productionRates: { ...(newEmployee.productionRates || { mini: 0, full: 0 }), mini: parseFloat(e.target.value) } })} className={fieldCls} />
                                            </label>
                                            <label className="text-xs text-gray-500">Full size per hour
                                                <input type="number" value={newEmployee.productionRates?.full} onChange={(e) => setNewEmployee({ ...newEmployee, productionRates: { ...(newEmployee.productionRates || { mini: 0, full: 0 }), full: parseFloat(e.target.value) } })} className={fieldCls} />
                                            </label>
                                            <label className="text-xs text-gray-500">Usual work type
                                                <select value={newEmployee.defaultWorkType || 'production'} onChange={(e) => setNewEmployee({ ...newEmployee, defaultWorkType: e.target.value as WorkType })} className="mt-1 w-full rounded border-gray-300 text-sm py-1">
                                                    {WORK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                </select>
                                            </label>
                                            <button onClick={addEmployee} className="bg-brand-orange text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 justify-center"><PlusIcon className="w-4 h-4" /> Add</button>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 mb-2">Active ({active.length})</h4>
                                        {active.length > 0
                                            ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{active.map(card)}</div>
                                            : <p className="text-sm text-gray-400">No active team members.</p>}
                                    </div>
                                    {inactive.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 mb-2">Inactive ({inactive.length})</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{inactive.map(card)}</div>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500">The default wage and production rates used on the prep list are in Kitchen and costs → Prep settings.</p>
                                </div>
                            );
                        })()}

                        {/* 9. Expenses Tab */}
                        {section === 'kitchen' && kitchenTab === 'expenses' && (
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
                        {section === 'store' && (
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
                                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduling.enabled ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setScheduling({ ...scheduling, enabled: !scheduling.enabled })}>
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
                                                        <input type="time" value={scheduling.startTime} onChange={(e) => setScheduling({ ...scheduling, startTime: e.target.value })} className="w-full rounded-md border-gray-300 text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
                                                        <input type="time" value={scheduling.endTime} onChange={(e) => setScheduling({ ...scheduling, endTime: e.target.value })} className="w-full rounded-md border-gray-300 text-sm" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Interval (Minutes)</label>
                                                    <input type="number" value={scheduling.intervalMinutes} onChange={(e) => setScheduling({ ...scheduling, intervalMinutes: parseInt(e.target.value) })} className="w-full rounded-md border-gray-300 text-sm" />
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

                                            {/* Custom Messages Section */}
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h4 className="font-bold text-sm text-gray-700 mb-3">Status Messages</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Closed Message</label>
                                                        <input
                                                            type="text"
                                                            value={scheduling.statusMessages?.closed || ''}
                                                            onChange={(e) => setScheduling({ ...scheduling, statusMessages: { ...scheduling.statusMessages, closed: e.target.value, full: scheduling.statusMessages?.full || '' } })}
                                                            className="w-full rounded-md border-gray-300 text-sm"
                                                            placeholder="We are closed today."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Full (Closed) Message</label>
                                                        <input
                                                            type="text"
                                                            value={scheduling.statusMessages?.full || ''}
                                                            onChange={(e) => setScheduling({ ...scheduling, statusMessages: { ...scheduling.statusMessages, full: e.target.value, closed: scheduling.statusMessages?.closed || '' } })}
                                                            className="w-full rounded-md border-gray-300 text-sm"
                                                            placeholder="Fully booked for today."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">Full (Accepting Orders) Message</label>
                                                        <input
                                                            type="text"
                                                            value={scheduling.statusMessages?.fullAccepting || ''}
                                                            onChange={(e) => setScheduling({ ...scheduling, statusMessages: { ...scheduling.statusMessages, fullAccepting: e.target.value, full: scheduling.statusMessages?.full || '', closed: scheduling.statusMessages?.closed || '' } })}
                                                            className="w-full rounded-md border-gray-300 text-sm"
                                                            placeholder="We are nearing full capacity."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Calendar Overrides */}
                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeftIcon className="w-5 h-5" /></button>
                                                <h4 className="font-bold text-brand-brown">{calendarViewDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h4>
                                                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRightIcon className="w-5 h-5" /></button>
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
                                                    else if (override?.isFull) {
                                                        if (override.allowOrders) bgClass = "bg-yellow-100 text-yellow-800 font-bold";
                                                        else bgClass = "bg-orange-100 text-orange-700 font-bold";
                                                    }
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

                                                    {scheduling.dateOverrides?.[selectedDate]?.isFull && (
                                                        <div className="mb-2">
                                                            <label className="flex items-center text-xs text-gray-700 bg-yellow-50 p-1.5 rounded border border-yellow-200 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!scheduling.dateOverrides?.[selectedDate]?.allowOrders}
                                                                    onChange={(e) => updateDateOverride(selectedDate, 'allowOrders', e.target.checked)}
                                                                    className="mr-2 rounded text-brand-orange focus:ring-brand-orange"
                                                                />
                                                                Still accept orders?
                                                            </label>
                                                        </div>
                                                    )}

                                                    <div className="bg-blue-50 p-2 rounded">
                                                        <p className="text-xs text-blue-800 font-bold mb-1">Custom Hours</p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="time"
                                                                value={scheduling.dateOverrides?.[selectedDate]?.customHours?.start || scheduling.startTime}
                                                                onChange={(e) => updateDateOverride(selectedDate, 'custom', undefined, e.target.value, scheduling.dateOverrides?.[selectedDate]?.customHours?.end)}
                                                                className="w-full text-xs rounded border-blue-200"
                                                            />
                                                            <input
                                                                type="time"
                                                                value={scheduling.dateOverrides?.[selectedDate]?.customHours?.end || scheduling.endTime}
                                                                onChange={(e) => updateDateOverride(selectedDate, 'custom', undefined, scheduling.dateOverrides?.[selectedDate]?.customHours?.start, e.target.value)}
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