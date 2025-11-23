import React, { useState, useMemo } from 'react';
import { AppSettings, updateSettingsInDb, addEmployeeToDb, updateEmployeeInDb, deleteEmployeeFromDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing' | 'prep' | 'costs' | 'scheduling' | 'expenses' | 'employees'>('menu');
    
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>(settings.prepSettings);
    const [scheduling, setScheduling] = useState<AppSettings['scheduling']>(settings.scheduling);
    const [laborWage, setLaborWage] = useState<number>(settings.laborWage);
    const [materialCosts, setMaterialCosts] = useState<Record<string, number>>(settings.materialCosts);
    const [discoCosts, setDiscoCosts] = useState<{mini: number, full: number}>(settings.discoCosts);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(settings.expenseCategories);
    
    const employees = settings.employees || []; 
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpRate, setNewEmpRate] = useState('');
    const [newEmpMini, setNewEmpMini] = useState('');
    const [newEmpFull, setNewEmpFull] = useState('');
    const [newEmpColor, setNewEmpColor] = useState('#3b82f6');
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

    const [newFlavorName, setNewFlavorName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' });
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
    const [newSalsaName, setNewSalsaName] = useState('');
    const [newSalsaPrice, setNewSalsaPrice] = useState('');
    const [newTier, setNewTier] = useState<{type: 'mini'|'full', minQty: string, price: string}>({ type: 'mini', minQty: '', price: '' });
    const [newCategory, setNewCategory] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({ ...f, name: `Full ${f.name}` }));
        const settingsToSave: Partial<AppSettings> = {
            empanadaFlavors, fullSizeEmpanadaFlavors: syncedFullFlavors, pricing, prepSettings, scheduling, laborWage, materialCosts, discoCosts, expenseCategories
        };
        try { await updateSettingsInDb(settingsToSave); } catch (e) { console.error(e); alert("Failed to save settings."); } finally { setIsSaving(false); onClose(); }
    };

    const handleAddOrUpdateEmployee = async () => {
        if (!newEmpName.trim() || !newEmpRate) return;
        setIsSaving(true);
        try {
            const newEmp: Employee = {
                id: editingEmployeeId || Date.now().toString(),
                name: newEmpName.trim(),
                hourlyRate: parseFloat(newEmpRate) || 0,
                speedMini: parseInt(newEmpMini) || 40,
                speedFull: parseInt(newEmpFull) || 25,
                color: newEmpColor,
                isActive: true
            };

            if (editingEmployeeId) {
                await updateEmployeeInDb(newEmp);
            } else {
                await addEmployeeToDb(newEmp);
            }
            
            setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
        } catch (e) {
            console.error("Error saving employee", e);
            alert("Failed to save employee.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        if (window.confirm("Remove this employee?")) {
            await deleteEmployeeFromDb(id);
            if (editingEmployeeId === id) {
                 setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
            }
        }
    };

    const handleEditEmployee = (emp: Employee) => {
        setNewEmpName(emp.name);
        setNewEmpRate(String(emp.hourlyRate));
        setNewEmpMini(String(emp.speedMini));
        setNewEmpFull(String(emp.speedFull));
        setNewEmpColor(emp.color);
        setEditingEmployeeId(emp.id);
    };
    
    const handleCancelEditEmployee = () => {
        setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
    };

    const addFlavor = () => { if (newFlavorName.trim()) { setEmpanadaFlavors([...empanadaFlavors, { name: newFlavorName.trim(), visible: true, isSpecial: false }]); setNewFlavorName(''); } };
    const autoFillDescriptions = () => { setEmpanadaFlavors(empanadaFlavors.map(f => (!f.description ? { ...f, description: SUGGESTED_DESCRIPTIONS[f.name] || undefined } : f))); alert('Descriptions populated! Save to apply.'); };
    const toggleFlavorVisibility = (i: number) => { const u = [...empanadaFlavors]; u[i].visible = !u[i].visible; setEmpanadaFlavors(u); };
    const toggleFlavorSpecial = (i: number) => { const u = [...empanadaFlavors]; u[i].isSpecial = !u[i].isSpecial; setEmpanadaFlavors(u); };
    const updateFlavorDescription = (i: number, d: string) => { const u = [...empanadaFlavors]; u[i].description = d; setEmpanadaFlavors(u); };
    const updateFlavorSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].surcharge = parseFloat(v) || undefined; setEmpanadaFlavors(u); };
    const removeFlavor = (i: number) => { setEmpanadaFlavors(empanadaFlavors.filter((_, idx) => idx !== i)); };
    const handleAddOrUpdatePackage = () => { if (!packageForm.name || !packageForm.price || !packageForm.quantity) return; const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false }; let updated = pricing.packages || []; updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg]; setPricing({...pricing, packages: updated}); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); setEditingPackageId(null); };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 10 }); setEditingPackageId(pkg.id); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const updateLbsPer20 = (f: string, v: string) => { setPrepSettings({...prepSettings, lbsPer20: {...prepSettings.lbsPer20, [f]: parseFloat(v)||0}}); };
    const updateMaterialCost = (f: string, v: string) => { setMaterialCosts({...materialCosts, [f]: parseFloat(v)||0}); };
    const addTier = () => { const minQ = parseInt(newTier.minQty); const p = parseFloat(newTier.price); if (!minQ || isNaN(p)) return; const currentTiers = pricing[newTier.type].tiers || []; const updated = [...currentTiers.filter(t => t.minQuantity !== minQ), { minQuantity: minQ, price: p }]; updated.sort((a,b) => a.minQuantity - b.minQuantity); setPricing({ ...pricing, [newTier.type]: { ...pricing[newTier.type], tiers: updated } }); setNewTier({ ...newTier, minQty: '', price: '' }); };
    const removeTier = (type: 'mini'|'full', minQty: number) => { setPricing({ ...pricing, [type]: { ...pricing[type], tiers: (pricing[type].tiers || []).filter(t => t.minQuantity !== minQty) } }); };
    const toggleClosedDay = (dayIndex: number) => { const current = scheduling.closedDays || []; if (current.includes(dayIndex)) { setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) }); } else { setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() }); } };
    const handleDateClick = (dateStr: string) => { setSelectedDate(dateStr); };
    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'custom', start?: string, end?: string) => { const newOverrides = { ...(scheduling.dateOverrides || {}) }; if (type === 'default') { delete newOverrides[dateStr]; } else if (type === 'closed') { newOverrides[dateStr] = { isClosed: true }; } else if (type === 'custom') { newOverrides[dateStr] = { isClosed: false, customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime } }; } setScheduling({ ...scheduling, dateOverrides: newOverrides }); };
    const calendarGrid = useMemo(() => { const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfWeek = new Date(year, month, 1).getDay(); const cells = []; for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i)); return cells; }, [calendarViewDate]);
    const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };

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
                    {['menu', 'pricing', 'scheduling', 'prep', 'costs', 'expenses', 'employees'].map((tab) => (
                         <button
                            key={tab}
                            className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab === 'expenses' ? 'Exp. Categories' : tab === 'scheduling' ? 'Scheduling' : tab === 'costs' ? 'Inventory & Costs' : tab === 'prep' ? 'Prep' : tab === 'menu' ? 'Menu' : tab === 'employees' ? 'Employees' : 'Pricing'}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    {/* ... (Content for Menu, Pricing, etc.) ... */}
                    {activeTab === 'menu' && (<div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><div className="flex justify-between items-center mb-4"><div><h3 className="font-bold text-brand-brown">Empanada Flavors</h3></div><button onClick={autoFillDescriptions} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"><SparklesIcon className="w-3 h-3"/> Auto-fill</button></div><div className="flex gap-2 mb-4"><input type="text" value={newFlavorName} onChange={e => setNewFlavorName(e.target.value)} placeholder="New flavor name" className="flex-grow rounded border-gray-300 text-sm"/><button onClick={addFlavor} className="bg-brand-orange text-white px-3 rounded"><PlusIcon className="w-5 h-5"/></button></div><div className="space-y-2 max-h-96 overflow-y-auto">{empanadaFlavors.map((f, i) => <div key={i} className="bg-white p-2 rounded shadow-sm text-sm flex items-center justify-between"><span>{f.name}</span><button onClick={() => removeFlavor(i)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div>)}
                    {activeTab === 'pricing' && (<div className="space-y-8"><div><h3 className="font-bold text-brand-brown mb-4">Packages</h3><div className="space-y-3">{pricing.packages?.map(p => <div key={p.id} className="bg-white p-3 rounded border shadow-sm flex justify-between"><span>{p.name}</span><button onClick={() => removePackage(p.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div></div>)}
                    {activeTab === 'scheduling' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Scheduling</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Open</label><input type="time" value={scheduling.startTime} onChange={e => setScheduling({...scheduling, startTime: e.target.value})} className="border rounded p-1 w-full"/></div><div><label className="block text-xs">Close</label><input type="time" value={scheduling.endTime} onChange={e => setScheduling({...scheduling, endTime: e.target.value})} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'prep' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Prep Settings</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Minis/Hr</label><input type="number" value={prepSettings?.productionRates?.mini} onChange={e => setPrepSettings({...prepSettings, productionRates: {...prepSettings.productionRates, mini: parseFloat(e.target.value)}})} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'costs' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Costs</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Labor Wage</label><input type="number" value={laborWage} onChange={e => setLaborWage(parseFloat(e.target.value))} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'expenses' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Categories</h3><div className="flex gap-2 mb-4"><input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="border rounded p-1 flex-grow"/><button onClick={addCategory} className="bg-brand-orange text-white px-3 rounded"><PlusIcon className="w-4 h-4"/></button></div><div className="space-y-2">{expenseCategories.map(c => <div key={c} className="flex justify-between p-2 bg-gray-50 rounded"><span>{c}</span><button onClick={() => removeCategory(c)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div>)}
                    
                    {activeTab === 'employees' && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <h3 className="font-bold text-brand-brown text-lg mb-4">Employee Roster</h3>
                                <p className="text-sm text-gray-500 mb-4">Add employees to schedule them on the calendar and track labor costs.</p>
                                
                                <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 rounded border items-end transition-colors ${editingEmployeeId ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
                                        <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="Employee Name"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Wage ($/hr)</label>
                                        <input type="number" step="0.50" value={newEmpRate} onChange={e => setNewEmpRate(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="15.00"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Mini/Hr</label>
                                        <input type="number" value={newEmpMini} onChange={e => setNewEmpMini(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="40"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Full/Hr</label>
                                        <input type="number" value={newEmpFull} onChange={e => setNewEmpFull(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="25"/>
                                    </div>
                                    <div className="md:col-span-5 flex gap-2">
                                        {editingEmployeeId && <button onClick={handleCancelEditEmployee} className="w-full bg-gray-300 text-gray-700 font-bold py-2 rounded text-sm hover:bg-gray-400">Cancel</button>}
                                        <button onClick={handleAddOrUpdateEmployee} className={`w-full text-white font-bold py-2 rounded text-sm shadow-sm hover:bg-opacity-90 flex items-center justify-center gap-2 ${editingEmployeeId ? 'bg-amber-500' : 'bg-brand-orange'}`}>
                                            {editingEmployeeId ? <><CheckCircleIcon className="w-4 h-4"/> Update Employee</> : <><PlusIcon className="w-4 h-4"/> Add Employee</>}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {employees.map(emp => (
                                        <div key={emp.id} className={`flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm ${editingEmployeeId === emp.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {emp.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-brown text-sm">{emp.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        ${emp.hourlyRate.toFixed(2)}/hr • Speed: {emp.speedMini} (m), {emp.speedFull} (f)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditEmployee(emp)} className="text-gray-400 hover:text-brand-brown p-2 hover:bg-gray-100 rounded-full transition-colors">
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {employees.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg">
                                            No employees added yet.
                                        </div>
                                    )}
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